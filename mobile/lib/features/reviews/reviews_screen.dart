import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:toto/features/reviews/review_models.dart';
import 'package:toto/features/reviews/review_provider.dart';

class ReviewsScreen extends ConsumerStatefulWidget {
  const ReviewsScreen({super.key});

  @override
  ConsumerState<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends ConsumerState<ReviewsScreen> {
  final _controller = TextEditingController();
  bool _initialised = false;
  String _lastSaved = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(todayReviewProvider);

    if (today is TodayReviewLoaded && !_initialised) {
      _controller.text = today.review.rawContent;
      _lastSaved = today.review.rawContent;
      _initialised = true;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('每日复盘'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(todayReviewProvider),
          ),
          IconButton(
            tooltip: '复盘报表',
            icon: const Icon(Icons.insights_outlined),
            onPressed: () => context.push('/review-report'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(todayReviewProvider.notifier).load();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _TodayCard(state: today, controller: _controller, onSave: _save),
          ],
        ),
      ),
    );
  }

  void _save() {
    final text = _controller.text;
    if (text == _lastSaved) return;
    _lastSaved = text;
    ref.read(todayReviewProvider.notifier).saveContent(content: text);
  }
}

class _TodayCard extends ConsumerWidget {
  const _TodayCard({
    required this.state,
    required this.controller,
    required this.onSave,
  });

  final TodayReviewState state;
  final TextEditingController controller;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final today = DateFormat('yyyy 年 M 月 d 日').format(DateTime.now());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.today_rounded, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  '今日复盘 · $today',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (state is TodayReviewLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (state is TodayReviewError) ...[
              Text(
                (state as TodayReviewError).message,
                style: TextStyle(color: theme.colorScheme.error),
              ),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () =>
                    ref.read(todayReviewProvider.notifier).load(),
                child: const Text('重试'),
              ),
            ] else if (state is TodayReviewLoaded) ...[
              _MoodSelector(
                mood: (state as TodayReviewLoaded).review.mood,
                onChanged: (m) => ref
                    .read(todayReviewProvider.notifier)
                    .saveContent(mood: m),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                minLines: 5,
                maxLines: 10,
                onChanged: (_) => onSave(),
                decoration: const InputDecoration(
                  hintText: '今天发生了什么？做得好的、要改进的、明天计划…',
                ),
              ),
              const SizedBox(height: 12),
              _AISection(state: state as TodayReviewLoaded),
            ],
          ],
        ),
      ),
    );
  }
}

class _MoodSelector extends StatelessWidget {
  const _MoodSelector({required this.mood, required this.onChanged});
  final int? mood;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '心情',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(width: 12),
        for (var i = 0; i < 5; i++) ...[
          GestureDetector(
            onTap: () => onChanged(i + 1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: mood == i + 1
                    ? Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: 0.2)
                    : Colors.transparent,
                shape: BoxShape.circle,
              ),
              child: Text(moodEmojis[i], style: const TextStyle(fontSize: 22)),
            ),
          ),
          if (i != 4) const SizedBox(width: 4),
        ],
      ],
    );
  }
}

class _AISection extends ConsumerWidget {
  const _AISection({required this.state});
  final TodayReviewLoaded state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    switch (state.aiState) {
      case AIStatusState.idle:
        return Row(
          children: [
            const Icon(Icons.auto_awesome_outlined, size: 18),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                '写完后让 AI 帮你润色 + 提炼',
                style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
            ),
            FilledButton.tonalIcon(
              icon: const Icon(Icons.auto_awesome, size: 16),
              label: const Text('AI 处理'),
              onPressed: state.review.rawContent.trim().isEmpty
                  ? null
                  : () => ref
                      .read(todayReviewProvider.notifier)
                      .triggerAI(),
            ),
          ],
        );
      case AIStatusState.processing:
        return Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 10),
            Text(
              'AI 正在处理…',
              style: theme.textTheme.bodyMedium,
            ),
          ],
        );
      case AIStatusState.ready:
        if (state.aiPolished == null || state.aiPolished!.isEmpty) {
          return const SizedBox.shrink();
        }
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color:
                theme.colorScheme.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.auto_awesome,
                    size: 16,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'AI 润色',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                state.aiPolished!,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        );
    }
  }
}
