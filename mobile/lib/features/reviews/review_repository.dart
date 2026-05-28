import 'package:intl/intl.dart';
import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/reviews/review_models.dart';

class ReviewRepository {
  const ReviewRepository(this._client);
  final DioClient _client;

  Future<Review> getToday() async {
    final response =
        await _client.get<Map<String, dynamic>>('/reviews/today');
    return Review.fromJson(response.data!);
  }

  Future<List<Review>> list({DateTime? startDate, DateTime? endDate}) async {
    final formatter = DateFormat('yyyy-MM-dd');
    final query = <String, dynamic>{};
    if (startDate != null) query['start_date'] = formatter.format(startDate);
    if (endDate != null) query['end_date'] = formatter.format(endDate);
    final response = await _client.get<List<dynamic>>(
      '/reviews',
      query: query.isEmpty ? null : query,
    );
    final items = response.data ?? const [];
    return items
        .map((e) => Review.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<Review> upsert({
    required DateTime date,
    required String rawContent,
    int? mood,
  }) async {
    final formatter = DateFormat('yyyy-MM-dd');
    final response = await _client.post<Map<String, dynamic>>(
      '/reviews',
      data: {
        'date': formatter.format(date),
        'raw_content': rawContent,
        if (mood != null) 'mood': mood,
      },
    );
    return Review.fromJson(response.data!);
  }

  Future<Review> patch(
    String reviewId, {
    String? rawContent,
    int? mood,
  }) async {
    final body = <String, dynamic>{};
    if (rawContent != null) body['raw_content'] = rawContent;
    if (mood != null) body['mood'] = mood;
    final response = await _client.patch<Map<String, dynamic>>(
      '/reviews/$reviewId',
      data: body,
    );
    return Review.fromJson(response.data!);
  }

  Future<String> triggerAI(String reviewId) async {
    final response = await _client.post<Map<String, dynamic>>(
      '/reviews/$reviewId/ai-process',
    );
    return response.data!['task_id'] as String;
  }

  Future<AIStatus> getAIStatus(String reviewId) async {
    final response = await _client.get<Map<String, dynamic>>(
      '/reviews/$reviewId/ai-status',
    );
    return AIStatus.fromJson(response.data!);
  }
}
