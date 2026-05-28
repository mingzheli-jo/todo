import 'package:intl/intl.dart';
import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/habits/habit_models.dart';

class HabitRepository {
  const HabitRepository(this._client);
  final DioClient _client;

  Future<List<HabitTodayStatus>> listToday() async {
    final response =
        await _client.get<List<dynamic>>('/habits/today');
    final items = response.data ?? const [];
    return items
        .map((e) => HabitTodayStatus.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<List<HabitRecord>> getRecords(
    String habitId, {
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final formatter = DateFormat('yyyy-MM-dd');
    final response = await _client.get<List<dynamic>>(
      '/habits/$habitId/records',
      query: {
        'start_date': formatter.format(startDate),
        'end_date': formatter.format(endDate),
      },
    );
    final items = response.data ?? const [];
    return items
        .map((e) => HabitRecord.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<HabitRecord> checkIn(
    String habitId, {
    bool completed = true,
    DateTime? date,
  }) async {
    final body = <String, dynamic>{'completed': completed};
    if (date != null) {
      body['date'] = DateFormat('yyyy-MM-dd').format(date);
    }
    final response = await _client.post<Map<String, dynamic>>(
      '/habits/$habitId/check-in',
      data: body,
    );
    return HabitRecord.fromJson(response.data!);
  }
}
