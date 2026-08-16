# RevenueCat re-enable (v1.1)

**Status:** Ready to apply. Hold for v1.1 — ship the first TestFlight/App Store build with IAP stubbed (current state). Apple allows adding subscriptions in a later build, and re-enabling native IAP into the very first build risks reintroducing the iOS 26 crash before it's been device-verified.

## Background

`purchases_flutter ^8.0.0` SIGKILLed on iOS 26.4 right after Supabase init (native crash, no Dart trace). It was commented out in `pubspec.yaml`, and `subscription_service.dart` + `paywall_screen.dart` were stubbed.

As of June 2026 the package is at **9.15.0** — a full major line past the 8.x that crashed, with current latest-iOS support (RevenueCat ships frequent `purchases-hybrid-common` bumps). This is the version to move to.

**The one thing I can't verify from here:** whether 9.15.0 fully clears the SIGKILL on a real iOS 26 device. That requires a build on your Mac. The device-test step below is mandatory before you submit a build with IAP enabled.

## Backend — already done, no changes needed

- `subscriptions` table + `get_my_subscription_tier()` RPC are live (source of truth for entitlement gating).
- `supabase/functions/revenuecat-webhook/index.ts` is deployed-ready and maps entitlements `first_class` / `regular` → tier.
- **Critical contract:** the webhook treats RevenueCat's `app_user_id` as the Supabase user UUID. So the app must call `Purchases.logIn(<supabase uid>)` — step 2 below. Without that, purchases won't map to the right user.

---

## Step 1 — `pubspec.yaml`

Replace the commented IAP line:

```yaml
  # IAP — temporarily disabled while we diagnose iOS 26 native crash.
  # purchases_flutter: ^8.0.0
```

with:

```yaml
  purchases_flutter: ^9.15.0
```

Then `flutter pub get` and `cd ios && pod install && cd ..`.

---

## Step 2 — `lib/main.dart` (configure + login)

After `Supabase.initialize(...)` succeeds, configure RevenueCat and keep its user id in sync with Supabase auth. Replace the existing RevenueCat placeholder block:

```dart
  // RevenueCat removed for now — see pubspec.yaml comment.
  // ignore: unused_local_variable
  final rcKey = Env.revenueCatIosKey;
```

with:

```dart
  // RevenueCat — configure after Supabase so we can bind the RC app_user_id to
  // the Supabase user id (the webhook keys on app_user_id == auth uid).
  if (bootError == null) {
    try {
      await Purchases.setLogLevel(LogLevel.info);
      final apiKey = defaultTargetPlatform == TargetPlatform.iOS
          ? Env.revenueCatIosKey
          : Env.revenueCatAndroidKey;
      if (apiKey.isNotEmpty) {
        await Purchases.configure(PurchasesConfiguration(apiKey));
        // If already signed in, identify now.
        final uid = Supabase.instance.client.auth.currentUser?.id;
        if (uid != null) await Purchases.logIn(uid);
        // Keep RC identity in sync with Supabase auth for the rest of the session.
        Supabase.instance.client.auth.onAuthStateChange.listen((state) async {
          final id = state.session?.user.id;
          if (id != null) {
            await Purchases.logIn(id);
          } else {
            await Purchases.logOut();
          }
        });
      }
    } catch (e) {
      // Never let IAP setup block app boot. Standby still works without it.
      debugPrint('RevenueCat configure failed (non-fatal): $e');
    }
  }
```

Add imports at the top of `main.dart`:

```dart
import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
```

> Wrapping configure in try/catch prevents an IAP failure from blocking boot, but note a native SIGKILL cannot be caught from Dart — that's why the device test is mandatory.

---

## Step 3 — `lib/features/subscription/data/subscription_service.dart`

Replace the stubbed file with the real implementation. The public surface (`FlyByeTier`, `FlyByeTierX`, `subscriptionServiceProvider`, `myTierProvider`) stays identical, so nothing else in the app needs to change.

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../../../core/supabase_providers.dart';

enum FlyByeTier { standby, regular, firstClass }

extension FlyByeTierX on FlyByeTier {
  String get label => switch (this) {
        FlyByeTier.standby => 'Standby',
        FlyByeTier.regular => 'Regular',
        FlyByeTier.firstClass => 'First Class',
      };

  String get db => switch (this) {
        FlyByeTier.standby => 'standby',
        FlyByeTier.regular => 'regular',
        FlyByeTier.firstClass => 'first_class',
      };
}

class SubscriptionService {
  /// Fast local read straight from RevenueCat's cached entitlements.
  /// The Supabase `subscriptions` table (via [myTierProvider]) remains the
  /// authoritative source once the webhook has processed the purchase.
  Future<FlyByeTier> currentTier() async {
    try {
      final info = await Purchases.getCustomerInfo();
      final active = info.entitlements.active.keys.toSet();
      if (active.contains('first_class')) return FlyByeTier.firstClass;
      if (active.contains('regular')) return FlyByeTier.regular;
      return FlyByeTier.standby;
    } catch (_) {
      return FlyByeTier.standby;
    }
  }

