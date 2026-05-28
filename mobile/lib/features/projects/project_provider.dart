import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/projects/project_models.dart';
import 'package:toto/features/projects/project_repository.dart';

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepository(ref.watch(dioClientProvider));
});

final projectsProvider = FutureProvider<List<Project>>((ref) async {
  return ref.watch(projectRepositoryProvider).list();
});

final projectLogsProvider =
    FutureProvider.family<List<PDCALog>, String>((ref, projectId) async {
  return ref.watch(projectRepositoryProvider).getLogs(projectId);
});
