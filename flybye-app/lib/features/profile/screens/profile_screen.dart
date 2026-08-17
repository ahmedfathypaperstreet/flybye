import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme.dart';
import '../data/profile_repo.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(myProfileProvider);
    final repo = ref.read(profileRepoProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('You'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (p) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(myProfileProvider),
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: CircleAvatar(
                  radius: 56,
                  backgroundColor: FlyByeColors.secondary,
                  backgroundImage: p.avatarUrl != null
                      ? CachedNetworkImageProvider(repo.avatarUrl(p.avatarUrl!))
                      : null,
                  child: p.avatarUrl == null
                      ? const Icon(Icons.person,
                          size: 48, color: FlyByeColors.muted,)
                      : null,
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        p.displayName.isEmpty ? 'Your name' : p.displayName,
                        style: const TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w700,),
                      ),
                    ),
                    if (p.verified) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.verified,
                          size: 20, color: FlyByeColors.primary,),
                    ],
                  ],
                ),
              ),
              if (p.roleCompany != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Center(
                    child: Text(
                      p.roleCompany!,
                      style: const TextStyle(color: FlyByeColors.muted),
                    ),
                  ),
                ),
              const SizedBox(height: 20),

              // Verification status entry point
              _VerificationTile(
                state: p.verificationStatus,
                onTap: () => context.push('/verification'),
              ),
              const SizedBox(height: 20),

              if (p.bio != null && p.bio!.isNotEmpty) ...[
                Text(p.bio!, style: const TextStyle(height: 1.4)),
                const SizedBox(height: 16),
              ],

              if (p.industry != null && p.industry!.isNotEmpty)
                _InfoRow(
                    icon: Icons.category_outlined, label: p.industry!,),
              if (p.intent != null)
                _InfoRow(
                    icon: Icons.flag_outlined, label: p.intent!.label,),
              if (p.homeAirport != null && p.homeAirport!.isNotEmpty)
                _InfoRow(
                    icon: Icons.home_outlined,
                    label: 'Home airport · ${p.homeAirport}',),
              if (p.currentAirport != null && p.currentAirport!.isNotEmpty)
                _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Currently at · ${p.currentAirport}',),
              if (p.linkedinUrl != null && p.linkedinUrl!.isNotEmpty)
                _InfoRow(
                  icon: Icons.link,
                  label: 'LinkedIn',
                  onTap: () => launchUrl(
                    Uri.parse(p.linkedinUrl!),
                    mode: LaunchMode.externalApplication,
                  ),
                ),

              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => context.push('/profile/edit'),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Edit profile'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VerificationTile extends StatelessWidget {
  const _VerificationTile({required this.state, required this.onTap});
  final VerificationState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, String label, Color color) = switch (state) {
      VerificationState.approved => (
        Icons.verified,
        'ID verified',
        FlyByeColors.success
      ),
      VerificationState.pending => (
        Icons.hourglass_top,
        'Verification under review',
        FlyByeColors.warning
      ),
      VerificationState.rejected => (
        Icons.error_outline,
        'Verification rejected — tap to retry',
        FlyByeColors.danger
      ),
      VerificationState.none => (
        Icons.lock_outline,
        'Verify your ID to message',
        FlyByeColors.accent
      ),
    };

    return Material(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: FlyByeColors.foreground,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right, color: FlyByeColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            Icon(icon, size: 18, color: FlyByeColors.muted),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: onTap != null
                      ? FlyByeColors.primary
                      : FlyByeColors.foreground,
                ),
              ),
            ),
            if (onTap != null)
              const Icon(Icons.open_in_new,
                  size: 15, color: FlyByeColors.muted,),
          ],
        ),
      ),
    );
  }
}
