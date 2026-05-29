import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/features/memos/memo_provider.dart';

/// type: 'memo' | 'task' — 由桌面小部件深链传入
class QuickCaptureScreen extends ConsumerStatefulWidget {
  const QuickCaptureScreen({super.key, required this.type});
  final String type;

  @override
  ConsumerState<QuickCaptureScreen> createState() => _QuickCaptureScreenState();
}

class _QuickCaptureScreenState extends ConsumerState<QuickCaptureScreen> {
  final _controller = TextEditingController();
  bool _saving = false;

  bool get _isTask => widget.type == 'task';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _close() async {
    if (!mounted) return;
    // 关闭并退回桌面
    await SystemNavigator.pop();
  }

  Future<void> _save() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      if (_isTask) {
        // 复用现有 Dio + token 直接建任务
        await ref.read(dioClientProvider).post<Map<String, dynamic>>(
          '/tasks',
          data: {'title': text},
        );
      } else {
        await ref.read(memoRepositoryProvider).create(text);
      }
      await _close();
    } on Object catch (e) {
      debugPrint('QuickCapture save failed: $e');
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('保存失败，请检查网络后重试')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: 0.4),
      body: GestureDetector(
        onTap: _saving ? null : _close, // 点击空白处关闭
        child: Center(
          child: GestureDetector(
            onTap: () {}, // 吸收卡片内点击
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _isTask ? '快速新建任务' : '快速备忘',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _controller,
                    autofocus: true,
                    maxLines: 4,
                    minLines: 2,
                    decoration: InputDecoration(
                      hintText: _isTask ? '要做什么？' : '随手记点什么……',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      TextButton(onPressed: _close, child: const Text('取消')),
                      const Spacer(),
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(_saving ? '保存中…' : '保存'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
