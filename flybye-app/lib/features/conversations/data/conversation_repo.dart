import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';

/// One row in the conversations list.
class ConversationSummary {
  ConversationSummary({
    required this.conversationId,
    required this.otherId,
    required this.otherName,
    required this.otherAvatar,
    required this.otherRoleCompany,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.verified,
  });

  final String conversationId;
  final String otherId;
  final String otherName;
  final String? otherAvatar;
  final String? otherRoleCompany;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final bool verified;
}

class ConversationRepo {
  ConversationRepo(this._client);
  final SupabaseClient _client;

  /// Conversations where I'm a participant, newest activity first.
  Future<List<ConversationSummary>> list() async {
    final me = _client.auth.currentUser!.id;
    final rows = await _client
        .from('conversations')
        .select('id, user_a_id, user_b_id, last_message_at')
        .or('user_a_id.eq.$me,user_b_id.eq.$me')
        .order('last_message_at', ascending: false, nullsFirst: false);

    final convs = List<Map<String, dynamic>>.from(rows);
    if (convs.isEmpty) return const [];

    final otherIds = convs
        .map((c) => c['user_a_id'] == me ? c['user_b_id'] : c['user_a_id'])
        .cast<String>()
        .toSet()
        .toList();

    final profiles = await _client
        .from('profiles')
        .select('id, display_name, avatar_url, role, company, verified')
        .inFilter('id', otherIds);

    final profById = {
      for (final p in List<Map<String, dynamic>>.from(profiles))
        p['id'] as String: p,
    };

    // Latest message body per conversation.
    final convIds = convs.map((c) => c['id'] as String).toList();
    final lastMsgs = await _client
        .from('messages')
        .select('conversation_id, body, created_at')
        .inFilter('conversation_id', convIds)
        .order('created_at', ascending: false);

    final lastByConv = <String, Map<String, dynamic>>{};
    for (final m in List<Map<String, dynamic>>.from(lastMsgs)) {
      lastByConv.putIfAbsent(m['conversation_id'] as String, () => m);
    }

    return convs.map((c) {
      final otherId =
          (c['user_a_id'] == me ? c['user_b_id'] : c['user_a_id']) as String;
      final p = profById[otherId] ?? const <String, dynamic>{};
      final last = lastByConv[c['id']];
      final role = p['role'] as String?;
      final company = p['company'] as String?;
      final roleCompany = [role, company]
          .where((s) => s != null && s.isNotEmpty)
          .join(' · ');
      return ConversationSummary(
        conversationId: c['id'] as String,
        otherId: otherId,
        otherName: (p['display_name'] as String?)?.isNotEmpty == true
            ? p['display_name'] as String
            : 'Professional',
        otherAvatar: p['avatar_url'] as String?,
        otherRoleCompany: roleCompany.isEmpty ? null : roleCompany,
        lastMessage: last?['body'] as String?,
        lastMessageAt: last?['created_at'] != null
            ? DateTime.parse(last!['created_at'] as String)
            : (c['last_message_at'] != null
                ? DateTime.parse(c['last_message_at'] as String)
                : null),
        verified: (p['verified'] as bool?) ?? false,
      );
    }).toList();
  }

  /// Fetch the other participant's profile for the chat header.
  Future<Map<String, dynamic>?> otherParticipant(String conversationId) async {
    final me = _client.auth.currentUser!.id;
    final conv = await _client
        .from('conversations')
        .select('user_a_id, user_b_id')
        .eq('id', conversationId)
        .maybeSingle();
    if (conv == null) return null;
    final otherId =
        (conv['user_a_id'] == me ? conv['user_b_id'] : conv['user_a_id'])
            as String;
    final p = await _client
        .from('profiles')
        .select('id, display_name, avatar_url, current_airport, verified')
        .eq('id', otherId)
        .maybeSingle();
    return p;
  }

  /// Realtime stream of messages for a conversation, oldest first.
  Stream<List<Map<String, dynamic>>> messagesStream(String conversationId) {
    return _client
        .from('messages')
        .stream(primaryKey: ['id'])
        .eq('conversation_id', conversationId)
        .order('created_at');
  }

  Future<void> sendMessage(String conversationId, String body) async {
    final me = _client.auth.currentUser!.id;
    await _client.from('messages').insert({
      'conversation_id': conversationId,
      'sender_id': me,
      'body': body,
    });
  }

  /// Mark the counterpart's messages in this conversation as read.
  Future<void> markRead(String conversationId) async {
    await _client
        .rpc('mark_conversation_read', params: {'conv': conversationId});
  }

  String avatarUrl(String pathOrUrl) {
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    return _client.storage.from('avatars').getPublicUrl(pathOrUrl);
  }
}

final conversationRepoProvider = Provider<ConversationRepo>(
  (ref) => ConversationRepo(ref.watch(supabaseClientProvider)),
);

final conversationsListProvider = FutureProvider<List<ConversationSummary>>(
  (ref) => ref.watch(conversationRepoProvider).list(),
);
