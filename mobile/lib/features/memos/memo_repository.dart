import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/memos/memo_models.dart';

class MemoRepository {
  const MemoRepository(this._client);
  final DioClient _client;

  Future<List<Memo>> list({MemoFilter filter = MemoFilter.open}) async {
    final status = filter == MemoFilter.open ? 'open' : 'all';
    final response = await _client.get<List<dynamic>>('/memos', query: {'status': status});
    final items = response.data ?? const [];
    return items.map((e) => Memo.fromJson(e as Map<String, dynamic>)).toList(growable: false);
  }

  Future<Memo> create(String content) async {
    final response = await _client.post<Map<String, dynamic>>('/memos', data: {'content': content});
    return Memo.fromJson(response.data!);
  }

  Future<Memo> setDone(String id, bool isDone) async {
    final response = await _client.patch<Map<String, dynamic>>('/memos/$id', data: {'is_done': isDone});
    return Memo.fromJson(response.data!);
  }

  Future<void> delete(String id) async {
    await _client.delete<dynamic>('/memos/$id');
  }

  Future<void> convert(String id, {String quadrant = 'neither'}) async {
    await _client.post<Map<String, dynamic>>('/memos/$id/convert', data: {'quadrant': quadrant});
  }
}
