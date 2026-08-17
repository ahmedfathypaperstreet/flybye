import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme.dart';
import '../../profile/data/profile_repo.dart';
import '../../verification/data/verification_repo.dart';

/// First-run setup: business identity + a single headshot, plus an optional
/// government-ID upload (verification unlocks messaging).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _role = TextEditingController();
  final _company = TextEditingController();
  final _industry = TextEditingController();
  final _linkedin = TextEditingController();
  final _bio = TextEditingController();
  NetworkingIntent? _intent;

  XFile? _headshot;
  XFile? _idDoc;
  bool _busy = false;

  @override
  void dispose() {
    _role.dispose();
    _company.dispose();
    _industry.dispose();
    _linkedin.dispose();
    _bio.dispose();
    super.dispose();
  }

  Future<XFile?> _pick(ImageSource source) => ImagePicker().pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1600,
      );

  Future<void> _finish() async {
    if (_headshot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a headshot to continue.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final profileRepo = ref.read(profileRepoProvider);

      final ext = _headshot!.path.split('.').last.toLowerCase();
      final avatarPath = await profileRepo.uploadAvatar(
        File(_headshot!.path),
        ext: ext.isEmpty ? 'jpg' : ext,
      );

      String? nullIfEmpty(String s) => s.trim().isEmpty ? null : s.trim();
      await profileRepo.updateProfile(
        avatarUrl: avatarPath,
        role: nullIfEmpty(_role.text),
        company: nullIfEmpty(_company.text),
        industry: nullIfEmpty(_industry.text),
        intent: _intent,
        linkedinUrl: nullIfEmpty(_linkedin.text),
        bio: nullIfEmpty(_bio.text),
      );

      // Optional: submit the government ID for verification now.
      if (_idDoc != null) {
        final idExt = _idDoc!.path.split('.').last.toLowerCase();
        await ref.read(verificationRepoProvider).submit(
              File(_idDoc!.path),
              ext: idExt.isEmpty ? 'jpg' : idExt,
            );
      }

      ref.invalidate(myProfileProvider);
      if (mounted) context.go('/flight');
    } on PostgrestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Set up your profile')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'Tell fellow professionals who you are and what you\'re looking for.',
              style: TextStyle(color: FlyByeColors.muted),
            ),
            const SizedBox(height: 20),
            _ImageTile(
              label: 'Headshot',
              helper: 'A clear photo of you.',
              file: _headshot,
              icon: Icons.add_a_photo_outlined,
              onPick: () async {
                final f = await _pick(ImageSource.gallery);
                if (f != null) setState(() => _headshot = f);
              },
            ),
            const SizedBox(height: 20),
            _field(_role, 'Role / title', hint: 'e.g. Product Lead'),
            _field(_company, 'Company', hint: 'e.g. Acme Inc.'),
            _field(_industry, 'Industry', hint: 'e.g. Fintech, SaaS'),
            const SizedBox(height: 4),
            DropdownButtonFormField<NetworkingIntent>(
              initialValue: _intent,
              decoration: const InputDecoration(labelText: 'I\'m here for'),
              items: [
                for (final i in NetworkingIntent.values)
                  DropdownMenuItem(value: i, child: Text(i.label)),
              ],
              onChanged: (v) => setState(() => _intent = v),
            ),
            const SizedBox(height: 16),
            _field(_linkedin, 'LinkedIn URL (optional)',
                hint: 'https://linkedin.com/in/you',),
            _field(_bio, 'About you',
                hint: 'A line or two — what are you working on?',
                maxLines: 3,
                maxLength: 400,),
            const SizedBox(height: 8),
            const Divider(),
            const SizedBox(height: 8),
            const Text(
              'Verify your ID',
              style: TextStyle(
                  fontWeight: FontWeight.w700, color: FlyByeColors.foreground,),
            ),
            const SizedBox(height: 4),
            const Text(
              'Upload a government-issued ID to unlock messaging. You can also do this later from your profile.',
              style: TextStyle(color: FlyByeColors.muted, fontSize: 13),
            ),
            const SizedBox(height: 12),
            _ImageTile(
              label: 'Government ID (optional)',
              helper: 'Held privately for review.',
              file: _idDoc,
              icon: Icons.badge_outlined,
              onPick: () async {
                final f = await _pick(ImageSource.gallery);
                if (f != null) setState(() => _idDoc = f);
              },
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _busy ? null : _finish,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white,),
                    )
                  : const Text('Finish & add my flight'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController c,
    String label, {
    String? hint,
    int maxLines = 1,
    int? maxLength,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        maxLines: maxLines,
        maxLength: maxLength,
        decoration: InputDecoration(labelText: label, hintText: hint),
      ),
    );
  }
}

class _ImageTile extends StatelessWidget {
  const _ImageTile({
    required this.label,
    required this.helper,
    required this.file,
    required this.icon,
    required this.onPick,
  });
  final String label;
  final String helper;
  final XFile? file;
  final IconData icon;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: FlyByeColors.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: FlyByeColors.border),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: file == null
                  ? Container(
                      width: 64,
                      height: 64,
                      color: FlyByeColors.card,
                      child: Icon(icon, color: FlyByeColors.muted),
                    )
                  : Image.file(File(file!.path),
                      width: 64, height: 64, fit: BoxFit.cover,),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: FlyByeColors.foreground,),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    file == null ? helper : 'Tap to change',
                    style: const TextStyle(
                        color: FlyByeColors.muted, fontSize: 12,),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: FlyByeColors.muted),
          ],
        ),
      ),
    );
  }
}
