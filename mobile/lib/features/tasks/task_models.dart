import 'package:flutter/material.dart';
import 'package:toto/core/theme.dart';

enum Quadrant {
  urgentImportant('urgent_important', '紧急 & 重要', kQuadrantRed),
  important('important', '重要 & 不急', kQuadrantAmber),
  urgent('urgent', '紧急 & 不重要', kQuadrantBlue),
  neither('neither', '不紧急 & 不重要', kQuadrantGray);

  const Quadrant(this.wire, this.label, this.color);
  final String wire;
  final String label;
  final Color color;

  static Quadrant fromWire(String? value) {
    return Quadrant.values.firstWhere(
      (q) => q.wire == value,
      orElse: () => Quadrant.neither,
    );
  }
}

enum TaskStatus {
  todo('todo', '待办', Icons.radio_button_unchecked),
  inProgress('in_progress', '进行中', Icons.timelapse),
  done('done', '已完成', Icons.check_circle),
  cancelled('cancelled', '已取消', Icons.cancel);

  const TaskStatus(this.wire, this.label, this.icon);
  final String wire;
  final String label;
  final IconData icon;

  static TaskStatus fromWire(String? value) {
    return TaskStatus.values.firstWhere(
      (s) => s.wire == value,
      orElse: () => TaskStatus.todo,
    );
  }
}

class Task {
  const Task({
    required this.id,
    required this.title,
    required this.quadrant,
    required this.status,
    this.description,
    this.dueDate,
    this.projectId,
    this.priority = 0,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final String? description;
  final Quadrant quadrant;
  final TaskStatus status;
  final DateTime? dueDate;
  final String? projectId;
  final int priority;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isDone => status == TaskStatus.done;

  factory Task.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? raw) {
      if (raw == null) return null;
      return DateTime.tryParse(raw as String);
    }

    return Task(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      quadrant: Quadrant.fromWire(json['quadrant'] as String?),
      status: TaskStatus.fromWire(json['status'] as String?),
      dueDate: parseDate(json['due_date']),
      projectId: json['project_id'] as String?,
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      completedAt: parseDate(json['completed_at']),
      createdAt: parseDate(json['created_at']) ?? DateTime.now(),
      updatedAt: parseDate(json['updated_at']) ?? DateTime.now(),
    );
  }

  Task copyWith({
    String? title,
    String? description,
    Quadrant? quadrant,
    TaskStatus? status,
    DateTime? dueDate,
    String? projectId,
    bool clearDueDate = false,
  }) {
    return Task(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      quadrant: quadrant ?? this.quadrant,
      status: status ?? this.status,
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      projectId: projectId ?? this.projectId,
      priority: priority,
      completedAt: completedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class TaskCreateInput {
  const TaskCreateInput({
    required this.title,
    this.description,
    this.quadrant = Quadrant.neither,
    this.dueDate,
    this.projectId,
  });

  final String title;
  final String? description;
  final Quadrant quadrant;
  final DateTime? dueDate;
  final String? projectId;

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      if (description != null && description!.isNotEmpty)
        'description': description,
      'quadrant': quadrant.wire,
      if (dueDate != null) 'due_date': dueDate!.toUtc().toIso8601String(),
      if (projectId != null) 'project_id': projectId,
    };
  }
}

class TaskUpdateInput {
  const TaskUpdateInput({
    this.title,
    this.description,
    this.quadrant,
    this.status,
    this.dueDate,
    this.clearDueDate = false,
  });

  final String? title;
  final String? description;
  final Quadrant? quadrant;
  final TaskStatus? status;
  final DateTime? dueDate;
  final bool clearDueDate;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (title != null) map['title'] = title;
    if (description != null) map['description'] = description;
    if (quadrant != null) map['quadrant'] = quadrant!.wire;
    if (status != null) map['status'] = status!.wire;
    if (clearDueDate) {
      map['due_date'] = null;
    } else if (dueDate != null) {
      map['due_date'] = dueDate!.toUtc().toIso8601String();
    }
    return map;
  }
}
