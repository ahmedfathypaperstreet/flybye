import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme.dart';
import '../../profile/data/profile_repo.dart';
import '../data/discover_repo.dart';
import '../widgets/connection_card.dart';

class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});

  Future<void> _message(
    BuildContext context,
    WidgetRef ref,
    Profile me,
    Profile other,
  ) async {
    if (!me.verified) {
      _verifyPrompt(context);
      return;
    }
    try {
      final convId =
          await ref.read(discoverRepoProvider).getOrCreateConversation(other.id);
      if (context.mounted) context.push('/chat/$convId');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Couldn\'t start conversation. $e')),
        );
      }
    }
  }

  static void _verifyPrompt(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Verify your ID to message.'),
        action: SnackBarAction(
          label: 'Verify',
          onPressed: () => context.push('/verification'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myProfile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        actions: [
          IconButton(
            tooltip: 'My itinerary',
            icon: const Icon(Icons.flight_takeoff),
            onPressed: () => context.push('/flight'),
          ),
        ],
      ),
      body: myProfile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (me) {
          final feed = ref.watch(discoverFeedProvider);
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(discoverFeedProvider);
              ref.invalidate(myProfileProvider);
            },
            child: feed.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => ListView(
                children: [
                  const SizedBox(height: 120),
                  Center(child: Text('$e')),
                ],
              ),
              data: (list) {
                return CustomScrollView(
                  slivers: [
                    if (!me.verified)
                      SliverToBoxAdapter(child: _VerifyBanner()),
                    if (me.currentAirport == null)
                      const SliverFillRemaining(
                        hasScrollBody: false,
                        child: _NoItinerary(),
                      )
                    else if (list.isEmpty)
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: _Empty(airport: me.currentAirport!),
                      )
                    else ...[
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                        sliver: SliverToBoxAdapter(
                          child: Text(
                            '${list.length} professional${list.length == 1 ? '' : 's'} at ${me.currentAirport}',
                            style: const TextStyle(
                              color: FlyByeColors.muted,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                        sliver: SliverList.separated(
                          itemCount: list.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (_, i) {
                            final p = list[i];
                            return ConnectionCard(
                              profile: p,
                              canMessage: me.verified,
                              avatarUrl: p.avatarUrl == null
                                  ? null
                                  : ref
                                      .read(profileRepoProvider)
                                      .avatarUrl(p.avatarUrl!),
                              onMessage: () => _message(context, ref, me, p),
                            );
                          },
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _VerifyBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Material(
        color: FlyByeColors.accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => context.push('/verification'),
          child: const Padding(
            padding: EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(Icons.lock_outline,
                    color: FlyByeColors.accent, size: 20,),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Browse mode — verify to message',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: FlyByeColors.foreground,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'See who\'s at your terminal. Verify your ID to message.',
                        style: TextStyle(
                            color: FlyByeColors.muted, fontSize: 12,),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: FlyByeColors.accent),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NoItinerary extends StatelessWidget {
  const _NoItinerary();
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.flight_takeoff,
                size: 64, color: FlyByeColors.muted,),
            const SizedBox(height: 16),
            const Text(
              'Add your itinerary to see professionals at your airport.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: FlyByeColors.muted),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.push('/flight'),
              child: const Text('Add my flight'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.airport});
  final String airport;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_on_outlined,
                size: 64, color: FlyByeColors.muted,),
            const SizedBox(height: 16),
            Text(
              'No professionals at $airport right now. New travelers arrive every hour.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: FlyByeColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}
