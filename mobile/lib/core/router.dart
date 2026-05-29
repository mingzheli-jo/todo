import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/auth/login_screen.dart';
import 'package:toto/features/habits/habits_screen.dart';
import 'package:toto/features/memos/memos_screen.dart';
import 'package:toto/features/home/home_screen.dart';
import 'package:toto/features/okrs/okrs_screen.dart';
import 'package:toto/features/pomodoro/pomodoro_screen.dart';
import 'package:toto/features/profile/profile_screen.dart';
import 'package:toto/features/projects/projects_screen.dart';
import 'package:toto/features/quick_capture/quick_capture_screen.dart';
import 'package:toto/features/reviews/reviews_screen.dart';
import 'package:toto/features/settings/settings_screen.dart';
import 'package:toto/features/tasks/tasks_screen.dart';
import 'package:toto/shell/root_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (BuildContext context, GoRouterState state) {
      final isAuthenticated = switch (authState) {
        AuthAuthenticated() => true,
        _ => false,
      };
      final isUnknown = authState is AuthUnknown;
      final loggingIn = state.matchedLocation == '/login';

      // Still determining auth state — wait
      if (isUnknown) return null;

      if (!isAuthenticated && !loggingIn) return '/login';
      if (isAuthenticated && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/quick',
        builder: (_, state) => QuickCaptureScreen(
          type: state.uri.queryParameters['type'] == 'task' ? 'task' : 'memo',
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => RootShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path: '/tasks',
            builder: (_, __) => const TasksScreen(),
          ),
          GoRoute(
            path: '/pomodoro',
            builder: (_, __) => const PomodoroScreen(),
          ),
          GoRoute(
            path: '/habits',
            builder: (_, __) => const HabitsScreen(),
          ),
          GoRoute(
            path: '/reviews',
            builder: (_, __) => const ReviewsScreen(),
          ),
          GoRoute(
            path: '/okrs',
            builder: (_, __) => const OKRsScreen(),
          ),
          GoRoute(
            path: '/projects',
            builder: (_, __) => const ProjectsScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (_, __) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/memos',
            builder: (_, __) => const MemosScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
