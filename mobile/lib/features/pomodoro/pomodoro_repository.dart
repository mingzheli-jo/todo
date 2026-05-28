import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/pomodoro/pomodoro_models.dart';

class PomodoroRepository {
  const PomodoroRepository(this._client);
  final DioClient _client;

  Future<PomodoroSession> start({int durationMin = 25, String? taskId}) async {
    final response = await _client.post<Map<String, dynamic>>(
      '/pomodoro/start',
      data: {
        'duration_min': durationMin,
        if (taskId != null) 'task_id': taskId,
      },
    );
    return PomodoroSession.fromJson(response.data!);
  }

  Future<PomodoroSession> complete(String sessionId,
      {bool interrupted = false}) async {
    final response = await _client.post<Map<String, dynamic>>(
      '/pomodoro/$sessionId/complete',
      data: {'interrupted': interrupted},
    );
    return PomodoroSession.fromJson(response.data!);
  }

  Future<PomodoroTodayStats> today() async {
    final response =
        await _client.get<Map<String, dynamic>>('/pomodoro/today');
    return PomodoroTodayStats.fromJson(response.data!);
  }

  Future<PomodoroSession?> current() async {
    final response =
        await _client.get<Map<String, dynamic>?>('/pomodoro/current');
    if (response.data == null) return null;
    return PomodoroSession.fromJson(response.data!);
  }
}
