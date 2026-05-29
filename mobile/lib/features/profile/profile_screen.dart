import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:toto/core/auth/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = switch (authState) {
      AuthAuthenticated(:final user) => user,
      _ => null,
    };

    return Scaffold(
      appBar: AppBar(title: const Text('我的')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: const Color(0xFF6366f1),
                    child: Text(
                      user?.username.isEmpty ?? true
                          ? '?'
                          : user!.username[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.username ?? '',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (user?.email != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          user!.email!,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Feature entries
          Card(
            child: Column(
              children: [
                _ProfileTile(
                  icon: Icons.sticky_note_2_outlined,
                  label: '速记收集箱',
                  onTap: () => context.go('/memos'),
                ),
                const Divider(height: 1, indent: 56),
                _ProfileTile(
                  icon: Icons.today_outlined,
                  label: '每日复盘',
                  onTap: () => context.push('/reviews'),
                ),
                const Divider(height: 1, indent: 56),
                _ProfileTile(
                  icon: Icons.event_repeat_outlined,
                  label: '习惯打卡',
                  onTap: () => context.push('/habits'),
                ),
                const Divider(height: 1, indent: 56),
                _ProfileTile(
                  icon: Icons.flag_outlined,
                  label: '目标 OKR',
                  onTap: () => context.push('/okrs'),
                ),
                const Divider(height: 1, indent: 56),
                _ProfileTile(
                  icon: Icons.folder_outlined,
                  label: '项目',
                  onTap: () => context.push('/projects'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                _ProfileTile(
                  icon: Icons.auto_awesome_outlined,
                  label: 'AI 配置（请到 Web 端）',
                  onTap: () => _showWebOnly(context),
                ),
                const Divider(height: 1, indent: 56),
                _ProfileTile(
                  icon: Icons.send_outlined,
                  label: '飞书推送（请到 Web 端）',
                  onTap: () => _showWebOnly(context),
                ),
                const Divider(height: 1, indent: 56),
                _ProfileTile(
                  icon: Icons.settings_outlined,
                  label: '系统设置',
                  onTap: () => context.push('/settings'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Logout
          Card(
            child: _ProfileTile(
              icon: Icons.logout_rounded,
              label: '退出登录',
              color: Theme.of(context).colorScheme.error,
              onTap: () => _confirmLogout(context, ref),
            ),
          ),
          const SizedBox(height: 32),
          Center(
            child: Text(
              'Toto v1.0.0',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  void _showWebOnly(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('此项请在 Web 端配置')),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              '退出',
              style: TextStyle(
                color: Theme.of(ctx).colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authProvider.notifier).logout();
    }
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Theme.of(context).colorScheme.onSurface;

    return ListTile(
      leading: Icon(icon, color: effectiveColor),
      title: Text(
        label,
        style: TextStyle(color: effectiveColor),
      ),
      trailing: Icon(
        Icons.chevron_right_rounded,
        color: effectiveColor.withValues(alpha: 0.5),
      ),
      onTap: onTap,
    );
  }
}
