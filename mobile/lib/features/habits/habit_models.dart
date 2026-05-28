import 'dart:ui';

enum HabitFrequency {
  daily('daily', '每天'),
  weekday('weekday', '工作日'),
  weekly('weekly', '每周');

  const HabitFrequency(this.wire, this.label);
  final String wire;
  final String label;

  static HabitFrequency fromWire(String? value) {
    return HabitFrequency.values.firstWhere(
      (f) => f.wire == value,
      orElse: () => HabitFrequency.daily,
    );
  }
}

class Habit {
  const Habit({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.frequency,
    required this.targetCount,
    required this.isActive,
  });

  final String id;
  final String name;
  final String icon;
  final String color;
  final HabitFrequency frequency;
  final int targetCount;
  final bool isActive;

  Color get displayColor {
    try {
      final hex = color.replaceAll('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } on Object {
      return const Color(0xFF10b981);
    }
  }

  factory Habit.fromJson(Map<String, dynamic> json) {
    return Habit(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String? ?? '✅',
      color: json['color'] as String? ?? '#10b981',
      frequency: HabitFrequency.fromWire(json['frequency'] as String?),
      targetCount: (json['target_count'] as num?)?.toInt() ?? 1,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class HabitRecord {
  const HabitRecord({
    required this.id,
    required this.habitId,
    required this.date,
    required this.completed,
  });

  final String id;
  final String habitId;
  final DateTime date;
  final bool completed;

  factory HabitRecord.fromJson(Map<String, dynamic> json) {
    return HabitRecord(
      id: json['id'] as String,
      habitId: json['habit_id'] as String,
      date: DateTime.parse(json['date'] as String),
      completed: json['completed'] as bool? ?? false,
    );
  }
}

class HabitTodayStatus {
  const HabitTodayStatus({
    required this.habit,
    required this.completedToday,
  });

  final Habit habit;
  final bool completedToday;

  factory HabitTodayStatus.fromJson(Map<String, dynamic> json) {
    return HabitTodayStatus(
      habit: Habit.fromJson(json['habit'] as Map<String, dynamic>),
      completedToday: json['completed_today'] as bool? ?? false,
    );
  }
}

class HabitWithWeek {
  const HabitWithWeek({
    required this.habit,
    required this.completedToday,
    required this.last7,
  });

  final Habit habit;
  final bool completedToday;
  // last7[0] = 6 days ago, last7[6] = today
  final List<bool> last7;

  int get weekCompletionCount => last7.where((b) => b).length;
}
