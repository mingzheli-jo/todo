import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toto/features/pomodoro/pomodoro_provider.dart';

const _kBrand = Color(0xFF8b5cf6);

class PomodoroScreen extends ConsumerStatefulWidget {
  const PomodoroScreen({super.key});

  @override
  ConsumerState<PomodoroScreen> createState() => _PomodoroScreenState();
}

class _PomodoroScreenState extends ConsumerState<PomodoroScreen> {
  int _selectedMinutes = 25;
  static const _presets = [15, 25, 45];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pomodoroProvider);
    final notifier = ref.read(pomodoroProvider.notifier);

    final theme = Theme.of(context);
    final isRunning = state is PomodoroRunning;
    final progress = isRunning ? state.progress : 0.0;
    final timerText = _timerText(state, _selectedMinutes);

    return Scaffold(
      appBar: AppBar(
        title: const Text('专注'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => notifier.refresh(),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              if (!isRunning)
                _PresetSelector(
                  selected: _selectedMinutes,
                  presets: _presets,
                  onChanged: (m) => setState(() => _selectedMinutes = m),
                ),
              const SizedBox(height: 24),
              Center(
                child: SizedBox(
                  width: 240,
                  height: 240,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CustomPaint(
                        size: const Size(240, 240),
                        painter: _ProgressRingPainter(
                          progress: progress,
                          backgroundColor:
                              theme.dividerColor.withValues(alpha: 0.4),
                          foregroundColor: _kBrand,
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            timerText,
                            style: const TextStyle(
                              fontSize: 56,
                              fontWeight: FontWeight.w800,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            isRunning ? '专注中…' : '准备开始',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              _Controls(
                state: state,
                selectedMinutes: _selectedMinutes,
                onStart: () => notifier.start(durationMin: _selectedMinutes),
                onStop: () => _confirmStop(context, notifier),
              ),
              const SizedBox(height: 32),
              _TodayStatsCard(state: state),
              if (state is PomodoroError) ...[
                const SizedBox(height: 12),
                Text(
                  state.message,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: theme.colorScheme.error,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _timerText(PomodoroState state, int idleMinutes) {
    final sec = state is PomodoroRunning
        ? state.remainingSec
        : idleMinutes * 60;
    final m = sec ~/ 60;
    final s = sec % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _confirmStop(
    BuildContext context,
    PomodoroNotifier notifier,
  ) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('结束当前专注？'),
        content: const Text('会被记录为"中断"的会话。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('继续专注'),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('结束'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await notifier.finish(interrupted: true);
    }
  }
}

class _PresetSelector extends StatelessWidget {
  const _PresetSelector({
    required this.selected,
    required this.presets,
    required this.onChanged,
  });

  final int selected;
  final List<int> presets;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 10,
      children: [
        for (final m in presets)
          ChoiceChip(
            label: Text('$m 分钟'),
            selected: selected == m,
            onSelected: (_) => onChanged(m),
            selectedColor: _kBrand.withValues(alpha: 0.25),
            side: BorderSide(
              color: selected == m ? _kBrand : Theme.of(context).dividerColor,
              width: selected == m ? 1.5 : 1,
            ),
          ),
      ],
    );
  }
}

class _Controls extends StatelessWidget {
  const _Controls({
    required this.state,
    required this.selectedMinutes,
    required this.onStart,
    required this.onStop,
  });

  final PomodoroState state;
  final int selectedMinutes;
  final VoidCallback onStart;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    final isRunning = state is PomodoroRunning;
    if (isRunning) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          OutlinedButton.icon(
            icon: const Icon(Icons.stop_rounded),
            label: const Text('结束'),
            onPressed: onStop,
            style: OutlinedButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
              padding: const EdgeInsets.symmetric(
                horizontal: 32,
                vertical: 14,
              ),
            ),
          ),
        ],
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        FilledButton.icon(
          icon: const Icon(Icons.play_arrow_rounded),
          label: Text('开始 $selectedMinutes 分钟专注'),
          onPressed: onStart,
          style: FilledButton.styleFrom(
            backgroundColor: _kBrand,
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
          ),
        ),
      ],
    );
  }
}

class _TodayStatsCard extends StatelessWidget {
  const _TodayStatsCard({required this.state});
  final PomodoroState state;

  @override
  Widget build(BuildContext context) {
    final stats = state.stats;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _StatItem(
              label: '总会话',
              value: stats.totalSessions.toString(),
            ),
            _StatItem(
              label: '已完成',
              value: stats.completedSessions.toString(),
            ),
            _StatItem(
              label: '总专注',
              value: '${stats.totalMinutes}',
              suffix: '分',
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    this.suffix,
  });

  final String label;
  final String value;
  final String? suffix;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: _kBrand,
              ),
            ),
            if (suffix != null) ...[
              const SizedBox(width: 2),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  suffix!,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _kBrand,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _ProgressRingPainter extends CustomPainter {
  _ProgressRingPainter({
    required this.progress,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  final double progress;
  final Color backgroundColor;
  final Color foregroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 14.0;
    final radius = (size.shortestSide / 2) - strokeWidth / 2;
    final center = Offset(size.width / 2, size.height / 2);

    final bg = Paint()
      ..color = backgroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius, bg);

    final fg = Paint()
      ..color = foregroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final sweep = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweep,
      false,
      fg,
    );
  }

  @override
  bool shouldRepaint(covariant _ProgressRingPainter old) =>
      old.progress != progress ||
      old.backgroundColor != backgroundColor ||
      old.foregroundColor != foregroundColor;
}
