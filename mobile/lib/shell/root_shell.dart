import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:toto/features/tasks/widgets/task_form_sheet.dart';

class RootShell extends StatelessWidget {
  const RootShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final selectedIndex = _locationToIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => _onNavTap(context, index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: '首页',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_outlined),
            selectedIcon: Icon(Icons.task_rounded),
            label: '任务',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline_rounded),
            selectedIcon: Icon(Icons.add_circle_rounded),
            label: '添加',
          ),
          NavigationDestination(
            icon: Icon(Icons.timer_outlined),
            selectedIcon: Icon(Icons.timer_rounded),
            label: '专注',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: '我的',
          ),
        ],
      ),
    );
  }

  void _onNavTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/');
      case 1:
        context.go('/tasks');
      case 2:
        _showQuickAdd(context);
      case 3:
        context.go('/pomodoro');
      case 4:
        context.go('/profile');
    }
  }

  void _showQuickAdd(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const TaskFormSheet(),
    );
  }

  int _locationToIndex(String location) {
    if (location == '/tasks') return 1;
    if (location == '/pomodoro') return 3;
    // Pages reachable from profile tab keep the profile tab highlighted
    if (location == '/profile' ||
        location == '/reviews' ||
        location == '/habits' ||
        location == '/okrs' ||
        location == '/projects' ||
        location == '/settings') {
      return 4;
    }
    return 0; // '/' → home
  }
}

