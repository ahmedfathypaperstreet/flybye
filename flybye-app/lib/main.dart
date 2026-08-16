import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'core/env.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  String? bootError;

  try {
    await dotenv.load();
  } catch (e) {
    bootError = 'dotenv.load failed: $e';
  }

  if (bootError == null) {
    try {
      await Supabase.initialize(
        url: Env.supabaseUrl,
        anonKey: Env.supabaseAnonKey,
        authOptions: const FlutterAuthClientOptions(
          authFlowType: AuthFlowType.pkce,
        ),
      );
    } catch (e) {
      bootError = 'Supabase.initialize failed: $e';
    }
  }

  if (bootError != null) {
    runApp(_BootErrorApp(message: bootError));
    return;
  }
  runApp(const ProviderScope(child: FlyByeApp()));
}

class _BootErrorApp extends StatelessWidget {
  const _BootErrorApp({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: const Color(0xFF0A1526),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Boot error',
                    style: TextStyle(
                      color: Colors.redAccent,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(message,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 14, height: 1.4)),
                ],
              ),
            ),
          ),
        ),
      );
}

class FlyByeApp extends ConsumerWidget {
  const FlyByeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'FlyBye',
      debugShowCheckedModeBanner: false,
      theme: FlyByeTheme.dark(),
      darkTheme: FlyByeTheme.dark(),
      // FlyBye is a dark-first navy theme (mirrors the web app). Both slots use
      // the same theme so every screen is readable regardless of the device's
      // brightness setting.
      themeMode: ThemeMode.dark,
      routerConfig: router,
    );
  }
}
