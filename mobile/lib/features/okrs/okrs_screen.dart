import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/okrs/okr_models.dart';
import 'package:toto/features/okrs/okr_provider.dart';

class OKRsScreen extends ConsumerWidget {
  const OKRsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(okrsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('目标 OKR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(okrsProvider),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(okrsProvider.future),
        child: async.when(
          data: (items) {
            if (items.isEmpty) return const _EmptyState();
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _OKRCard(okr: items[i]),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => const _ErrorState(),
        ),
      ),
    );
  }
}

class _OKRCard extends StatelessWidget {
  const _OKRCard({required this.okr});
  final OKR okr;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isObjective = okr.type == OKRType.objective;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  isObjective
                      ? Icons.flag_rounded
                      : Icons.checklist_rounded,
                  color: theme.colorScheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    okr.title,
                    style: TextStyle(
                      fontSize: isObjective ? 15 : 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _StatusChip(status: okr.status),
              ],
            ),
            if (okr.description != null && okr.description!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                okr.description!,
                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                if (okr.period.isNotEmpty) ...[
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 12,
                    color: theme.textTheme.bodyMedium?.color,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    okr.period,
                    style: TextStyle(
                      fontSize: 11,
                      color: theme.textTheme.bodyMedium?.color,
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: _ProgressBar(percent: okr.progress / 100),
                ),
                const SizedBox(width: 8),
                Text(
                  '${okr.progress}%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
            if (okr.children.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 10),
              for (final kr in okr.children) _KRRow(kr: kr),
            ],
          ],
        ),
      ),
    );
  }
}

class _KRRow extends StatelessWidget {
  const _KRRow({required this.kr});
  final OKR kr;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 28,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  kr.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Expanded(child: _ProgressBar(percent: kr.progress / 100)),
                    const SizedBox(width: 8),
                    Text(
                      '${kr.progress}%',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: theme.textTheme.bodyMedium?.color,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.percent});
  final double percent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LinearProgressIndicator(
        value: percent.clamp(0, 1),
        minHeight: 6,
        backgroundColor: theme.dividerColor.withValues(alpha: 0.3),
        valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final OKRStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      OKRStatus.active => Theme.of(context).colorScheme.primary,
      OKRStatus.completed => const Color(0xFF10b981),
      OKRStatus.cancelled => Theme.of(context).disabledColor,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
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
          Icons.flag_outlined,
          size: 64,
          color:
              Theme.of(context).colorScheme.primary.withValues(alpha: 0.6),
        ),
        const SizedBox(height: 16),
        Text(
          '还没有 OKR',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          '请到 Web 端创建你的第一个目标',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState();
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
          '加载失败，请重试',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ],
    );
  }
}
