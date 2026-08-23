import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';

/// One row of `location_shares` — live lounge/terminal presence.
class LocationShare {
  LocationShare({
    required this.userId,
    required this.airport,
    required this.terminal,
    required this.zone,
    required this.note,
    required this.isActive,
    required this.lastSeenAt,
  });

  final String userId;
  final String airport;
  final String? terminal;
  final String? zone;
  final String? note;
  final bool isActive;
  final DateTime? lastSeenAt;

  factory LocationShare.fromRow(Map<String, dynamic> row) => LocationShare(
        userId: row['user_id'] as String,
        airport: (row['airport'] as String?) ?? '',
        terminal: row['terminal'] as String?,
        zone: row['zone'] as String?,
        note: row['note'] as String?,
        isActive: row['is_active'] as bool? ?? false,
        lastSeenAt: row['last_seen_at'] != null
            ? DateTime.tryParse(row['last_seen_at'] as String)
            : null,
      );
}

const _shareColumns =
    'user_id, airport, terminal, zone, note, is_active, last_seen_at';

class LocationShareRepo {
  LocationShareRepo(this._client);
  final SupabaseClient _client;

  /// My current share (active or not), or null if I've never shared.
  Future<LocationShare?> myShare() async {
    final me = _client.auth.currentUser!.id;
    final row = await _client
        .from('location_shares')
        .select(_shareColumns)
        .eq('user_id', me)
        .maybeSingle();
    return row == null ? null : LocationShare.fromRow(row);
  }

  /// Another user's *active* share, or null when they aren't sharing.
  Future<LocationShare?> activeShareOf(String userId) async {
    final row = await _client
        .from('location_shares')
        .select(_shareColumns)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
    return row == null ? null : LocationShare.fromRow(row);
  }

  /// Upsert my share (onConflict user_id). Returns the persisted row.
  Future<LocationShare> upsert({
    required String airport,
    required bool isActive,
    String? terminal,
    String? zone,
    String? note,
  }) async {
    final me = _client.auth.currentUser!.id;
    final row = await _client
        .from('location_shares')
        .upsert(
          {
            'user_id': me,
            'airport': airport,
            'terminal': (terminal?.trim().isEmpty ?? true) ? null : terminal!.trim(),
            'zone': (zone?.trim().isEmpty ?? true) ? null : zone!.trim(),
            'note': (note?.trim().isEmpty ?? true) ? null : note!.trim(),
            'is_active': isActive,
            'last_seen_at': DateTime.now().toUtc().toIso8601String(),
          },
          onConflict: 'user_id',
        )
        .select(_shareColumns)
        .single();
    return LocationShare.fromRow(row);
  }

  /// Heartbeat — bump `last_seen_at` while sharing is active.
  Future<void> heartbeat() async {
    final me = _client.auth.currentUser!.id;
    await _client
        .from('location_shares')
        .update({'last_seen_at': DateTime.now().toUtc().toIso8601String()})
        .eq('user_id', me);
  }

  /// Turn my share off (e.g. when the app is backgrounded).
  Future<void> deactivate() async {
    final me = _client.auth.currentUser!.id;
    await _client
        .from('location_shares')
        .update({'is_active': false}).eq('user_id', me);
  }

  /// Realtime stream of a given user's share row(s). Emits the raw rows; the
  /// UI filters for `is_active`. Falls back to a poll in the widget if the
  /// realtime channel never connects.
  Stream<List<Map<String, dynamic>>> shareStream(String userId) {
    return _client
        .from('location_shares')
        .stream(primaryKey: ['user_id']).eq('user_id', userId);
  }
}

final locationShareRepoProvider = Provider<LocationShareRepo>(
  (ref) => LocationShareRepo(ref.watch(supabaseClientProvider)),
);
