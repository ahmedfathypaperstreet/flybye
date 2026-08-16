import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';
import '../../profile/data/profile_repo.dart';

class DiscoverRepo {
  DiscoverRepo(this._client);
  final SupabaseClient _client;

  /// Browsable list of verified professionals at my current airport, right now.
  /// Calls the server RPC `discover_at_airport()` (no arguments).
  Future<List<Profile>> fetch() async {
    final rows = await _client.rpc('discover_at_airport');
    return List<Map<String, dynamic>>.from(rows as List)
        .map(Profile.fromRow)
        .toList();
  }

  /// Open (or resume) a direct conversation with [otherId]. Returns the
  /// conversation id. Throws if the caller is not verified (server-enforced).
  Future<String> getOrCreateConversation(String otherId) async {
    final id = await _client.rpc(
      'get_or_create_conversation',
      params: {'other': otherId},
    );
    return id as String;
  }
}

final discoverRepoProvider = Provider<DiscoverRepo>(
  (ref) => DiscoverRepo(ref.watch(supabaseClientProvider)),
);

final discoverFeedProvider = FutureProvider<List<Profile>>(
  (ref) => ref.watch(discoverRepoProvider).fetch(),
);
