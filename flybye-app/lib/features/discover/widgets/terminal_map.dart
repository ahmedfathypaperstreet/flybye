import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/theme.dart';
import '../data/poi_repo.dart';

/// Visual metadata per POI category — colors/icons mirror the web TerminalMap.
class _CategoryMeta {
  const _CategoryMeta(this.label, this.color, this.icon);
  final String label;
  final Color color;
  final IconData icon;
}

const _categoryMeta = <String, _CategoryMeta>{
  'food': _CategoryMeta('Food & drinks', FlyByeColors.primary, Icons.restaurant),
  'lounge': _CategoryMeta('Lounges', FlyByeColors.accent, Icons.weekend),
  'shop': _CategoryMeta('Shops', Color(0xFFF2A93B), Icons.shopping_bag),
  'restroom': _CategoryMeta('Restrooms', Color(0xFF3FA9D6), Icons.wc),
  'info': _CategoryMeta('Info', Color(0xFFB05CD6), Icons.info_outline),
};

const _defaultOrder = ['food', 'lounge', 'shop', 'restroom', 'info'];

_CategoryMeta _metaFor(String category) =>
    _categoryMeta[category] ?? _categoryMeta['info']!;

/// Airport POI map for [iata], rendered with flutter_map + OSM raster tiles.
class TerminalMap extends ConsumerStatefulWidget {
  const TerminalMap({super.key, required this.iata});

  /// Airport IATA (`profiles.current_airport`), or null when the user has no
  /// current airport.
  final String? iata;

  @override
  ConsumerState<TerminalMap> createState() => _TerminalMapState();
}

class _TerminalMapState extends ConsumerState<TerminalMap> {
  final _mapController = MapController();

  AirportPois? _payload;
  bool _loading = false;
  bool _error = false;
  Poi? _selected;
  final Set<String> _activeFilters = {..._defaultOrder};

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void didUpdateWidget(TerminalMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.iata != widget.iata) _fetch();
  }

  Future<void> _fetch() async {
    final iata = widget.iata;
    if (iata == null || iata.isEmpty) return;

    final repo = ref.read(poiRepoProvider);
    // Show cached payload instantly if present.
    final cached = repo.cached(iata);
    setState(() {
      _loading = true;
      _error = false;
      if (cached != null) _payload = cached;
    });

    try {
      final data = await repo.fetch(iata);
      if (!mounted) return;
      setState(() {
        _payload = data;
        _loading = false;
      });
      _recenter();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _payload == null;
      });
    }
  }

  void _recenter() {
    final a = _payload?.airport;
    if (a == null) return;
    _mapController.move(LatLng(a.latitude, a.longitude), 14);
  }

  void _toggleFilter(String cat) {
    setState(() {
      if (_activeFilters.contains(cat)) {
        _activeFilters.remove(cat);
      } else {
        _activeFilters.add(cat);
      }
      if (_selected != null && !_activeFilters.contains(_selected!.category)) {
        _selected = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final iata = widget.iata;
    if (iata == null || iata.isEmpty) {
      return _shell(
        const _MapMessage(
          icon: Icons.flight_takeoff,
          text: 'Add a flight to load the terminal map.',
        ),
      );
    }

    final airport = _payload?.airport;
    final pois = _payload?.pois ?? const <Poi>[];

    if (_error && _payload == null) {
      return _shell(
        _MapMessage(
          icon: Icons.cloud_off,
          text: 'Couldn\'t load places right now.',
          action: TextButton(onPressed: _fetch, child: const Text('Retry')),
        ),
      );
    }

    if (airport == null) {
      return _shell(
        const Center(child: CircularProgressIndicator()),
      );
    }

    final counts = <String, int>{};
    for (final p in pois) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }

    final markers = pois
        .where((p) => _activeFilters.contains(p.category))
        .map(_buildMarker)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _shell(
          Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: LatLng(airport.latitude, airport.longitude),
                  initialZoom: 14,
                  onTap: (_, __) => setState(() => _selected = null),
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'app.flybye.flybye',
                  ),
                  MarkerLayer(markers: markers),
                ],
              ),
              // Airport label.
              Positioned(
                top: 10,
                left: 10,
                child: _Chip(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: airport.iata.isNotEmpty ? airport.iata : iata,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: FlyByeColors.foreground,
                            fontSize: 12,
                          ),
                        ),
                        if (airport.city != null && airport.city!.isNotEmpty)
                          TextSpan(
                            text: ' · ${airport.city}',
                            style: const TextStyle(
                              color: FlyByeColors.muted,
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              if (_loading)
                const Positioned(
                  top: 10,
                  right: 10,
                  child: _Chip(
                    child: SizedBox(
                      height: 14,
                      width: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              // Selected POI popup.
              if (_selected != null)
                Positioned(
                  left: 10,
                  right: 10,
                  bottom: 10,
                  child: _PoiPopup(
                    poi: _selected!,
                    onClose: () => setState(() => _selected = null),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // Category filter chips with counts.
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final cat in _defaultOrder)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _FilterChip(
                    meta: _metaFor(cat),
                    count: counts[cat] ?? 0,
                    active: _activeFilters.contains(cat),
                    onTap: () => _toggleFilter(cat),
                  ),
                ),
            ],
          ),
        ),
        if (pois.isEmpty && !_loading) ...[
          const SizedBox(height: 8),
          const Text(
            'No places found for this airport yet.',
            style: TextStyle(color: FlyByeColors.muted, fontSize: 12),
          ),
        ],
      ],
    );
  }

  Marker _buildMarker(Poi poi) {
    final meta = _metaFor(poi.category);
    return Marker(
      point: LatLng(poi.lat, poi.lon),
      width: 30,
      height: 30,
      child: GestureDetector(
        onTap: () => setState(() => _selected = poi),
        child: Container(
          decoration: BoxDecoration(
            color: meta.color,
            shape: BoxShape.circle,
            border: Border.all(color: FlyByeColors.bg, width: 2),
            boxShadow: const [
              BoxShadow(color: Colors.black38, blurRadius: 4),
            ],
          ),
          child: Icon(meta.icon, size: 15, color: Colors.white),
        ),
      ),
    );
  }

  Widget _shell(Widget child) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 280,
        decoration: BoxDecoration(
          color: FlyByeColors.secondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: FlyByeColors.border),
        ),
        child: child,
      ),
    );
  }
}

