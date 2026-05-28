import 'package:flutter/material.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/widgets/task_card.dart';

class QuadrantView extends StatelessWidget {
  const QuadrantView({super.key, required this.tasks});

  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final byQuadrant = <Quadrant, List<Task>>{
      for (final q in Quadrant.values) q: [],
    };
    for (final t in tasks) {
      if (t.status == TaskStatus.done || t.status == TaskStatus.cancelled) {
        continue;
      }
      byQuadrant[t.quadrant]!.add(t);
    }
    return Padding(
      padding: const EdgeInsets.all(8),
      child: GridView.count(
        crossAxisCount: 2,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 0.78,
        children: [
          for (final q in Quadrant.values)
            _QuadrantCell(quadrant: q, tasks: byQuadrant[q] ?? const []),
        ],
      ),
    );
  }
}

class _QuadrantCell extends StatelessWidget {
  const _QuadrantCell({required this.quadrant, required this.tasks});
  final Quadrant quadrant;
  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.cardTheme.color ?? theme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: quadrant.color.withValues(alpha: 0.2),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(8, 10, 8, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: quadrant.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  quadrant.label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '${tasks.length}',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: quadrant.color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Divider(height: 1),
          Expanded(
            child: tasks.isEmpty
                ? Center(
                    child: Text(
                      '暂无任务',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontSize: 11,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    itemCount: tasks.length,
                    itemBuilder: (_, i) => TaskCard(
                      task: tasks[i],
                      dense: true,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
