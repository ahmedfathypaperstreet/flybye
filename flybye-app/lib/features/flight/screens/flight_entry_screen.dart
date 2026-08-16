import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';
import '../../../core/theme.dart';
import '../../discover/data/discover_repo.dart';
import '../../profile/data/profile_repo.dart';

/// Enter an itinerary. After saving we mirror the active leg into the profile's
/// presence fields (`current_airport` = layover ?? departure, `present_until` =
/// arrival) so discovery can surface us.
class FlightEntryScreen extends ConsumerStatefulWidget {
  const FlightEntryScreen({super.key});
  @override
  ConsumerState<FlightEntryScreen> createState() => _FlightEntryScreenState();
}

class _FlightEntryScreenState extends ConsumerState<FlightEntryScreen> {
  final _flightNo = TextEditingController();
  final _from = TextEditingController();
  final _to = TextEditingController();
  final _layoverAirport = TextEditingController();
  final _layoverMinutes = TextEditingController();
  DateTime? _departure;
  DateTime? _arrival;
  bool _hasLayover = false;
  bool _busy = false;

  @override
  void dispose() {
    _flightNo.dispose();
    _from.dispose();
    _to.dispose();
    _layoverAirport.dispose();
    _layoverMinutes.dispose();
    super.dispose();
  }

  Future<DateTime?> _pickDateTime(DateTime? initial) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial ?? now,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 60)),
    );
    if (date == null) return null;
    if (!mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial ?? now),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _save() async {
    final from = _from.text.trim().toUpperCase();
    final to = _to.text.trim().toUpperCase();
    if (from.isEmpty || to.isEmpty || _departure == null || _arrival == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Fill in from, to, departure and arrival.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final client = ref.read(supabaseClientProvider);
      final uid = client.auth.currentUser!.id;

      final layoverAirport = _hasLayover && _layoverAirport.text.trim().isNotEmpty
          ? _layoverAirport.text.trim().toUpperCase()
          : null;
      final layoverMinutes =
          _hasLayover ? int.tryParse(_layoverMinutes.text.trim()) : null;

      // Replace any existing itinerary for this user (single active leg model).
      await client.from('flights').delete().eq('user_id', uid);
      await client.from('flights').insert({
        'user_id': uid,
        'flight_number':
            _flightNo.text.trim().isEmpty ? null : _flightNo.text.trim().toUpperCase(),
        'departure_airport': from,
        'arrival_airport': to,
        'departure_time': _departure!.toUtc().toIso8601String(),
        'arrival_time': _arrival!.toUtc().toIso8601String(),
        'layover_airport': layoverAirport,
        'layover_duration_minutes': layoverMinutes,
      });

      // Mirror the active leg into profile presence.
      await client.from('profiles').update({
        'current_airport': layoverAirport ?? from,
        'present_until': _arrival!.toUtc().toIso8601String(),
      }).eq('id', uid);

      ref.invalidate(myProfileProvider);
      ref.invalidate(discoverFeedProvider);
      if (mounted) context.go('/discover');
    } on PostgrestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your itinerary')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'Add your flight so we can show you professionals at your airport.',
              style: TextStyle(color: FlyByeColors.muted),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _flightNo,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'Flight number (optional)',
                hintText: 'AA1234',
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _from,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'From',
                      hintText: 'LAX',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _to,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'To',
                      hintText: 'JFK',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _DateTimeField(
              label: 'Departure',
              value: _departure,
              onTap: () async {
                final v = await _pickDateTime(_departure);
                if (v != null) setState(() => _departure = v);
              },
            ),
            const SizedBox(height: 12),
            _DateTimeField(
              label: 'Arrival',
              value: _arrival,
              onTap: () async {
                final v = await _pickDateTime(_arrival);
                if (v != null) setState(() => _arrival = v);
              },
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Has a layover?'),
              value: _hasLayover,
              onChanged: (v) => setState(() => _hasLayover = v),
            ),
            if (_hasLayover)
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _layoverAirport,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'Layover airport',
                        hintText: 'DXB',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _layoverMinutes,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Duration (min)',
                        hintText: '180',
                      ),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Save itinerary'),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateTimeField extends StatelessWidget {
  const _DateTimeField({
    required this.label,
    required this.value,
    required this.onTap,
  });
  final String label;
  final DateTime? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Text(
          value == null
              ? 'Tap to pick'
              : value!.toLocal().toString().substring(0, 16),
          style: TextStyle(
            color:
                value == null ? FlyByeColors.muted : FlyByeColors.foreground,
          ),
        ),
      ),
    );
  }
}
