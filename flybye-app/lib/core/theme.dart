import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// FlyBye palette — navy/blue business-networking theme, mirrored from the web
/// app (`flybye-webapp/src/index.css`). Dark-first: the deep navy background is
/// the canonical surface and every in-app screen is readable on it.
class FlyByeColors {
  // Core surfaces
  static const Color bg = Color(0xFF0A1526); // hsl(224 55% 8%) — deep navy
  static const Color card = Color(0xFF122033); // hsl(216 45% 13%)
  static const Color surface = Color(0xFF152538);
  static const Color secondary = Color(0xFF1C2C3F); // hsl(214 38% 18%)
  static const Color border = Color(0xFF243142); // hsl(214 30% 20%)

  // Brand
  static const Color primary = Color(0xFF4A90D9); // hsl(209 52% 52%)
  static const Color primaryDeep = Color(0xFF3A73AE);
  static const Color accent = Color(0xFF9FB6D0); // hsl(212 34% 72%) steel blue

  // Text
  static const Color foreground = Color(0xFFE7EDF3); // hsl(212 32% 93%)
  static const Color muted = Color(0xFF8798AB); // hsl(212 18% 60%)

  // Status
  static const Color danger = Color(0xFFCF3B30); // hsl(4 62% 50%)
  static const Color success = Color(0xFF34D399);
  static const Color warning = Color(0xFFFBBF24);

  // ── Legacy aliases (kept so any stray references keep compiling) ──
  static const Color midnightStart = bg;
  static const Color midnight = card;
  static const Color cyan = primary;
  static const Color cyanDeep = primaryDeep;
  static const Color sky = accent;
  static const Color cloud = foreground;
  static const Color slate = muted;

  static LinearGradient get bgGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [bg, card],
      );

  static LinearGradient get accentGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [primary, primaryDeep],
      );
}

class FlyByeTheme {
  static const _scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: FlyByeColors.primary,
    onPrimary: Colors.white,
    secondary: FlyByeColors.accent,
    onSecondary: FlyByeColors.bg,
    error: FlyByeColors.danger,
    onError: Colors.white,
    surface: FlyByeColors.card,
    onSurface: FlyByeColors.foreground,
    surfaceContainerHighest: FlyByeColors.secondary,
    onSurfaceVariant: FlyByeColors.muted,
    outline: FlyByeColors.border,
  );

  static ThemeData _build(ColorScheme scheme) {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      colorScheme: scheme,
      scaffoldBackgroundColor: FlyByeColors.bg,
      canvasColor: FlyByeColors.bg,
      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
        bodyColor: FlyByeColors.foreground,
        displayColor: FlyByeColors.foreground,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: FlyByeColors.bg,
        foregroundColor: FlyByeColors.foreground,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: const CardThemeData(
        color: FlyByeColors.card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      dividerTheme: const DividerThemeData(
        color: FlyByeColors.border,
        space: 1,
        thickness: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: FlyByeColors.secondary,
        selectedColor: FlyByeColors.primary,
        labelStyle: const TextStyle(color: FlyByeColors.foreground),
        side: const BorderSide(color: FlyByeColors.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: FlyByeColors.card,
        indicatorColor: FlyByeColors.primary.withValues(alpha: 0.20),
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: states.contains(WidgetState.selected)
                ? FlyByeColors.primary
                : FlyByeColors.muted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? FlyByeColors.primary
                : FlyByeColors.muted,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: FlyByeColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: FlyByeColors.secondary,
          disabledForegroundColor: FlyByeColors.muted,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: FlyByeColors.primary),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: FlyByeColors.foreground,
          side: const BorderSide(color: FlyByeColors.border),
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: FlyByeColors.muted,
        textColor: FlyByeColors.foreground,
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: FlyByeColors.secondary,
        contentTextStyle: TextStyle(color: FlyByeColors.foreground),
        behavior: SnackBarBehavior.floating,
      ),
      dialogTheme: const DialogThemeData(
        backgroundColor: FlyByeColors.card,
        surfaceTintColor: Colors.transparent,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: FlyByeColors.card,
        surfaceTintColor: Colors.transparent,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: FlyByeColors.secondary,
        hintStyle: const TextStyle(color: FlyByeColors.muted),
        labelStyle: const TextStyle(color: FlyByeColors.muted),
        floatingLabelStyle: const TextStyle(color: FlyByeColors.primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: FlyByeColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: FlyByeColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: FlyByeColors.primary, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }

  /// The app is dark-first; light() returns the same navy theme so the app is
  /// readable regardless of the platform brightness setting.
  static ThemeData dark() => _build(_scheme);
  static ThemeData light() => _build(_scheme);
}
