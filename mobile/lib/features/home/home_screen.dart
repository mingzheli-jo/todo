import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/core/theme.dart';

// ---------------------------------------------------------------------------
// Stats provider
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

  factory TodayStats.fromJson(Map<String, dynamic> json) => TodayStats(
        completed: json['completed'] as int? ?? 0,
        pending: json['pending'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
      );
}

final todayStatsProvider = FutureProvider<TodayStats>((ref) async {
  // Placeholder stats — Phase 7B will wire up the real /stats/today endpoint.
  ref.watch(authRepositoryProvider); // keep auth dependency for session scope
  return const TodayStats(completed: 0, pending: 0, total: 0);
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
    final statsAsync = ref.watch(todayStatsProvider);

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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Greeting
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
            // Today stats card
            Text(
              '今日统计',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            statsAsync.when(
              data: (stats) => _StatsRow(stats: stats),
              loading: () => const _StatsRowLoading(),
              error: (_, __) => const _StatsRowError(),
            ),
            const SizedBox(height: 24),
            // Quadrant placeholder
            Text(
              '四象限缩览',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            _QuadrantPreview(),
            const SizedBox(height: 24),
            // Habits placeholder
            Text(
              '今日习惯',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Phase 7B 即将实现',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ),
          ],
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
            label: '已完成',
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
            label: '总任务',
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

class _StatsRowError extends StatelessWidget {
  const _StatsRowError();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          '统计数据加载失败',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }
}

class _QuadrantPreview extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const quadrants = [
      ('紧急 & 重要', kQuadrantRed),
      ('重要 & 不急', kQuadrantAmber),
      ('紧急 & 不重要', kQuadrantBlue),
      ('不紧急 & 不重要', kQuadrantGray),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.8,
      children: [
        for (final (label, color) in quadrants)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          label,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    'Phase 7B',
                    style: TextStyle(
                      fontSize: 10,
                      color: color.withValues(alpha: 0.7),
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
