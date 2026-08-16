import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: FlyByeColors.bgGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                Center(
                  child: SvgPicture.asset(
                    'brand/logos/logo-icon.svg',
                    width: 96,
                    height: 96,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'FlyBye',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 56,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -1.5,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Connect with professionals at your terminal.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    color: FlyByeColors.cloud,
                    height: 1.4,
                  ),
                ),
                const Spacer(flex: 2),
                FilledButton(
                  onPressed: () => context.push('/sign-up'),
                  child: const Text('Create account'),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.push('/sign-in'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(52),
                  ),
                  child: const Text('I already have an account'),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Verified business networking for travelers.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: FlyByeColors.cloud, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
