import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/habits/habit_models.dart';
import 'package:toto/features/habits/habit_provider.dart';

class HabitsScreen extends ConsumerWidget {
  const HabitsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(habitsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('习惯打卡'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(habitsProvider.notifier).refresh(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(habitsProvider.notifier).refresh(),
        child: switch (state) {
          HabitsLoading() => const Center(child: CircularProgressIndicator()),
          HabitsError(:final message) => _ErrorState(
              message: message,
              onRetry: () => ref.read(habitsProvider.notifier).load(),
            ),
          HabitsLoaded(:final items) => items.isEmpty
              ? const _EmptyState()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _HabitCard(item: items[i]),
                ),
        },
      ),
    );
  }
}

class _HabitCard extends ConsumerWidget {
  const _HabitCard({required this.item});
  final HabitWithWeek item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final habit = item.habit;
    final theme = Theme.of(context);
    final today = DateTime.now();
    final weekStart = today.subtract(const Duration(days: 6));

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: habit.displayColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      habit.icon,
                      style: const TextStyle(fontSize: 18),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        habit.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${habit.frequency.label} · 本周 ${item.weekCompletionCount}/7',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                _CheckButton(
                  completed: item.completedToday,
                  color: habit.displayColor,
                  onPressed: () => ref
                      .read(habitsProvider.notifier)
                      .toggleToday(habit.id),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _WeekGrid(
              last7: item.last7,
              weekStart: weekStart,
              color: habit.displayColor,
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckButton extends StatelessWidget {
  const _CheckButton({
    required this.completed,
    required this.color,
    required this.onPressed,
  });

  final bool completed;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(22),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: completed ? color : Colors.transparent,
          shape: BoxShape.circle,
          border: Border.all(
            color: completed ? color : color.withValues(alpha: 0.4),
            width: 2,
          ),
        ),
        child: Icon(
          Icons.check_rounded,
          color: completed ? Colors.white : color.withValues(alpha: 0.5),
          size: 22,
        ),
      ),
    );
  }
}

class _WeekGrid extends StatelessWidget {
  const _WeekGrid({
    required this.last7,
    required this.weekStart,
    required this.color,
  });

  final List<bool> last7;
  final DateTime weekStart;
  final Color color;

  static const _weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (var i = 0; i < 7; i++)
          Column(
            children: [
              _DayCell(
                completed: last7[i],
                color: color,
                isToday: i == 6,
              ),
              const SizedBox(height: 4),
              Text(
                _labelFor(weekStart.add(Duration(days: i))),
                style: TextStyle(
                  fontSize: 10,
                  color: i == 6
                      ? color
                      : Theme.of(context).textTheme.bodyMedium?.color,
                  fontWeight: i == 6 ? FontWeight.w700 : FontWeight.normal,
                ),
              ),
            ],
          ),
      ],
    );
  }

  String _labelFor(DateTime d) {
    // Mon=1..Sun=7
    final idx = (d.weekday - 1).clamp(0, 6);
    return _weekdayLabels[idx];
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.completed,
    required this.color,
    required this.isToday,
  });

  final bool completed;
  final Color color;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: completed ? color : color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: isToday
            ? Border.all(
                color: color,
                width: 1.5,
              )
            : null,
      ),
      child: completed
          ? const Icon(
              Icons.check_rounded,
              color: Colors.white,
              size: 16,
            )
          : null,
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
      children: [
        Icon(
          Icons.event_repeat_outlined,
          size: 64,
          color:
              Theme.of(context).colorScheme.primary.withValues(alpha: 0.6),
        ),
        const SizedBox(height: 16),
        Text(
          '还没有习惯',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          '请到 Web 端创建你的第一个习惯',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
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
