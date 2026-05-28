import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/tasks/task_provider.dart';
import 'package:toto/features/tasks/views/kanban_view.dart';
import 'package:toto/features/tasks/views/list_view.dart';
import 'package:toto/features/tasks/views/quadrant_view.dart';
import 'package:toto/features/tasks/widgets/task_form_sheet.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(tasksProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('任务'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '四象限'),
            Tab(text: '看板'),
            Tab(text: '列表'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: '刷新',
            onPressed: () => ref.read(tasksProvider.notifier).refresh(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
        child: switch (state) {
          TasksLoading() => const Center(child: CircularProgressIndicator()),
          TasksError(:final message) => _ErrorState(
              message: message,
              onRetry: () => ref.read(tasksProvider.notifier).load(),
            ),
          TasksLoaded(:final tasks) => TabBarView(
              controller: _tabController,
              children: [
                QuadrantView(tasks: tasks),
                KanbanView(tasks: tasks),
                TaskListView(tasks: tasks),
              ],
            ),
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openCreateSheet(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openCreateSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const TaskFormSheet(),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
      children: [
        Icon(
          Icons.cloud_off,
          size: 56,
          color: Theme.of(context).colorScheme.error,
        ),
        const SizedBox(height: 12),
        Text(
          message,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: 16),
        Center(
          child: FilledButton.tonal(
            onPressed: onRetry,
            child: const Text('重试'),
          ),
        ),
      ],
    );
  }
}
