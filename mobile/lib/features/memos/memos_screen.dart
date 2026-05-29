import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/memos/memo_models.dart';
import 'package:toto/features/memos/memo_provider.dart';

class MemosScreen extends ConsumerWidget {
  const MemosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(memoFilterProvider);
    final memos = ref.watch(memoListProvider);
    final repo = ref.read(memoRepositoryProvider);

    Future<void> refresh() async => ref.invalidate(memoListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('速记收集箱'),
        actions: [
          PopupMenuButton<MemoFilter>(
            initialValue: filter,
            onSelected: (f) => ref.read(memoFilterProvider.notifier).state = f,
            itemBuilder: (_) => const [
              PopupMenuItem(value: MemoFilter.open, child: Text('未处理')),
              PopupMenuItem(value: MemoFilter.all, child: Text('全部')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: memos.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: const [Padding(padding: EdgeInsets.all(24), child: Text('加载失败，下拉重试'))]),
          data: (items) {
            if (items.isEmpty) {
              return ListView(children: const [Padding(padding: EdgeInsets.all(48), child: Center(child: Text('暂无备忘')))]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final m = items[i];
                return Dismissible(
                  key: ValueKey(m.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    color: Colors.red.withValues(alpha: 0.2),
                    child: const Icon(Icons.delete_outline),
                  ),
                  onDismissed: (_) async {
                    await repo.delete(m.id);
                    ref.invalidate(memoListProvider);
                  },
                  child: Card(
                    child: ListTile(
                      leading: Checkbox(
                        value: m.isDone,
                        onChanged: (_) async {
                          await repo.setDone(m.id, !m.isDone);
                          ref.invalidate(memoListProvider);
                        },
                      ),
                      title: Text(
                        m.content,
                        style: TextStyle(
                          decoration: m.isDone ? TextDecoration.lineThrough : null,
                          color: m.isDone ? Theme.of(context).disabledColor : null,
                        ),
                      ),
                      trailing: m.isDone
                          ? null
                          : TextButton(
                              onPressed: () async {
                                await repo.convert(m.id);
                                ref.invalidate(memoListProvider);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('已转为任务')),
                                  );
                                }
                              },
                              child: const Text('转任务'),
                            ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
