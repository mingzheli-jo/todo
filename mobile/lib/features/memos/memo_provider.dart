import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/memos/memo_models.dart';
import 'package:toto/features/memos/memo_repository.dart';

final memoRepositoryProvider = Provider<MemoRepository>((ref) {
  return MemoRepository(ref.watch(dioClientProvider));
});

final memoFilterProvider = StateProvider<MemoFilter>((ref) => MemoFilter.open);

final memoListProvider = FutureProvider<List<Memo>>((ref) async {
  final repo = ref.watch(memoRepositoryProvider);
  final filter = ref.watch(memoFilterProvider);
  return repo.list(filter: filter);
});
