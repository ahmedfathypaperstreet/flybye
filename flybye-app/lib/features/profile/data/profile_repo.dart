import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';

/// Networking intent — mirrors the `networking_intent` enum in the DB.
enum NetworkingIntent { hiring, partnerships, mentorship, networking }

extension NetworkingIntentX on NetworkingIntent {
  String get db => name;

  String get label => switch (this) {
        NetworkingIntent.hiring => 'Hiring',
        NetworkingIntent.partnerships => 'Open to partnerships',
        NetworkingIntent.mentorship => 'Mentorship',
        NetworkingIntent.networking => 'Open to networking',
      };

  static NetworkingIntent? fromDb(String? v) {
    if (v == null) return null;
    for (final i in NetworkingIntent.values) {
      if (i.name == v) return i;
    }
    return null;
  }
}

/// Verification lifecycle — mirrors `profiles.verification_status`.
enum VerificationState { none, pending, approved, rejected }

VerificationState verificationStateFromDb(String? v) => switch (v) {
      'pending' => VerificationState.pending,
      'approved' => VerificationState.approved,
      'rejected' => VerificationState.rejected,
      _ => VerificationState.none,
    };

/// Business-networking profile — matches the unified `profiles` table.
class Profile {
  Profile({
    required this.id,
    required this.displayName,
    required this.avatarUrl,
    required this.bio,
    required this.role,
    required this.company,
    required this.industry,
    required this.intent,
    required this.linkedinUrl,
    required this.homeAirport,
    required this.currentAirport,
    required this.presentUntil,
    required this.verified,
    required this.verificationStatus,
  });

  final String id;
  final String displayName;
  final String? avatarUrl;
  final String? bio;
  final String? role;
  final String? company;
  final String? industry;
  final NetworkingIntent? intent;
  final String? linkedinUrl;
  final String? homeAirport;
  final String? currentAirport;
  final DateTime? presentUntil;
  final bool verified;
  final VerificationState verificationStatus;

  /// "Role · Company" (whichever parts are present).
  String? get roleCompany {
    final parts = [role, company].where((s) => s != null && s.isNotEmpty);
    return parts.isEmpty ? null : parts.join(' · ');
  }

  factory Profile.fromRow(Map<String, dynamic> row) => Profile(
        id: row['id'] as String,
        displayName: (row['display_name'] as String?) ?? '',
        avatarUrl: row['avatar_url'] as String?,
        bio: row['bio'] as String?,
        role: row['role'] as String?,
        company: row['company'] as String?,
        industry: row['industry'] as String?,
        intent: NetworkingIntentX.fromDb(row['intent'] as String?),
        linkedinUrl: row['linkedin_url'] as String?,
        homeAirport: row['home_airport'] as String?,
        currentAirport: row['current_airport'] as String?,
        presentUntil: row['present_until'] != null
            ? DateTime.parse(row['present_until'] as String)
            : null,
        verified: row['verified'] as bool? ?? false,
        verificationStatus:
            verificationStateFromDb(row['verification_status'] as String?),
      );
}

class ProfileRepo {
  ProfileRepo(this._client);
  final SupabaseClient _client;

  Future<Profile> myProfile() async {
    final me = _client.auth.currentUser!.id;
    final row = await _client.from('profiles').select().eq('id', me).single();
    return Profile.fromRow(row);
  }

  /// Update the current user's business profile. Only non-null keys are written.
  Future<void> updateProfile({
    String? displayName,
    String? avatarUrl,
    String? bio,
    String? role,
    String? company,
    String? industry,
    NetworkingIntent? intent,
    String? linkedinUrl,
    String? homeAirport,
  }) async {
    final me = _client.auth.currentUser!.id;
    await _client.from('profiles').update({
      if (displayName != null) 'display_name': displayName,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      'bio': bio,
      'role': role,
      'company': company,
      'industry': industry,
      'intent': intent?.db,
      'linkedin_url': linkedinUrl,
      'home_airport': homeAirport,
    }).eq('id', me);
  }

  /// Upload a headshot to the public `avatars` bucket at `${uid}/...`.
  /// Returns the stored path.
  Future<String> uploadAvatar(File file, {String ext = 'jpg'}) async {
    final uid = _client.auth.currentUser!.id;
    final path = '$uid/avatar-${DateTime.now().millisecondsSinceEpoch}.$ext';
    await _client.storage.from('avatars').upload(
          path,
          file,
          fileOptions: FileOptions(
            contentType: 'image/$ext',
            upsert: true,
          ),
        );
    return path;
  }

  Future<void> blockUser(String otherId) async {
    final me = _client.auth.currentUser!.id;
    await _client.from('blocks').insert({
      'blocker_id': me,
      'blocked_id': otherId,
    });
  }

  Future<void> reportUser({
    required String otherId,
    required String reason,
    String? details,
  }) async {
    final me = _client.auth.currentUser!.id;
    await _client.from('reports').insert({
      'reporter_id': me,
      'reported_id': otherId,
      'reason': reason,
      'details': details,
    });
  }

  /// Public URL for an avatar. Accepts either a stored path or a full URL.
  String avatarUrl(String pathOrUrl) {
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    return _client.storage.from('avatars').getPublicUrl(pathOrUrl);
  }
}

final profileRepoProvider = Provider<ProfileRepo>(
  (ref) => ProfileRepo(ref.watch(supabaseClientProvider)),
);

final myProfileProvider = FutureProvider<Profile>(
  (ref) => ref.watch(profileRepoProvider).myProfile(),
);
