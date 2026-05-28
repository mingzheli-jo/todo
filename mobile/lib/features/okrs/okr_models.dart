enum OKRType {
  objective('objective', '目标'),
  keyResult('key_result', '关键结果');

  const OKRType(this.wire, this.label);
  final String wire;
  final String label;

  static OKRType fromWire(String? value) {
    return OKRType.values.firstWhere(
      (t) => t.wire == value,
      orElse: () => OKRType.objective,
    );
  }
}

enum OKRStatus {
  active('active', '进行中'),
  completed('completed', '已完成'),
  cancelled('cancelled', '已取消');

  const OKRStatus(this.wire, this.label);
  final String wire;
  final String label;

  static OKRStatus fromWire(String? value) {
    return OKRStatus.values.firstWhere(
      (s) => s.wire == value,
      orElse: () => OKRStatus.active,
    );
  }
}

class OKR {
  const OKR({
    required this.id,
    required this.parentId,
    required this.type,
    required this.title,
    this.description,
    required this.period,
    required this.progress,
    required this.status,
    this.children = const [],
  });

  final String id;
  final String? parentId;
  final OKRType type;
  final String title;
  final String? description;
  final String period;
  final int progress; // 0-100
  final OKRStatus status;
  final List<OKR> children;

  factory OKR.fromJson(Map<String, dynamic> json) {
    final childrenRaw = json['children'] as List<dynamic>? ?? const [];
    return OKR(
      id: json['id'] as String,
      parentId: json['parent_id'] as String?,
      type: OKRType.fromWire(json['type'] as String?),
      title: json['title'] as String,
      description: json['description'] as String?,
      period: json['period'] as String? ?? '',
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      status: OKRStatus.fromWire(json['status'] as String?),
      children: childrenRaw
          .map((e) => OKR.fromJson(e as Map<String, dynamic>))
          .toList(growable: false),
    );
  }
}
