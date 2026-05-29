import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:home_widget/home_widget.dart';
import 'package:intl/date_symbol_data_local.dart';
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

  @override
  void initState() {
    super.initState();
    _initWidgetLaunch();
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
