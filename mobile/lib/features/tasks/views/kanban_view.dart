import 'package:flutter/material.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/widgets/task_card.dart';

class KanbanView extends StatelessWidget {
  const KanbanView({super.key, required this.tasks});

  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    const columns = [
      TaskStatus.todo,
      TaskStatus.inProgress,
      TaskStatus.done,
      TaskStatus.cancelled,
    ];
    final grouped = <TaskStatus, List<Task>>{
      for (final s in columns) s: [],
    };
    for (final t in tasks) {
      grouped[t.status]!.add(t);
    }
    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(10),
      children: [
        for (final status in columns)
          _KanbanColumn(status: status, tasks: grouped[status] ?? const []),
      ],
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  const _KanbanColumn({required this.status, required this.tasks});
  final TaskStatus status;
  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: 240,
      margin: const EdgeInsets.only(right: 10),
      decoration: BoxDecoration(
        color: theme.cardTheme.color ?? theme.cardColor,
        borderRadius: BorderRadius.circular(14),
      ),
      padding: const EdgeInsets.fromLTRB(10, 12, 10, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(status.icon, size: 16),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  status.label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: theme.dividerColor.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${tasks.length}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          Expanded(
            child: tasks.isEmpty
                ? Center(
                    child: Text(
                      '暂无任务',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontSize: 12,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    itemCount: tasks.length,
                    itemBuilder: (_, i) => TaskCard(task: tasks[i]),
                  ),
          ),
        ],
      ),
    );
  }
}
