import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/pomodoro/pomodoro_models.dart';
import 'package:toto/features/pomodoro/pomodoro_repository.dart';

final pomodoroRepositoryProvider = Provider<PomodoroRepository>((ref) {
  return PomodoroRepository(ref.watch(dioClientProvider));
});

sealed class PomodoroState {
  const PomodoroState({required this.stats});
  final PomodoroTodayStats stats;
}

final class PomodoroIdle extends PomodoroState {
  const PomodoroIdle({required super.stats});
}

final class PomodoroRunning extends PomodoroState {
  const PomodoroRunning({
    required super.stats,
    required this.session,
    required this.elapsedSec,
  });

  final PomodoroSession session;
  final int elapsedSec;

  int get totalSec => session.durationMin * 60;
  int get remainingSec {
    final r = totalSec - elapsedSec;
    return r < 0 ? 0 : r;
  }

  double get progress {
    if (totalSec <= 0) return 0;
    final p = elapsedSec / totalSec;
    return p > 1 ? 1 : p;
  }
}

final class PomodoroError extends PomodoroState {
  const PomodoroError({required super.stats, required this.message});
  final String message;
}

class PomodoroNotifier extends StateNotifier<PomodoroState> {
  PomodoroNotifier(this._repo)
      : super(PomodoroIdle(stats: PomodoroTodayStats.empty())) {
    _bootstrap();
  }

  final PomodoroRepository _repo;
  Timer? _ticker;

  Future<void> _bootstrap() async {
    try {
      final today = await _repo.today();
      final current = today.currentSession;
      if (current != null && current.isActive) {
        final elapsed = DateTime.now()
            .difference(current.startedAt.toLocal())
            .inSeconds;
        state = PomodoroRunning(
          stats: today,
          session: current,
          elapsedSec: elapsed < 0 ? 0 : elapsed,
        );
        _startTicker();
      } else {
        state = PomodoroIdle(stats: today);
      }
    } on Object {
      state = PomodoroIdle(stats: PomodoroTodayStats.empty());
    }
  }

  Future<void> refresh() async {
    try {
      final today = await _repo.today();
      final cur = state;
      if (cur is PomodoroRunning) {
        state = PomodoroRunning(
          stats: today,
          session: cur.session,
          elapsedSec: cur.elapsedSec,
        );
      } else {
        state = PomodoroIdle(stats: today);
      }
    } on Object {
      // Keep previous state on failure
    }
  }

  Future<void> start({int durationMin = 25}) async {
    if (state is PomodoroRunning) return;
    try {
      final session = await _repo.start(durationMin: durationMin);
      state = PomodoroRunning(
        stats: state.stats,
        session: session,
        elapsedSec: 0,
      );
      _startTicker();
    } on Object {
      state = PomodoroError(
        stats: state.stats,
        message: '启动失败，请重试',
      );
    }
  }

  Future<void> finish({required bool interrupted}) async {
    final cur = state;
    if (cur is! PomodoroRunning) return;
    _stopTicker();
    try {
      await _repo.complete(cur.session.id, interrupted: interrupted);
    } on Object {
      // Even if backend fails, return UI to idle to avoid lock
    }
    await refresh();
    if (state is PomodoroRunning) {
      state = PomodoroIdle(stats: state.stats);
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      final cur = state;
      if (cur is! PomodoroRunning) {
        _stopTicker();
        return;
      }
      final next = cur.elapsedSec + 1;
      state = PomodoroRunning(
        stats: cur.stats,
        session: cur.session,
        elapsedSec: next,
      );
      if (next >= cur.totalSec) {
        finish(interrupted: false);
      }
    });
  }

  void _stopTicker() {
    _ticker?.cancel();
    _ticker = null;
  }

  @override
  void dispose() {
    _stopTicker();
    super.dispose();
  }
}

final pomodoroProvider =
    StateNotifierProvider<PomodoroNotifier, PomodoroState>((ref) {
  return PomodoroNotifier(ref.watch(pomodoroRepositoryProvider));
});
