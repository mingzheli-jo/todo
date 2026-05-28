import 'package:flutter/material.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/widgets/task_card.dart';

class TaskListView extends StatelessWidget {
  const TaskListView({super.key, required this.tasks});

  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Center(
        child: Text(
          '还没有任务，点击 ➕ 创建一个',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      );
    }
    final byQuadrant = <Quadrant, List<Task>>{
      for (final q in Quadrant.values) q: [],
    };
    for (final t in tasks) {
      byQuadrant[t.quadrant]!.add(t);
    }
    final sections = [
      for (final q in Quadrant.values)
        if ((byQuadrant[q] ?? const []).isNotEmpty)
          (q, byQuadrant[q]!),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: sections.length,
      itemBuilder: (_, i) {
        final (q, items) = sections[i];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4, top: 4, bottom: 6),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: q.color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    q.label,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${items.length}',
                    style: TextStyle(
                      fontSize: 12,
                      color: q.color,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            for (final t in items) TaskCard(task: t),
            const SizedBox(height: 14),
          ],
        );
      },
    );
  }
}
