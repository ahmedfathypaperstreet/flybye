import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';

/// A place of interest inside an airport, returned by the `airport-pois`
/// edge function.
class Poi {
  Poi({
    required this.id,
    required this.name,
    required this.category,
    required this.lat,
    required this.lon,
  });

  final String id;
  final String name;
  final String category;
  final double lat;
  final double lon;

  factory Poi.fromJson(Map<String, dynamic> json) => Poi(
        id: json['id']?.toString() ?? '',
        name: (json['name'] as String?) ?? 'Unknown',
        category: (json['category'] as String?) ?? 'info',
        lat: (json['lat'] as num).toDouble(),
        lon: (json['lon'] as num).toDouble(),
      );
}

/// Airport coordinates + metadata for centering the map.
class AirportInfo {
  AirportInfo({
    required this.iata,
    required this.latitude,
    required this.longitude,
    required this.name,
    required this.city,
  });

  final String iata;
  final double latitude;
  final double longitude;
  final String? name;
  final String? city;

  factory AirportInfo.fromJson(Map<String, dynamic> json) => AirportInfo(
        iata: (json['iata'] as String?) ?? '',
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        name: json['name'] as String?,
        city: json['city'] as String?,
      );
}

/// The combined `airport-pois` payload.
class AirportPois {
  AirportPois({required this.airport, required this.pois});
  final AirportInfo airport;
  final List<Poi> pois;
}

class PoiRepo {
  PoiRepo(this._client);
  final SupabaseClient _client;

  /// In-memory cache of the last successful payload per IATA.
  final Map<String, AirportPois> _cache = {};

  AirportPois? cached(String iata) => _cache[iata.toUpperCase()];

  /// Fetch POIs for [iata] via the `airport-pois` edge function. Prefers the
  /// `queryParameters` form; on failure falls back to the query-string form
  /// (older supabase_flutter builds).
  Future<AirportPois> fetch(String iata) async {
    final code = iata.toUpperCase();
    FunctionResponse res;
    try {
      res = await _client.functions.invoke(
        'airport-pois',
        queryParameters: {'iata': code},
        method: HttpMethod.get,
      );
    } catch (_) {
      res = await _client.functions.invoke(
        'airport-pois?iata=$code',
        method: HttpMethod.get,
      );
    }

    final data = res.data;
    if (data is! Map) {
      throw StateError('Unexpected airport-pois response');
    }
    final map = Map<String, dynamic>.from(data);
    final airport =
        AirportInfo.fromJson(Map<String, dynamic>.from(map['airport'] as Map));
    final pois = ((map['pois'] as List?) ?? const [])
        .map((e) => Poi.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
    final result = AirportPois(airport: airport, pois: pois);
    _cache[code] = result;
    return result;
  }
}

final poiRepoProvider = Provider<PoiRepo>(
  (ref) => PoiRepo(ref.watch(supabaseClientProvider)),
);
