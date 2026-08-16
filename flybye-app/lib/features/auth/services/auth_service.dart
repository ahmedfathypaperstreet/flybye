import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';

/// Thin wrapper around Supabase auth + the password-reset deep link flow.
class AuthService {
  AuthService(this._client);
  final SupabaseClient _client;

  // ── sign up / in / out ────────────────────────────────────────────────────

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String displayName,
  }) {
    return _client.auth.signUp(
      email: email.trim(),
      password: password,
      data: {
        'display_name': displayName.trim(),
      },
    );
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) {
    return _client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  // ── password reset ────────────────────────────────────────────────────────

  Future<void> sendPasswordResetEmail(String email) {
    return _client.auth.resetPasswordForEmail(
      email.trim(),
      redirectTo: 'flybye://reset-password',
    );
  }

  Future<void> updatePassword(String newPassword) async {
    await _client.auth.updateUser(UserAttributes(password: newPassword));
    await _client.auth.signOut(scope: SignOutScope.others);
  }

  /// Listen once at app start; navigate to /reset-password on recovery.
  StreamSubscription<AuthState> listenForPasswordRecovery(
    void Function() onRecovery,
  ) {
    return _client.auth.onAuthStateChange.listen((s) {
      if (s.event == AuthChangeEvent.passwordRecovery) onRecovery();
    });
  }
}

final authServiceProvider = Provider<AuthService>(
  (ref) => AuthService(ref.watch(supabaseClientProvider)),
);
