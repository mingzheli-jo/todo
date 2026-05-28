import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/okrs/okr_models.dart';
import 'package:toto/features/okrs/okr_repository.dart';

final okrRepositoryProvider = Provider<OKRRepository>((ref) {
  return OKRRepository(ref.watch(dioClientProvider));
});

final okrsProvider = FutureProvider<List<OKR>>((ref) async {
  return ref.watch(okrRepositoryProvider).list();
});
