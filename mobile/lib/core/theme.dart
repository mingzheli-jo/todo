import 'package:flutter/material.dart';

// Brand colors
const _kBrandPrimary = Color(0xFF6366f1);

// Quadrant accent colors
const kQuadrantRed = Color(0xFFef4444);
const kQuadrantAmber = Color(0xFFf59e0b);
const kQuadrantBlue = Color(0xFF3b82f6);
const kQuadrantGray = Color(0xFF6b7280);

// Dark surface colors
const _kDarkBackground = Color(0xFF0a0a0f);
const _kDarkSurface = Color(0xFF0f0f18);

// Light surface colors
const _kLightBackground = Color(0xFFfafaf9);

ThemeData get lightTheme {
  final base = ColorScheme.fromSeed(
    seedColor: _kBrandPrimary,
    brightness: Brightness.light,
  );
  return _buildTheme(base);
}

ThemeData get darkTheme {
  final base = ColorScheme.fromSeed(
    seedColor: _kBrandPrimary,
    brightness: Brightness.dark,
  ).copyWith(
    surface: _kDarkSurface,
    onSurface: Colors.white,
  );
  return _buildTheme(
    base,
    scaffoldBackground: _kDarkBackground,
    isDark: true,
  );
}

ThemeData _buildTheme(
  ColorScheme colorScheme, {
  Color? scaffoldBackground,
  bool isDark = false,
}) {
  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: scaffoldBackground ??
        (isDark ? _kDarkBackground : _kLightBackground),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor:
          isDark ? Colors.white : colorScheme.onSurface,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: isDark ? Colors.white : colorScheme.onSurface,
        fontFamily: 'sans-serif',
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor:
          isDark ? _kDarkSurface : colorScheme.surfaceContainerHighest,
      indicatorColor: const Color(0xFF8b5cf6).withValues(alpha: 0.2),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: Color(0xFF8b5cf6));
        }
        return IconThemeData(
          color: isDark
              ? Colors.white54
              : colorScheme.onSurfaceVariant,
        );
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            color: Color(0xFF8b5cf6),
            fontSize: 12,
            fontWeight: FontWeight.w600,
          );
        }
        return TextStyle(
          color: isDark ? Colors.white54 : colorScheme.onSurfaceVariant,
          fontSize: 12,
        );
      }),
    ),
    cardTheme: CardThemeData(
      elevation: isDark ? 0 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      color: isDark ? _kDarkSurface : Colors.white,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark
          ? Colors.white.withValues(alpha: 0.05)
          : Colors.black.withValues(alpha: 0.04),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.primary, width: 1.5),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _kBrandPrimary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        padding:
            const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    textTheme: TextTheme(
      bodyLarge: TextStyle(
        color: isDark ? Colors.white : Colors.black87,
        fontFamily: 'sans-serif',
      ),
      bodyMedium: TextStyle(
        color: isDark ? Colors.white70 : Colors.black54,
        fontFamily: 'sans-serif',
      ),
      titleLarge: TextStyle(
        color: isDark ? Colors.white : Colors.black87,
        fontWeight: FontWeight.w700,
        fontFamily: 'sans-serif',
      ),
      titleMedium: TextStyle(
        color: isDark ? Colors.white : Colors.black87,
        fontWeight: FontWeight.w600,
        fontFamily: 'sans-serif',
      ),
    ),
  );
}
