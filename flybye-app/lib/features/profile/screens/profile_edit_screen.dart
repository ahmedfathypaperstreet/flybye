import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/photo_picker.dart';
import '../../../core/theme.dart';
import '../data/profile_repo.dart';

class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});
  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _displayName = TextEditingController();
  final _role = TextEditingController();
  final _company = TextEditingController();
  final _industry = TextEditingController();
  final _linkedin = TextEditingController();
  final _bio = TextEditingController();
  final _homeAirport = TextEditingController();
  NetworkingIntent? _intent;

  XFile? _newAvatar;
  String? _existingAvatarUrl;
  bool _loaded = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _prefill();
  }

  Future<void> _prefill() async {
    final p = await ref.read(profileRepoProvider).myProfile();
    if (!mounted) return;
    setState(() {
      _displayName.text = p.displayName;
      _role.text = p.role ?? '';
      _company.text = p.company ?? '';
      _industry.text = p.industry ?? '';
      _linkedin.text = p.linkedinUrl ?? '';
      _bio.text = p.bio ?? '';
      _homeAirport.text = p.homeAirport ?? '';
      _intent = p.intent;
      _existingAvatarUrl = p.avatarUrl == null
          ? null
          : ref.read(profileRepoProvider).avatarUrl(p.avatarUrl!);
      _loaded = true;
    });
  }

  @override
  void dispose() {
    _displayName.dispose();
    _role.dispose();
    _company.dispose();
    _industry.dispose();
    _linkedin.dispose();
    _bio.dispose();
    _homeAirport.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final f = await pickPhoto(
      context,
      camera: CameraDevice.front,
      maxWidth: 1200,
    );
    if (f != null) setState(() => _newAvatar = f);
  }

  Future<void> _save() async {
    if (_displayName.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add your name.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final repo = ref.read(profileRepoProvider);
      String? avatarPath;
      if (_newAvatar != null) {
        final ext = _newAvatar!.path.split('.').last.toLowerCase();
        avatarPath = await repo.uploadAvatar(
          File(_newAvatar!.path),
          ext: ext.isEmpty ? 'jpg' : ext,
        );
      }
      String? nullIfEmpty(String s) => s.trim().isEmpty ? null : s.trim();
      await repo.updateProfile(
        displayName: _displayName.text.trim(),
        avatarUrl: avatarPath,
        role: nullIfEmpty(_role.text),
        company: nullIfEmpty(_company.text),
        industry: nullIfEmpty(_industry.text),
        intent: _intent,
        linkedinUrl: nullIfEmpty(_linkedin.text),
        bio: nullIfEmpty(_bio.text),
        homeAirport: _homeAirport.text.trim().isEmpty
            ? null
            : _homeAirport.text.trim().toUpperCase(),
      );
      ref.invalidate(myProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated.')),
        );
        context.pop();
      }
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
    if (!_loaded) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit profile')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: GestureDetector(
                onTap: _pickAvatar,
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    CircleAvatar(
                      radius: 52,
                      backgroundColor: FlyByeColors.secondary,
                      backgroundImage: _newAvatar != null
                          ? FileImage(File(_newAvatar!.path))
                          : (_existingAvatarUrl != null
                              ? CachedNetworkImageProvider(_existingAvatarUrl!)
                              : null) as ImageProvider<Object>?,
                      child: _newAvatar == null && _existingAvatarUrl == null
                          ? const Icon(Icons.camera_alt_outlined,
                              size: 32, color: FlyByeColors.muted,)
                          : null,
                    ),
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: FlyByeColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.edit,
                          size: 16, color: Colors.white,),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            _field(_displayName, 'Display name', maxLength: 60),
            _field(_role, 'Role / title', hint: 'e.g. Product Lead'),
            _field(_company, 'Company', hint: 'e.g. Acme Inc.'),
            _field(_industry, 'Industry', hint: 'e.g. Fintech, SaaS'),
            const SizedBox(height: 8),
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
            _field(_linkedin, 'LinkedIn URL',
                hint: 'https://linkedin.com/in/you',),
            _field(_bio, 'Bio',
                hint: 'Tell other professionals about yourself…',
                maxLines: 3,
                maxLength: 400,),
            _field(_homeAirport, 'Home airport', hint: 'e.g. LAX, JFK, LHR'),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white,),
                    )
                  : const Text('Save profile'),
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