  Future<void> restore() async {
    await Purchases.restorePurchases();
  }

  Future<Offering?> currentOffering() async {
    final offerings = await Purchases.getOfferings();
    return offerings.current;
  }
}

final subscriptionServiceProvider =
    Provider<SubscriptionService>((_) => SubscriptionService());

/// Source of truth for entitlement gating: Supabase, synced from the
/// RevenueCat webhook.
final myTierProvider = FutureProvider<FlyByeTier>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final raw = await client.rpc('get_my_subscription_tier');
  return switch (raw as String?) {
    'first_class' => FlyByeTier.firstClass,
    'regular' => FlyByeTier.regular,
    _ => FlyByeTier.standby,
  };
});
```

---

## Step 4 — `lib/features/subscription/screens/paywall_screen.dart`

Replace the "coming soon" placeholder with a real paywall that lists the `default` offering's packages, runs the purchase, then refreshes the tier from Supabase. It is written so it does **not** depend on the exact return type of `purchasePackage` (which has shifted across SDK versions) — it ignores the return value and re-reads entitlement state, which is robust.

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../../../core/theme.dart';
import '../data/subscription_service.dart';

final _offeringProvider = FutureProvider.autoDispose<Offering?>((ref) async {
  return ref.read(subscriptionServiceProvider).currentOffering();
});

class PaywallScreen extends ConsumerStatefulWidget {
  const PaywallScreen({super.key});
  @override
  ConsumerState<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends ConsumerState<PaywallScreen> {
  bool _busy = false;

  Future<void> _buy(Package pkg) async {
    setState(() => _busy = true);
    try {
      await Purchases.purchasePackage(pkg);
      // Entitlement syncs to Supabase via the webhook; refresh local state.
      ref.invalidate(myTierProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You\'re upgraded. Welcome aboard!')),
        );
        context.pop();
      }
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      if (code != PurchasesErrorCode.purchaseCancelledError && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Purchase failed: ${e.message}')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    setState(() => _busy = true);
    try {
      await ref.read(subscriptionServiceProvider).restore();
      ref.invalidate(myTierProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Purchases restored.')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offering = ref.watch(_offeringProvider);
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: FlyByeColors.bgGradient),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => context.pop(),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 28),
                child: Text(
                  'Upgrade your FlyBye',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: offering.when(
                  loading: () => const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                  error: (e, _) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Text(
                        'Couldn\'t load plans. $e',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                  data: (o) {
                    final packages = o?.availablePackages ?? const [];
                    if (packages.isEmpty) {
                      return const Center(
                        child: Text(
                          'No plans available right now.',
                          style: TextStyle(color: Colors.white),
                        ),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: packages.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, i) {
                        final p = packages[i];
                        return _PlanCard(
                          title: p.storeProduct.title,
                          price: p.storeProduct.priceString,
                          onTap: _busy ? null : () => _buy(p),
                        );
                      },
                    );
                  },
                ),
              ),
              // Auto-renew / terms disclosure (Apple requires this on the paywall).
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 28, vertical: 8),
                child: Text(
                  'Subscriptions auto-renew until cancelled. Manage or cancel '
                  'anytime in your App Store account settings. Payment is '
                  'charged to your Apple ID at confirmation.',
                  style: TextStyle(color: FlyByeColors.cloud, fontSize: 11, height: 1.4),
                ),
              ),
              TextButton(
                onPressed: _busy ? null : _restore,
                child: const Text(
                  'Restore purchases',
                  style: TextStyle(color: Colors.white),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.title, required this.price, this.onTap});
  final String title;
  final String price;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                price,
                style: const TextStyle(
                  color: FlyByeColors.sky,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## Step 5 — device test (mandatory before submitting an IAP build)

1. `flutter pub get && cd ios && pod install && cd ..`
2. Build to a **real iOS 26 device** (the simulator won't reproduce the original SIGKILL): `flutter run --release` with the device attached.
3. Confirm the app **boots past Supabase init without crashing** — this is the regression that disabled IAP. Watch for the SIGKILL right after init.
4. Open Profile → Upgrade. Confirm the four plans load with App Store prices (requires the products to be in "Ready to Submit" in App Store Connect and added to the RevenueCat `default` offering).
5. Use a **Sandbox Apple ID** to buy a plan. Confirm:
   - purchase completes,
   - the RevenueCat webhook fires (RevenueCat → your function logs / Supabase function logs),
   - `subscriptions.tier` updates for your user,
   - the app reflects the new tier after `myTierProvider` refreshes.
6. Test **Restore purchases** on a second device / reinstall.

If step 3 crashes on 9.15.0, fall back to staying stubbed and open a RevenueCat support ticket with the crash log — do **not** ship a crashing build.

## Env

`.env` must contain (already templated in `.env.example`):

```
REVENUECAT_IOS_KEY=appl_xxx
REVENUECAT_ANDROID_KEY=goog_xxx
```
