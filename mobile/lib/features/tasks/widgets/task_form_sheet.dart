import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:toto/features/tasks/task_models.dart';
import 'package:toto/features/tasks/task_provider.dart';

class TaskFormSheet extends ConsumerStatefulWidget {
  const TaskFormSheet({super.key, this.initialTask});

  final Task? initialTask;

  @override
  ConsumerState<TaskFormSheet> createState() => _TaskFormSheetState();
}

class _TaskFormSheetState extends ConsumerState<TaskFormSheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  late Quadrant _quadrant;
  DateTime? _dueDate;
  bool _submitting = false;
  String? _errorMessage;

  bool get _isEditing => widget.initialTask != null;

  @override
  void initState() {
    super.initState();
    final t = widget.initialTask;
    _titleController = TextEditingController(text: t?.title ?? '');
    _descController = TextEditingController(text: t?.description ?? '');
    _quadrant = t?.quadrant ?? Quadrant.neither;
    _dueDate = t?.dueDate;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _errorMessage = '请输入任务标题');
      return;
    }
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final notifier = ref.read(tasksProvider.notifier);
      if (_isEditing) {
        await notifier.update(
          widget.initialTask!.id,
          TaskUpdateInput(
            title: title,
            description: _descController.text.trim(),
            quadrant: _quadrant,
            dueDate: _dueDate,
            clearDueDate: _dueDate == null,
          ),
        );
      } else {
        await notifier.create(
          TaskCreateInput(
            title: title,
            description: _descController.text.trim().isEmpty
                ? null
                : _descController.text.trim(),
            quadrant: _quadrant,
            dueDate: _dueDate,
          ),
        );
      }
      if (mounted) Navigator.pop(context);
    } on Object catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _errorMessage = _readableError(e);
        });
      }
    }
  }

  String _readableError(Object e) {
    final s = e.toString();
    if (s.contains('SocketException') || s.contains('timeout')) {
      return '网络连接失败，请检查网络';
    }
    return '保存失败，请重试';
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final initial = _dueDate ?? now.add(const Duration(hours: 1));
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return;
    setState(() {
      _dueDate = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dueText = _dueDate == null
        ? '设置截止时间'
        : DateFormat('yyyy-MM-dd HH:mm').format(_dueDate!);

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _isEditing ? '编辑任务' : '新建任务',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _submitting
                      ? null
                      : () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _titleController,
              autofocus: !_isEditing,
              decoration: const InputDecoration(
                labelText: '标题',
                hintText: '今天要做什么？',
              ),
              maxLength: 120,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              decoration: const InputDecoration(
                labelText: '描述（可选）',
                hintText: '补充细节、备注',
              ),
              maxLines: 3,
              maxLength: 500,
            ),
            const SizedBox(height: 12),
            Text(
              '象限',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final q in Quadrant.values)
                  ChoiceChip(
                    label: Text(q.label),
                    selected: _quadrant == q,
                    onSelected: _submitting
                        ? null
                        : (_) => setState(() => _quadrant = q),
                    selectedColor: q.color.withValues(alpha: 0.25),
                    side: BorderSide(
                      color: _quadrant == q
                          ? q.color
                          : theme.dividerColor,
                      width: _quadrant == q ? 1.5 : 1,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              icon: Icon(
                _dueDate == null ? Icons.schedule : Icons.event,
                size: 18,
              ),
              label: Text(dueText),
              onPressed: _submitting ? null : _pickDueDate,
              style: OutlinedButton.styleFrom(
                alignment: Alignment.centerLeft,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            if (_dueDate != null)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  icon: const Icon(Icons.clear, size: 14),
                  label: const Text('清除截止时间'),
                  onPressed: _submitting
                      ? null
                      : () => setState(() => _dueDate = null),
                ),
              ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                style: TextStyle(
                  color: theme.colorScheme.error,
                  fontSize: 13,
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_isEditing ? '保存' : '创建'),
            ),
          ],
        ),
      ),
    );
  }
}
