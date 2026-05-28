import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/habits/habit_models.dart';
import 'package:toto/features/habits/habit_repository.dart';

final habitRepositoryProvider = Provider<HabitRepository>((ref) {
  return HabitRepository(ref.watch(dioClientProvider));
});

sealed class HabitsState {
  const HabitsState();
}

final class HabitsLoading extends HabitsState {
  const HabitsLoading();
}

final class HabitsLoaded extends HabitsState {
  const HabitsLoaded(this.items);
  final List<HabitWithWeek> items;
}

final class HabitsError extends HabitsState {
  const HabitsError(this.message);
  final String message;
}

class HabitsNotifier extends StateNotifier<HabitsState> {
  HabitsNotifier(this._repo) : super(const HabitsLoading()) {
    load();
  }

  final HabitRepository _repo;

  Future<void> load() async {
    state = const HabitsLoading();
    try {
      final result = await _fetchAll();
      state = HabitsLoaded(result);
    } on Object catch (e) {
      state = HabitsError(_messageFor(e));
    }
  }

  Future<void> refresh() async {
    try {
      final result = await _fetchAll();
      state = HabitsLoaded(result);
    } on Object catch (e) {
      state = HabitsError(_messageFor(e));
    }
  }

  Future<List<HabitWithWeek>> _fetchAll() async {
    final today = DateTime.now();
    final todayStart = DateTime(today.year, today.month, today.day);
    final weekStart = todayStart.subtract(const Duration(days: 6));

    final statuses = await _repo.listToday();
    if (statuses.isEmpty) return const [];

    final recordsLists = await Future.wait(
      statuses.map((s) => _repo.getRecords(
            s.habit.id,
            startDate: weekStart,
            endDate: todayStart,
          )),
    );

    final result = <HabitWithWeek>[];
    for (var i = 0; i < statuses.length; i++) {
      final status = statuses[i];
      final records = recordsLists[i];
      final completedDates = <String>{};
      for (final r in records) {
        if (r.completed) {
          completedDates.add(_dateKey(r.date));
        }
      }
      final last7 = <bool>[];
      for (var d = 0; d < 7; d++) {
        final day = weekStart.add(Duration(days: d));
        last7.add(completedDates.contains(_dateKey(day)));
      }
      result.add(HabitWithWeek(
        habit: status.habit,
        completedToday: status.completedToday,
        last7: last7,
      ));
    }
    return result;
  }

  Future<void> toggleToday(String habitId) async {
    final current = state;
    if (current is! HabitsLoaded) return;

    final idx = current.items.indexWhere((h) => h.habit.id == habitId);
    if (idx == -1) return;

    final entry = current.items[idx];
    final newCompleted = !entry.completedToday;

    // Optimistic update
    final updatedLast7 = [...entry.last7];
    updatedLast7[updatedLast7.length - 1] = newCompleted;
    final optimisticItems = [...current.items];
    optimisticItems[idx] = HabitWithWeek(
      habit: entry.habit,
      completedToday: newCompleted,
      last7: updatedLast7,
    );
    state = HabitsLoaded(optimisticItems);

    try {
      await _repo.checkIn(habitId, completed: newCompleted);
    } on Object {
      // Rollback on failure
      final rollback = [...optimisticItems];
      rollback[idx] = entry;
      state = HabitsLoaded(rollback);
    }
  }

  String _dateKey(DateTime d) {
    final local = d.toLocal();
    return '${local.year}-${local.month}-${local.day}';
  }

  String _messageFor(Object error) {
    final text = error.toString();
    if (text.contains('SocketException') ||
        text.contains('timeout') ||
        text.contains('connection')) {
      return '网络连接失败，请检查网络';
    }
    return '加载失败，请稍后重试';
  }
}

final habitsProvider =
    StateNotifierProvider<HabitsNotifier, HabitsState>((ref) {
  return HabitsNotifier(ref.watch(habitRepositoryProvider));
});
