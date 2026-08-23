import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/auth/screens/landing_screen.dart';
import '../features/auth/screens/sign_in_screen.dart';
import '../features/auth/screens/sign_up_screen.dart';
import '../features/auth/screens/onboarding_screen.dart';
import '../features/auth/screens/forgot_password_screen.dart';
import '../features/auth/screens/reset_password_screen.dart';
import '../features/flight/screens/flight_entry_screen.dart';
import '../features/discover/screens/discover_screen.dart';
import '../features/conversations/screens/conversations_screen.dart';
import '../features/conversations/screens/chat_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/profile/screens/profile_edit_screen.dart';
import '../features/profile/screens/settings_screen.dart';
import '../features/verification/screens/verification_screen.dart';
import 'shell.dart';
import 'supabase_providers.dart';

/// Notifies go_router whenever the auth state changes so redirects re-run.
/// Also tracks the password-recovery deep link: when the user taps the reset
/// email, Supabase opens a recovery session and fires `passwordRecovery`; we
/// flag it so the redirect sends them to /reset-password instead of /discover.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    _sub = ref
        .read(supabaseClientProvider)
        .auth
        .onAuthStateChange
        .listen((s) {
      switch (s.event) {
        case AuthChangeEvent.passwordRecovery:
          recovering = true;
          break;
        case AuthChangeEvent.userUpdated:
        case AuthChangeEvent.signedOut:
          recovering = false;
          break;
        default:
          break;
      }
      notifyListeners();
    });
    ref.onDispose(() => _sub.cancel());
  }

  /// True while a password-recovery session is active (until the password is
  /// updated or the user signs out).
  bool recovering = false;
  late final StreamSubscription<AuthState> _sub;
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = _AuthListenable(ref);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      // Password-recovery deep link: force the reset screen regardless of the
      // (recovery) session being "logged in".
      if (auth.recovering) {
        return state.matchedLocation == '/reset-password'
            ? null
            : '/reset-password';
      }

      final user = ref.read(supabaseClientProvider).auth.currentUser;
      final loggedIn = user != null;
      final goingToAuth = const {
        '/',
        '/sign-in',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
      }.contains(state.matchedLocation);

      if (!loggedIn && !goingToAuth) return '/';
      if (loggedIn && goingToAuth && state.matchedLocation != '/reset-password') {
        return '/discover';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const LandingScreen()),
      GoRoute(path: '/sign-in', builder: (_, __) => const SignInScreen()),
      GoRoute(path: '/sign-up', builder: (_, __) => const SignUpScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (_, __) => const ResetPasswordScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/flight',
        builder: (_, __) => const FlightEntryScreen(),
      ),

      // Bottom-nav shell -----------------------------------------------------
      ShellRoute(
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/discover', builder: (_, __) => const DiscoverScreen()),
          GoRoute(
            path: '/conversations',
            builder: (_, __) => const ConversationsScreen(),
          ),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),

      GoRoute(
        path: '/chat/:conversationId',
        builder: (_, state) => ChatScreen(
          conversationId: state.pathParameters['conversationId']!,
        ),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (_, __) => const ProfileEditScreen(),
      ),
      GoRoute(
        path: '/verification',
        builder: (_, __) => const VerificationScreen(),
      ),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    ],
  );
});
