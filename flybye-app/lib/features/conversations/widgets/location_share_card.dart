import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme.dart';
import '../data/location_share_repo.dart';

/// Live lounge/terminal presence for one conversation — mirrors the web
/// `LocationShareCard`. Shows my share toggle (with terminal/zone/note fields)
/// and the other participant's active share live via a realtime stream.
class LocationShareCard extends ConsumerStatefulWidget {
  const LocationShareCard({
    super.key,
    required this.otherUserId,
    required this.defaultAirport,
  });

  /// The other participant — whose active share we display.
  final String otherUserId;

  /// My current airport (`profiles.current_airport`); falls back to my
  /// existing share airport when null.
  final String? defaultAirport;

  @override
  ConsumerState<LocationShareCard> createState() => _LocationShareCardState();
}

class _LocationShareCardState extends ConsumerState<LocationShareCard>
    with WidgetsBindingObserver {
  static const _heartbeat = Duration(seconds: 60);
  static const _pollFallback = Duration(seconds: 15);

  final _terminal = TextEditingController();
  final _zone = TextEditingController();
  final _note = TextEditingController();

  LocationShare? _myShare;
  LocationShare? _theirShare;
  bool _loading = true;
  bool _saving = false;

  Timer? _heartbeatTimer;
  Timer? _pollTimer;
  StreamSubscription<List<Map<String, dynamic>>>? _theirSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _subscribeToTheirShare();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    _pollTimer?.cancel();
    _theirSub?.cancel();
    _terminal.dispose();
    _zone.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Stop sharing when the app is backgrounded, mirroring the web behavior.
    if (state != AppLifecycleState.resumed &&
        (_myShare?.isActive ?? false)) {
      _deactivateOnBackground();
    }
  }

  Future<void> _deactivateOnBackground() async {
    final repo = ref.read(locationShareRepoProvider);
    try {
      await repo.deactivate();
    } catch (_) {
      // Best-effort; ignore failures on background.
    }
    _heartbeatTimer?.cancel();
    if (mounted) {
      setState(() {
        _myShare = _myShare == null
            ? null
            : LocationShare(
                userId: _myShare!.userId,
                airport: _myShare!.airport,
                terminal: _myShare!.terminal,
                zone: _myShare!.zone,
                note: _myShare!.note,
                isActive: false,
                lastSeenAt: _myShare!.lastSeenAt,
              );
      });
    }
  }

  Future<void> _load() async {
    final repo = ref.read(locationShareRepoProvider);
    try {
      final mine = await repo.myShare();
      final theirs = await repo.activeShareOf(widget.otherUserId);
      if (!mounted) return;
      setState(() {
        _myShare = mine;
        _theirShare = theirs;
        if (mine != null) {
          _terminal.text = mine.terminal ?? '';
          _zone.text = mine.zone ?? '';
          _note.text = mine.note ?? '';
          if (mine.isActive) _startHeartbeat();
        }
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _subscribeToTheirShare() {
    final repo = ref.read(locationShareRepoProvider);
    _theirSub = repo.shareStream(widget.otherUserId).listen(
      (rows) {
        if (!mounted) return;
        final active = rows
            .map(LocationShare.fromRow)
            .where((s) => s.isActive)
            .toList();
        setState(() => _theirShare = active.isEmpty ? null : active.first);
      },
      onError: (_) => _startPollFallback(),
    );
    // Belt-and-suspenders: a low-frequency poll in case realtime is unavailable.
    _startPollFallback();
  }

  void _startPollFallback() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollFallback, (_) async {
      final repo = ref.read(locationShareRepoProvider);
      try {
        final theirs = await repo.activeShareOf(widget.otherUserId);
        if (mounted) setState(() => _theirShare = theirs);
      } catch (_) {
        // Ignore transient poll errors.
      }
    });
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) async {
      try {
        await ref.read(locationShareRepoProvider).heartbeat();
      } catch (_) {
        // Ignore transient heartbeat errors.
      }
    });
  }

  String? get _airport => widget.defaultAirport ?? _myShare?.airport;

  Future<void> _persist({required bool isActive}) async {
    final airport = _airport;
    if (airport == null || airport.isEmpty) {
      _snack('Set your current airport (add a flight) first.');
      return;
    }
    setState(() => _saving = true);
    try {
      final saved = await ref.read(locationShareRepoProvider).upsert(
            airport: airport,
            isActive: isActive,
            terminal: _terminal.text,
            zone: _zone.text,
            note: _note.text,
          );
      if (!mounted) return;
      setState(() => _myShare = saved);
      if (saved.isActive) {
        _startHeartbeat();
      } else {
        _heartbeatTimer?.cancel();
      }
    } catch (e) {
      _snack('Couldn\'t update location. $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toggleActive(bool next) {
    if (next && (_airport == null || _airport!.isEmpty)) {
      _snack('Set your current airport (add a flight) first.');
      return;
    }
    _persist(isActive: next);
  }

  void _saveDetails() => _persist(isActive: _myShare?.isActive ?? true);

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
        padding: const EdgeInsets.all(16),
        decoration: _cardDecoration,
        child: const Center(
          child: SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    final isOn = _myShare?.isActive ?? false;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.all(14),
      decoration: _cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // My share toggle.
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: FlyByeColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.podcasts,
                  size: 18,
                  color: isOn ? FlyByeColors.primary : FlyByeColors.muted,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Share my terminal',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: FlyByeColors.foreground,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Only this contact can see it. Stops when you leave the app.',
                      style:
                          TextStyle(fontSize: 12, color: FlyByeColors.muted),
                    ),
                  ],
                ),
              ),
              Switch(
                value: isOn,
                onChanged: _saving ? null : _toggleActive,
              ),
            ],
          ),

          // Editable fields when sharing is on.
          if (isOn) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _CompactField(
                    controller: _terminal,
                    hint: 'Terminal (e.g. B)',
                    maxLength: 24,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _CompactField(
                    controller: _zone,
                    hint: 'Zone (e.g. Gate 12)',
                    maxLength: 40,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _CompactField(
              controller: _note,
              hint: 'Optional note (e.g. by the bookstore)',
              maxLength: 80,
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                onPressed: _saving ? null : _saveDetails,
                style: FilledButton.styleFrom(
                  backgroundColor:
                      FlyByeColors.primary.withValues(alpha: 0.12),
                  foregroundColor: FlyByeColors.primary,
                  minimumSize: const Size.fromHeight(40),
                ),
                child: Text(_saving ? 'Saving…' : 'Update spot'),
              ),
            ),
          ],

          // Partner share.
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          _TheirShare(share: _theirShare),
        ],
      ),
    );
  }

  static const _cardDecoration = BoxDecoration(
    color: FlyByeColors.card,
    borderRadius: BorderRadius.all(Radius.circular(16)),
    border: Border.fromBorderSide(BorderSide(color: FlyByeColors.border)),
  );
}

