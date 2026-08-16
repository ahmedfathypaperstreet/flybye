import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme.dart';
import '../../profile/data/profile_repo.dart';
import '../../profile/widgets/report_block_sheet.dart';

/// A browsable card for one professional at the terminal. Mirrors the web
/// `ConnectionCard` (name, role · company, industry, intent, verified badge)
/// with a Message action gated on the current user's verification.
class ConnectionCard extends StatelessWidget {
  const ConnectionCard({
    super.key,
    required this.profile,
    required this.canMessage,
    required this.onMessage,
    this.avatarUrl,
  });

  final Profile profile;
  final bool canMessage;
  final VoidCallback onMessage;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: FlyByeColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: FlyByeColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: avatar + name + verified badge + overflow menu
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 6, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: FlyByeColors.secondary,
                  backgroundImage: avatarUrl != null
                      ? CachedNetworkImageProvider(avatarUrl!)
                      : null,
                  child: avatarUrl == null
                      ? const Icon(Icons.person, color: FlyByeColors.muted)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              profile.displayName.isEmpty
                                  ? 'Professional'
                                  : profile.displayName,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: FlyByeColors.foreground,
                              ),
                            ),
                          ),
                          if (profile.verified) ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.verified,
                                size: 18, color: FlyByeColors.primary),
                          ],
                        ],
                      ),
                      if (profile.roleCompany != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          profile.roleCompany!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: FlyByeColors.foreground,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                _OverflowMenu(otherId: profile.id),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (profile.industry != null &&
                    profile.industry!.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: FlyByeColors.secondary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      profile.industry!,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: FlyByeColors.foreground,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                if (profile.intent != null)
                  Row(
                    children: [
                      Icon(_intentIcon(profile.intent!),
                          size: 15, color: FlyByeColors.accent),
                      const SizedBox(width: 6),
                      Text(
                        profile.intent!.label,
                        style: const TextStyle(
                          fontSize: 12,
                          color: FlyByeColors.muted,
                        ),
                      ),
                    ],
                  ),
                if (profile.bio != null && profile.bio!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    profile.bio!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, color: FlyByeColors.foreground),
                  ),
                ],
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: onMessage,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                  ),
                  icon: Icon(
                    canMessage ? Icons.chat_bubble_outline : Icons.lock_outline,
                    size: 18,
                  ),
                  label: Text(canMessage ? 'Message' : 'Verify to message'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static IconData _intentIcon(NetworkingIntent intent) => switch (intent) {
        NetworkingIntent.hiring => Icons.work_outline,
        NetworkingIntent.partnerships => Icons.handshake_outlined,
        NetworkingIntent.mentorship => Icons.school_outlined,
        NetworkingIntent.networking => Icons.groups_outlined,
      };
}

class _OverflowMenu extends StatelessWidget {
  const _OverflowMenu({required this.otherId});
  final String otherId;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: FlyByeColors.muted),
      tooltip: 'Report or block',
      onSelected: (_) => ReportBlockSheet.show(context, otherId),
      itemBuilder: (_) => const [
        PopupMenuItem(
          value: 'report',
          child: ListTile(
            leading: Icon(Icons.flag_outlined),
            title: Text('Report'),
            contentPadding: EdgeInsets.zero,
          ),
        ),
        PopupMenuItem(
          value: 'block',
          child: ListTile(
            leading: Icon(Icons.block, color: FlyByeColors.danger),
            title: Text('Report and block',
                style: TextStyle(color: FlyByeColors.danger)),
            contentPadding: EdgeInsets.zero,
          ),
        ),
      ],
    );
  }
}
