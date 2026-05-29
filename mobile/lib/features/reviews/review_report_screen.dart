import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:toto/features/reviews/review_models.dart';
import 'package:toto/features/reviews/review_provider.dart';

class ReviewReportScreen extends ConsumerWidget {
  const ReviewReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(pastReviewsProvider);
    final selectedDays = ref.watch(reviewRangeProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('复盘报表')),
      body: reviews.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('加载失败')),
        data: (items) {
          final sorted = [...items]..sort((a, b) => b.date.compareTo(a.date));
          final withMood = sorted.where((r) => r.mood != null).toList().reversed.toList();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [7, 30, 90].map((days) {
                  final isSelected = selectedDays == days;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: isSelected
                        ? FilledButton(
                            onPressed: () => ref.read(reviewRangeProvider.notifier).state = days,
                            child: Text('近$days天'),
                          )
                        : OutlinedButton(
                            onPressed: () => ref.read(reviewRangeProvider.notifier).state = days,
                            child: Text('近$days天'),
                          ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              Text('心情趋势', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              SizedBox(
                height: 120,
                child: withMood.length < 2
                    ? const Center(child: Text('数据不足'))
                    : CustomPaint(painter: _MoodTrendPainter(withMood), size: Size.infinite),
              ),
              const SizedBox(height: 24),
              Text('历史复盘', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...sorted.map((r) => Card(
                    child: ListTile(
                      leading: Text(
                        r.mood == null ? '·' : moodEmojis[r.mood! - 1],
                        style: const TextStyle(fontSize: 22),
                      ),
                      title: Text(DateFormat('yyyy-MM-dd').format(r.date)),
                      subtitle: Text(
                        r.rawContent.isEmpty ? '（空）' : r.rawContent,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => _ReviewDetailScreen(review: r)),
                      ),
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }
}

class _MoodTrendPainter extends CustomPainter {
  _MoodTrendPainter(this.reviews);
  final List<Review> reviews;

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final dot = Paint()..color = const Color(0xFFA78BFA);
    final n = reviews.length;
    final dx = n == 1 ? 0.0 : size.width / (n - 1);
    final path = Path();
    for (var i = 0; i < n; i++) {
      final mood = reviews[i].mood!; // 1..5
      final x = dx * i;
      final y = size.height - ((mood - 1) / 4) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
      canvas.drawCircle(Offset(x, y), 3, dot);
    }
    canvas.drawPath(path, line);
  }

  @override
  // Always repaint — the painter receives a freshly-built list each time.
  bool shouldRepaint(covariant _MoodTrendPainter old) => true;
}

class _ReviewDetailScreen extends StatelessWidget {
  const _ReviewDetailScreen({required this.review});
  final Review review;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(DateFormat('yyyy-MM-dd').format(review.date))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (review.mood != null)
            Text('心情：${moodEmojis[review.mood! - 1]}', style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 12),
          Text('原始复盘', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(review.rawContent.isEmpty ? '（空）' : review.rawContent),
          if (review.aiPolished != null && review.aiPolished!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('AI 润色', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(review.aiPolished!),
          ],
        ],
      ),
    );
  }
}
