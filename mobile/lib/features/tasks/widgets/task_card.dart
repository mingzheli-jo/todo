import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/task_provider.dart';
import 'package:toto/features/tasks/widgets/task_form_sheet.dart';

class TaskCard extends ConsumerWidget {
  const TaskCard({super.key, required this.task, this.dense = false});

  final Task task;
  final bool dense;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDone = task.isDone;
    final dueDate = task.dueDate;
    final dueText = dueDate == null
        ? null
        : DateFormat('MM-dd HH:mm').format(dueDate.toLocal());
    final overdue = dueDate != null &&
        !isDone &&
        dueDate.isBefore(DateTime.now());

    return Card(
      margin: EdgeInsets.symmetric(vertical: dense ? 3 : 5),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _openEdit(context),
        onLongPress: () => _confirmDelete(context, ref),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: dense ? 10 : 12,
            vertical: dense ? 8 : 10,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () => ref.read(tasksProvider.notifier).toggleStatus(task),
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(
                    task.status.icon,
                    size: dense ? 18 : 22,
                    color: isDone ? task.quadrant.color : theme.iconTheme.color,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: dense ? 13 : 14,
                        fontWeight: FontWeight.w600,
                        decoration: isDone ? TextDecoration.lineThrough : null,
                        color: isDone
                            ? theme.textTheme.bodyMedium?.color
                            : theme.textTheme.bodyLarge?.color,
                      ),
                    ),
                    if (task.description != null &&
                        task.description!.isNotEmpty &&
                        !dense) ...[
                      const SizedBox(height: 4),
                      Text(
                        task.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontSize: 12,
                        ),
                      ),
                    ],
                    if (dueText != null) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            size: 12,
                            color: overdue
                                ? Theme.of(context).colorScheme.error
                                : theme.textTheme.bodyMedium?.color,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            dueText,
                            style: TextStyle(
                              fontSize: 11,
                              color: overdue
                                  ? Theme.of(context).colorScheme.error
                                  : theme.textTheme.bodyMedium?.color,
                              fontWeight: overdue
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Container(
                width: 4,
                height: 36,
                decoration: BoxDecoration(
                  color: task.quadrant.color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openEdit(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => TaskFormSheet(initialTask: task),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除任务？'),
        content: Text(task.title),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(tasksProvider.notifier).delete(task.id);
    }
  }
}
