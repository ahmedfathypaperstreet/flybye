import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme.dart';
import '../data/conversation_repo.dart';

class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Connections')),
      body: conversations.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (list) {
          if (list.isEmpty) {
            return _Empty();
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(conversationsListProvider),
            child: ListView.separated(
              itemCount: list.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 84),
              itemBuilder: (_, i) {
                final c = list[i];
                final repo = ref.read(conversationRepoProvider);
                return ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  leading: CircleAvatar(
                    radius: 26,
                    backgroundColor: FlyByeColors.secondary,
                    backgroundImage: c.otherAvatar != null
                        ? CachedNetworkImageProvider(
                            repo.avatarUrl(c.otherAvatar!))
                        : null,
                    child: c.otherAvatar == null
                        ? const Icon(Icons.person, color: FlyByeColors.muted)
                        : null,
                  ),
                  title: Row(
                    children: [
                      Flexible(
                        child: Text(
                          c.otherName,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (c.verified) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.verified,
                            size: 15, color: FlyByeColors.primary),
                      ],
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (c.otherRoleCompany != null)
                        Text(
                          c.otherRoleCompany!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: FlyByeColors.muted, fontSize: 12),
                        ),
                      Text(
                        c.lastMessage ?? 'Start the conversation',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: c.lastMessage == null
                              ? FlyByeColors.primary
                              : FlyByeColors.muted,
                        ),
                      ),
                    ],
                  ),
                  trailing: c.lastMessageAt == null
                      ? null
                      : Text(
                          DateFormat.jm().format(c.lastMessageAt!.toLocal()),
                          style: const TextStyle(
                              color: FlyByeColors.muted, fontSize: 12),
                        ),
                  onTap: () => context.push('/chat/${c.conversationId}'),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.chat_bubble_outline,
                size: 56, color: FlyByeColors.muted),
            const SizedBox(height: 16),
            const Text(
              'No conversations yet',
              style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: FlyByeColors.foreground),
            ),
            const SizedBox(height: 6),
            const Text(
              'Message a verified professional from Discover to start a conversation.',
              textAlign: TextAlign.center,
              style: TextStyle(color: FlyByeColors.muted),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => context.go('/discover'),
              icon: const Icon(Icons.explore_outlined),
              label: const Text('Go to Discover'),
            ),
          ],
        ),
      ),
    );
  }
}
