class Review {
  const Review({
    required this.id,
    required this.date,
    required this.rawContent,
    this.mood,
    this.aiPolished,
    this.aiStructured,
    this.aiTaskId,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final DateTime date;
  final String rawContent;
  final int? mood;
  final String? aiPolished;
  final Map<String, dynamic>? aiStructured;
  final String? aiTaskId;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      rawContent: json['raw_content'] as String? ?? '',
      mood: (json['mood'] as num?)?.toInt(),
      aiPolished: json['ai_polished'] as String?,
      aiStructured: json['ai_structured'] as Map<String, dynamic>?,
      aiTaskId: json['ai_task_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

enum AIStatusState {
  idle('idle'),
  processing('processing'),
  ready('ready');

  const AIStatusState(this.wire);
  final String wire;

  static AIStatusState fromWire(String? value) {
    return AIStatusState.values.firstWhere(
      (s) => s.wire == value,
      orElse: () => AIStatusState.idle,
    );
  }
}

class AIStatus {
  const AIStatus({
    required this.state,
    this.aiPolished,
    this.aiStructured,
  });

  final AIStatusState state;
  final String? aiPolished;
  final Map<String, dynamic>? aiStructured;

  factory AIStatus.fromJson(Map<String, dynamic> json) {
    return AIStatus(
      state: AIStatusState.fromWire(json['status'] as String?),
      aiPolished: json['ai_polished'] as String?,
      aiStructured: json['ai_structured'] as Map<String, dynamic>?,
    );
  }
}
