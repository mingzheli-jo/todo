import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/tasks/task_models.dart';

class TaskRepository {
  const TaskRepository(this._client);
  final DioClient _client;

  Future<List<Task>> list({Quadrant? quadrant, TaskStatus? status}) async {
    final query = <String, dynamic>{};
    if (quadrant != null) query['quadrant'] = quadrant.wire;
    if (status != null) query['status'] = status.wire;
    final response = await _client.get<List<dynamic>>(
      '/tasks',
      query: query.isEmpty ? null : query,
    );
    final items = response.data ?? const [];
    return items
        .map((e) => Task.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<Task> create(TaskCreateInput input) async {
    final response = await _client.post<Map<String, dynamic>>(
      '/tasks',
      data: input.toJson(),
    );
    return Task.fromJson(response.data!);
  }

  Future<Task> update(String id, TaskUpdateInput input) async {
    final response = await _client.patch<Map<String, dynamic>>(
      '/tasks/$id',
      data: input.toJson(),
    );
    return Task.fromJson(response.data!);
  }

  Future<void> delete(String id) async {
    await _client.delete<void>('/tasks/$id');
  }
}