class _TheirShare extends StatelessWidget {
  const _TheirShare({required this.share});
  final LocationShare? share;

  @override
  Widget build(BuildContext context) {
    final s = share;
    if (s == null) {
      return const Text(
        'They aren\'t sharing their spot right now.',
        style: TextStyle(fontSize: 12, color: FlyByeColors.muted),
      );
    }
    final where = StringBuffer('They\'re at ${s.airport}');
    if (s.terminal != null && s.terminal!.isNotEmpty) {
      where.write(' · Terminal ${s.terminal}');
    }
    if (s.zone != null && s.zone!.isNotEmpty) {
      where.write(' · ${s.zone}');
    }
    final updated =
        s.lastSeenAt != null ? DateFormat.Hm().format(s.lastSeenAt!.toLocal()) : null;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: FlyByeColors.accent.withValues(alpha: 0.20),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.place, size: 18, color: FlyByeColors.accent),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                where.toString(),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: FlyByeColors.foreground,
                ),
              ),
              if (s.note != null && s.note!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  '"${s.note}"',
                  style:
                      const TextStyle(fontSize: 12, color: FlyByeColors.muted),
                ),
              ],
              if (updated != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Updated $updated',
                  style: const TextStyle(
                      fontSize: 11, color: FlyByeColors.muted,),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _CompactField extends StatelessWidget {
  const _CompactField({
    required this.controller,
    required this.hint,
    required this.maxLength,
  });
  final TextEditingController controller;
  final String hint;
  final int maxLength;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLength: maxLength,
      style: const TextStyle(fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        counterText: '',
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }
}