class _MapMessage extends StatelessWidget {
  const _MapMessage({required this.icon, required this.text, this.action});
  final IconData icon;
  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 40, color: FlyByeColors.muted),
            const SizedBox(height: 12),
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(color: FlyByeColors.muted),
            ),
            if (action != null) ...[const SizedBox(height: 8), action!],
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: FlyByeColors.card.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: FlyByeColors.border),
      ),
      child: child,
    );
  }
}

class _PoiPopup extends StatelessWidget {
  const _PoiPopup({required this.poi, required this.onClose});
  final Poi poi;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final meta = _metaFor(poi.category);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: FlyByeColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: FlyByeColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(color: meta.color, shape: BoxShape.circle),
            child: Icon(meta.icon, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  poi.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: FlyByeColors.foreground,
                  ),
                ),
                Text(
                  meta.label,
                  style: const TextStyle(
                      fontSize: 12, color: FlyByeColors.muted,),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            color: FlyByeColors.muted,
            onPressed: onClose,
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.meta,
    required this.count,
    required this.active,
    required this.onTap,
  });
  final _CategoryMeta meta;
  final int count;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: active ? 1 : 0.55,
      child: Material(
        color: active ? FlyByeColors.card : FlyByeColors.secondary,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: active ? FlyByeColors.border : FlyByeColors.border,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration:
                      BoxDecoration(color: meta.color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 6),
                Icon(meta.icon, size: 14, color: FlyByeColors.foreground),
                const SizedBox(width: 6),
                Text(
                  meta.label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: FlyByeColors.foreground,
                  ),
                ),
                if (count > 0)
                  Text(
                    ' ·$count',
                    style: const TextStyle(
                        fontSize: 12, color: FlyByeColors.muted,),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
