class Memo {
  const Memo({
    required this.id,
    required this.content,
    required this.isDone,
    this.doneAt,
    this.taskId,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String content;
  final bool isDone;
  final DateTime? doneAt;
  final String? taskId;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Memo.fromJson(Map<String, dynamic> json) {
    return Memo(
      id: json['id'] as String,
      content: json['content'] as String? ?? '',
      isDone: json['is_done'] as bool? ?? false,
      doneAt: json['done_at'] == null ? null : DateTime.parse(json['done_at'] as String),
      taskId: json['task_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

enum MemoFilter { open, all }
