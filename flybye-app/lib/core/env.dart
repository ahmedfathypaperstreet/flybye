import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Read once at startup; everything else reads from these getters.
class Env {
  static String get supabaseUrl => dotenv.env['SUPABASE_URL']!;
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY']!;
}
