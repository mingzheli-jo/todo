import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/task_repository.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(ref.watch(dioClientProvider));
});

sealed class TasksState {
  const TasksState();
}

final class TasksLoading extends TasksState {
  const TasksLoading();
}

final class TasksLoaded extends TasksState {
  const TasksLoaded(this.tasks);
  final List<Task> tasks;
}

final class TasksError extends TasksState {
  const TasksError(this.message);
  final String message;
}

class TasksNotifier extends StateNotifier<TasksState> {
  TasksNotifier(this._repo) : super(const TasksLoading()) {
    load();
  }

  final TaskRepository _repo;

  Future<void> load() async {
    state = const TasksLoading();
    try {
      final tasks = await _repo.list();
      tasks.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      state = TasksLoaded(tasks);
    } on Object catch (e) {
      state = TasksError(_messageFor(e));
    }
  }

  Future<void> refresh() async {
    try {
      final tasks = await _repo.list();
      tasks.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      state = TasksLoaded(tasks);
    } on Object catch (e) {
      state = TasksError(_messageFor(e));
    }
  }

  Future<Task> create(TaskCreateInput input) async {
    final task = await _repo.create(input);
    final current = state;
    if (current is TasksLoaded) {
      state = TasksLoaded([task, ...current.tasks]);
    } else {
      await refresh();
    }
    return task;
  }

  Future<Task> update(String id, TaskUpdateInput input) async {
    final updated = await _repo.update(id, input);
    final current = state;
    if (current is TasksLoaded) {
      state = TasksLoaded([
        for (final t in current.tasks)
          if (t.id == id) updated else t,
      ]);
    } else {
      await refresh();
    }
    return updated;
  }

  Future<void> toggleStatus(Task task) async {
    final next = task.status == TaskStatus.done
        ? TaskStatus.todo
        : TaskStatus.done;
    await update(task.id, TaskUpdateInput(status: next));
  }

  Future<void> delete(String id) async {
    await _repo.delete(id);
    final current = state;
    if (current is TasksLoaded) {
      state = TasksLoaded(
        current.tasks.where((t) => t.id != id).toList(growable: false),
      );
    }
  }

  String _messageFor(Object error) {
    final text = error.toString();
    if (text.contains('SocketException') ||
        text.contains('connection') ||
        text.contains('timeout')) {
      return '网络连接失败，请检查网络';
    }
    return '加载失败，请稍后重试';
  }
}

final tasksProvider =
    StateNotifierProvider<TasksNotifier, TasksState>((ref) {
  return TasksNotifier(ref.watch(taskRepositoryProvider));
});
