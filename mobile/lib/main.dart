import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:home_widget/home_widget.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:toto/core/auth/auth_provider.dart';
import 'package:toto/core/router.dart';
import 'package:toto/core/theme.dart';
import 'package:toto/core/theme_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('zh_CN');
  runApp(const ProviderScope(child: TotoApp()));
}

class TotoApp extends ConsumerStatefulWidget {
  const TotoApp({super.key});

  @override
  ConsumerState<TotoApp> createState() => _TotoAppState();
}

class _TotoAppState extends ConsumerState<TotoApp> {
  StreamSubscription<Uri?>? _widgetSub;

  /// 小部件点击进来但登录态尚未确定时，暂存待处理的捕获类型，
  /// 等 auth 落定为已登录后再导航。
  String? _pendingQuickType;

  @override
  void initState() {
    super.initState();
    unawaited(_initWidgetLaunch());
  }

  Future<void> _initWidgetLaunch() async {
    // 冷启动：app 由小部件点击拉起
    final initialUri = await HomeWidget.initiallyLaunchedFromHomeWidget();
    _handleUri(initialUri);
    // 热启动：app 已在后台时点击小部件
    _widgetSub = HomeWidget.widgetClicked.listen(_handleUri);
  }

  void _handleUri(Uri? uri) {
    if (uri == null) return;
    final type = uri.host == 'task' ? 'task' : 'memo';
    final authState = ref.read(authProvider);
    if (authState is AuthAuthenticated) {
      // 已登录：立即导航
      _navigateToQuick(type);
    } else {
      // 未登录或登录态未确定：暂存，待 auth 落定后再导航
      _pendingQuickType = type;
    }
  }

  void _navigateToQuick(String type) {
    // 等当前帧结束后再导航，确保 router 已就绪
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(routerProvider).go('/quick?type=$type');
    });
  }

  @override
  void dispose() {
    _widgetSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // auth 落定为已登录时，消费暂存的待处理捕获并导航
    ref.listen<AuthState>(authProvider, (prev, next) {
      if (next is AuthAuthenticated && _pendingQuickType != null) {
        final type = _pendingQuickType!;
        _pendingQuickType = null;
        _navigateToQuick(type);
      }
    });

    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp.router(
      title: 'Toto',
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeMode,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      locale: const Locale('zh', 'CN'),
    );
  }
}
