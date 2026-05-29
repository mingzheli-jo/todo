import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/memos/memo_provider.dart';

class MemoQuickAddSheet extends ConsumerStatefulWidget {
  const MemoQuickAddSheet({super.key});

  @override
  ConsumerState<MemoQuickAddSheet> createState() => _MemoQuickAddSheetState();
}

class _MemoQuickAddSheetState extends ConsumerState<MemoQuickAddSheet> {
  final _controller = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(memoRepositoryProvider).create(text);
      ref.invalidate(memoListProvider);
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (_) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
        left: 16, right: 16, top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('快速备忘', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            autofocus: true,
            maxLines: 4,
            minLines: 2,
            decoration: const InputDecoration(hintText: '随手记点什么……', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving ? const Text('保存中…') : const Text('记一条'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
