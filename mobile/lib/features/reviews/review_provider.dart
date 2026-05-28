import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/reviews/review_models.dart';
import 'package:toto/features/reviews/review_repository.dart';

final reviewRepositoryProvider = Provider<ReviewRepository>((ref) {
  return ReviewRepository(ref.watch(dioClientProvider));
});

sealed class TodayReviewState {
  const TodayReviewState();
}

final class TodayReviewLoading extends TodayReviewState {
  const TodayReviewLoading();
}

final class TodayReviewLoaded extends TodayReviewState {
  const TodayReviewLoaded({
    required this.review,
    required this.aiState,
    this.aiPolished,
  });
  final Review review;
  final AIStatusState aiState;
  final String? aiPolished;
}

final class TodayReviewError extends TodayReviewState {
  const TodayReviewError(this.message);
  final String message;
}

class TodayReviewNotifier extends StateNotifier<TodayReviewState> {
  TodayReviewNotifier(this._repo) : super(const TodayReviewLoading()) {
    load();
  }

  final ReviewRepository _repo;
  Timer? _pollTimer;

  Future<void> load() async {
    state = const TodayReviewLoading();
    try {
      final review = await _repo.getToday();
      final status = await _repo.getAIStatus(review.id);
      state = TodayReviewLoaded(
        review: review,
        aiState: status.state,
        aiPolished: status.aiPolished ?? review.aiPolished,
      );
      if (status.state == AIStatusState.processing) {
        _startPolling(review.id);
      }
    } on Object catch (e) {
      state = TodayReviewError(_messageFor(e));
    }
  }

  Future<void> saveContent({String? content, int? mood}) async {
    final cur = state;
    if (cur is! TodayReviewLoaded) return;
    try {
      final updated = await _repo.patch(
        cur.review.id,
        rawContent: content,
        mood: mood,
      );
      state = TodayReviewLoaded(
        review: updated,
        aiState: cur.aiState,
        aiPolished: cur.aiPolished,
      );
    } on Object {
      // swallow save errors for now
    }
  }

  Future<void> triggerAI() async {
    final cur = state;
    if (cur is! TodayReviewLoaded) return;
    if (cur.review.rawContent.trim().isEmpty) return;
    try {
      await _repo.triggerAI(cur.review.id);
      state = TodayReviewLoaded(
        review: cur.review,
        aiState: AIStatusState.processing,
        aiPolished: null,
      );
      _startPolling(cur.review.id);
    } on Object {
      // ignore
    }
  }

  void _startPolling(String reviewId) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      try {
        final status = await _repo.getAIStatus(reviewId);
        final cur = state;
        if (cur is! TodayReviewLoaded) {
          _pollTimer?.cancel();
          return;
        }
        if (status.state != AIStatusState.processing) {
          state = TodayReviewLoaded(
            review: cur.review,
            aiState: status.state,
            aiPolished: status.aiPolished,
          );
          _pollTimer?.cancel();
        }
      } on Object {
        // ignore poll errors
      }
    });
  }

  String _messageFor(Object e) {
    final s = e.toString();
    if (s.contains('SocketException') || s.contains('timeout')) {
      return '网络连接失败，请检查网络';
    }
    return '加载失败，请稍后重试';
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}

final todayReviewProvider =
    StateNotifierProvider<TodayReviewNotifier, TodayReviewState>((ref) {
  return TodayReviewNotifier(ref.watch(reviewRepositoryProvider));
});

final pastReviewsProvider = FutureProvider<List<Review>>((ref) async {
  final repo = ref.watch(reviewRepositoryProvider);
  final now = DateTime.now();
  final start = DateTime(now.year, now.month, now.day)
      .subtract(const Duration(days: 30));
  return repo.list(startDate: start, endDate: now);
});
