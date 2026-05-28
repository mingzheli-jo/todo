import 'package:flutter/material.dart';

enum PDCAPhase {
  plan('plan', 'P', '计划', Color(0xFF3b82f6)),
  doPhase('do', 'D', '执行', Color(0xFFf59e0b)),
  check('check', 'C', '检查', Color(0xFF8b5cf6)),
  act('act', 'A', '改进', Color(0xFF10b981));

  const PDCAPhase(this.wire, this.letter, this.label, this.color);
  final String wire;
  final String letter;
  final String label;
  final Color color;

  static PDCAPhase fromWire(String? value) {
    return PDCAPhase.values.firstWhere(
      (p) => p.wire == value,
      orElse: () => PDCAPhase.plan,
    );
  }
}

class Project {
  const Project({
    required this.id,
    required this.name,
    this.description,
    required this.color,
    required this.icon,
    required this.pdcaPhase,
    required this.pdcaCycle,
    required this.isArchived,
  });

  final String id;
  final String name;
  final String? description;
  final String color;
  final String icon;
  final PDCAPhase pdcaPhase;
  final int pdcaCycle;
  final bool isArchived;

  Color get displayColor {
    try {
      final hex = color.replaceAll('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } on Object {
      return const Color(0xFF6366f1);
    }
  }

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      color: json['color'] as String? ?? '#6366f1',
      icon: json['icon'] as String? ?? '📁',
      pdcaPhase: PDCAPhase.fromWire(json['pdca_phase'] as String?),
      pdcaCycle: (json['pdca_cycle'] as num?)?.toInt() ?? 1,
      isArchived: json['is_archived'] as bool? ?? false,
    );
  }
}

class PDCALog {
  const PDCALog({
    required this.id,
    required this.cycle,
    required this.phase,
    required this.content,
    this.outcome,
    required this.createdAt,
  });

  final String id;
  final int cycle;
  final PDCAPhase phase;
  final String content;
  final String? outcome;
  final DateTime createdAt;

  factory PDCALog.fromJson(Map<String, dynamic> json) {
    return PDCALog(
      id: json['id'] as String,
      cycle: (json['cycle'] as num).toInt(),
      phase: PDCAPhase.fromWire(json['phase'] as String?),
      content: json['content'] as String? ?? '',
      outcome: json['outcome'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
