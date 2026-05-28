class PomodoroSession {
  const PomodoroSession({
    required this.id,
    required this.durationMin,
    required this.startedAt,
    this.completedAt,
    this.interrupted = false,
    this.taskId,
  });

  final String id;
  final int durationMin;
  final DateTime startedAt;
  final DateTime? completedAt;
  final bool interrupted;
  final String? taskId;

  bool get isActive => completedAt == null;

  factory PomodoroSession.fromJson(Map<String, dynamic> json) {
    return PomodoroSession(
      id: json['id'] as String,
      durationMin: (json['duration_min'] as num).toInt(),
      startedAt: DateTime.parse(json['started_at'] as String),
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      interrupted: json['interrupted'] as bool? ?? false,
      taskId: json['task_id'] as String?,
    );
  }
}

class PomodoroTodayStats {
  const PomodoroTodayStats({
    required this.totalSessions,
    required this.completedSessions,
    required this.totalMinutes,
    this.currentSession,
  });

  final int totalSessions;
  final int completedSessions;
  final int totalMinutes;
  final PomodoroSession? currentSession;

  factory PomodoroTodayStats.empty() => const PomodoroTodayStats(
        totalSessions: 0,
        completedSessions: 0,
        totalMinutes: 0,
      );

  factory PomodoroTodayStats.fromJson(Map<String, dynamic> json) {
    final cur = json['current_session'];
    return PomodoroTodayStats(
      totalSessions: (json['total_sessions'] as num?)?.toInt() ?? 0,
      completedSessions:
          (json['completed_sessions'] as num?)?.toInt() ?? 0,
      totalMinutes: (json['total_minutes'] as num?)?.toInt() ?? 0,
      currentSession: cur == null
          ? null
          : PomodoroSession.fromJson(cur as Map<String, dynamic>),
    );
  }
}
