import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/okrs/okr_models.dart';

class OKRRepository {
  const OKRRepository(this._client);
  final DioClient _client;

  Future<List<OKR>> list({String? period, OKRStatus? status}) async {
    final query = <String, dynamic>{};
    if (period != null) query['period'] = period;
    if (status != null) query['status'] = status.wire;
    final response = await _client.get<List<dynamic>>(
      '/okrs',
      query: query.isEmpty ? null : query,
    );
    final items = response.data ?? const [];
    return items
        .map((e) => OKR.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }
}
