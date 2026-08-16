import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme.dart';
import '../../profile/data/profile_repo.dart';
import '../data/verification_repo.dart';

/// In-app ID verification: shows the current status (from
/// `profiles.verification_status` + `verified`) and, when unverified or
/// rejected, exposes the government-ID upload flow.
class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key});
  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  bool _busy = false;

  Future<void> _upload() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
      maxWidth: 2000,
    );
    if (picked == null) return;
    setState(() => _busy = true);
    try {
      final ext = picked.path.split('.').last.toLowerCase();
      await ref.read(verificationRepoProvider).submit(
            File(picked.path),
            ext: ext.isEmpty ? 'jpg' : ext,
          );
      ref.invalidate(myProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Submitted for review. We\'ll notify you once your ID is reviewed (usually within 24h).'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Couldn\'t submit your ID. $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('ID Verification')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (p) {
          final state = p.verificationStatus;
          final showUpload = state == VerificationState.none ||
              state == VerificationState.rejected;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _StatusCard(state: state),
              if (state == VerificationState.rejected) _RejectionReason(),
              if (showUpload) ...[
                const SizedBox(height: 20),
                _UploadCard(busy: _busy, onUpload: _busy ? null : _upload),
              ],
              const SizedBox(height: 20),
              const Row(
                children: [
                  Icon(Icons.shield_outlined,
                      size: 16, color: FlyByeColors.muted),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your documents are private — visible only to you and our verification team.',
                      style:
                          TextStyle(color: FlyByeColors.muted, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.state});
  final VerificationState state;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, String label, String desc, Color color) =
        switch (state) {
      VerificationState.none => (
        Icons.help_outline,
        'Not verified',
        'Verify your government-issued ID to unlock messaging. Takes about a minute.',
        FlyByeColors.muted,
      ),
      VerificationState.pending => (
        Icons.hourglass_top,
        'Under review',
        'We\'ve received your ID and are reviewing it. This usually takes under 24 hours.',
        FlyByeColors.warning,
      ),
      VerificationState.approved => (
        Icons.verified,
        'Verified',
        'Your identity is verified. Other professionals see your verified badge, and you can message.',
        FlyByeColors.success,
      ),
      VerificationState.rejected => (
        Icons.error_outline,
        'Verification rejected',
        'We couldn\'t verify your ID. Please upload a clearer photo to try again.',
        FlyByeColors.danger,
      ),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: FlyByeColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: FlyByeColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  desc,
                  style: const TextStyle(
                      color: FlyByeColors.muted, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RejectionReason extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(verificationRepoProvider);
    return FutureBuilder<String?>(
      future: repo.rejectionReason(),
      builder: (context, snap) {
        final reason = snap.data;
        if (reason == null || reason.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: FlyByeColors.danger.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Reason: $reason',
              style: const TextStyle(color: FlyByeColors.foreground),
            ),
          ),
        );
      },
    );
  }
}

class _UploadCard extends StatelessWidget {
  const _UploadCard({required this.busy, required this.onUpload});
  final bool busy;
  final VoidCallback? onUpload;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: FlyByeColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: FlyByeColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Upload your ID',
            style: TextStyle(
                fontWeight: FontWeight.w700, color: FlyByeColors.foreground),
          ),
          const SizedBox(height: 6),
          const Text(
            'Upload a clear photo of your government-issued ID (driver\'s license or passport). Once approved, you\'ll be able to message professionals.',
            style: TextStyle(
                color: FlyByeColors.muted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onUpload,
            icon: busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.upload_outlined),
            label: Text(busy ? 'Uploading…' : 'Choose a photo'),
          ),
        ],
      ),
    );
  }
}
