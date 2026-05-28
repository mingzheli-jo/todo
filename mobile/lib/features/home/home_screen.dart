import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/core/theme.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/task_provider.dart';

// ---------------------------------------------------------------------------
// Today stats — derived from tasks provider
// ---------------------------------------------------------------------------

class TodayStats {
  const TodayStats({
    required this.completed,
    required this.pending,
    required this.total,
  });

  final int completed;
  final int pending;
  final int total;
}

final todayStatsProvider = Provider<TodayStats>((ref) {
  final state = ref.watch(tasksProvider);
  if (state is! TasksLoaded) {
    return const TodayStats(completed: 0, pending: 0, total: 0);
  }
  final now = DateTime.now();
  final startOfDay = DateTime(now.year, now.month, now.day);
  final endOfDay = startOfDay.add(const Duration(days: 1));
  int completed = 0;
  int pending = 0;
  for (final t in state.tasks) {
    final completedToday = t.completedAt != null &&
        t.completedAt!.isAfter(startOfDay) &&
        t.completedAt!.isBefore(endOfDay);
    if (completedToday) completed++;
    if (t.status == TaskStatus.todo || t.status == TaskStatus.inProgress) {
      pending++;
    }
  }
  return TodayStats(
    completed: completed,
    pending: pending,
    total: completed + pending,
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final username = switch (authState) {
      AuthAuthenticated(:final user) => user.username,
      _ => '',
    };
    final stats = ref.watch(todayStatsProvider);
    final tasksState = ref.watch(tasksProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('首页'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF6366f1),
              child: Text(
                username.isEmpty ? '?' : username[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '你好，$username',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 4),
              Text(
                '今天也要专注完成重要的事',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              Text(
                '今日统计',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              if (tasksState is TasksLoading)
                const _StatsRowLoading()
              else
                _StatsRow(stats: stats),
              const SizedBox(height: 24),
              Row(
                children: [
                  Text(
                    '四象限缩览',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/tasks'),
                    child: const Text('查看全部'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _QuadrantSummary(state: tasksState),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats});
  final TodayStats stats;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: '今日完成',
            value: stats.completed.toString(),
            color: const Color(0xFF6366f1),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: '待处理',
            value: stats.pending.toString(),
            color: kQuadrantAmber,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: '总活跃',
            value: stats.total.toString(),
            color: kQuadrantBlue,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsRowLoading extends StatelessWidget {
  const _StatsRowLoading();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(child: SizedBox(height: 80, child: Card())),
        SizedBox(width: 10),
        Expanded(child: SizedBox(height: 80, child: Card())),
        SizedBox(width: 10),
        Expanded(child: SizedBox(height: 80, child: Card())),
      ],
    );
  }
}

class _QuadrantSummary extends StatelessWidget {
  const _QuadrantSummary({required this.state});
  final TasksState state;

  @override
  Widget build(BuildContext context) {
    final counts = <Quadrant, int>{
      for (final q in Quadrant.values) q: 0,
    };
    if (state is TasksLoaded) {
      for (final t in (state as TasksLoaded).tasks) {
        if (t.status == TaskStatus.todo ||
            t.status == TaskStatus.inProgress) {
          counts[t.quadrant] = (counts[t.quadrant] ?? 0) + 1;
        }
      }
    }
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.9,
      children: [
        for (final q in Quadrant.values)
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: q.color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          q.label,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    '${counts[q] ?? 0}',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: q.color,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
