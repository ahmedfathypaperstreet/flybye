import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/profile_repo.dart';

class ReportBlockSheet extends ConsumerStatefulWidget {
  const ReportBlockSheet({super.key, required this.otherId});
  final String otherId;

  static Future<void> show(BuildContext context, String otherId) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => ReportBlockSheet(otherId: otherId),
    );
  }

  @override
  ConsumerState<ReportBlockSheet> createState() => _ReportBlockSheetState();
}

class _ReportBlockSheetState extends ConsumerState<ReportBlockSheet> {
  String? _reason;
  final _details = TextEditingController();
  bool _busy = false;

  static const _reasons = <String>[
    'Spam or scam',
    'Harassment or threats',
    'Inappropriate content',
    'Fake or impersonation',
    'Other',
  ];

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit({required bool block}) async {
    if (_reason == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pick a reason.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final repo = ref.read(profileRepoProvider);
      await repo.reportUser(
        otherId: widget.otherId,
        reason: _reason!,
        details: _details.text.trim().isEmpty ? null : _details.text.trim(),
      );
      if (block) await repo.blockUser(widget.otherId);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(block
                ? 'Reported and blocked. Thanks for keeping FlyBye safe.'
                : 'Reported. Thanks for keeping FlyBye safe.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Report this person',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            for (final r in _reasons)
              RadioListTile<String>(
                title: Text(r),
                value: r,
                groupValue: _reason,
                onChanged: (v) => setState(() => _reason = v),
                contentPadding: EdgeInsets.zero,
              ),
            const SizedBox(height: 8),
            TextField(
              controller: _details,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Details (optional)',
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : () => _submit(block: true),
              style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
              child: const Text('Report and block'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _busy ? null : () => _submit(block: false),
              child: const Text('Report only'),
            ),
          ],
        ),
      ),
    );
  }
}
