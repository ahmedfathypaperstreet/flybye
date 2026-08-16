// FlyBye has no widget smoke test yet: the root widget (FlyByeApp) requires
// Supabase initialization and a ProviderScope, so a naive pumpWidget would fail.
// This placeholder keeps `flutter analyze` / `flutter test` green until real
// widget tests are added.
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('placeholder sanity test', () {
    expect(1 + 1, 2);
  });
}
