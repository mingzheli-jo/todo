import 'package:toto/core/api/dio_client.dart';
import 'package:toto/features/projects/project_models.dart';

class ProjectRepository {
  const ProjectRepository(this._client);
  final DioClient _client;

  Future<List<Project>> list({bool includeArchived = false}) async {
    final response = await _client.get<List<dynamic>>(
      '/projects',
      query: includeArchived ? {'include_archived': true} : null,
    );
    final items = response.data ?? const [];
    return items
        .map((e) => Project.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<List<PDCALog>> getLogs(String projectId) async {
    final response = await _client.get<List<dynamic>>(
      '/projects/$projectId/pdca/logs',
    );
    final items = response.data ?? const [];
    return items
        .map((e) => PDCALog.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }
}
