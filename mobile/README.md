# Toto Mobile

Flutter (Android) 客户端 for Toto。

## 启动

确保连了 Android 设备（USB 调试 + adb devices 看到）或起了模拟器。

```bash
flutter pub get
flutter run
```

登录: `admin` / `admin123`

API: `https://todo.azhefuye.online`（修改 `lib/core/constants.dart` 切换）

## 本地开发（Android 模拟器）

模拟器访问宿主机：将 `constants.dart` 中的 `apiBaseUrl` 改为：

```dart
static const String apiBaseUrl = 'http://10.0.2.2:8000/api';
```

## 构建 APK

```bash
flutter build apk --release
# 输出: build/app/outputs/flutter-apk/app-release.apk
```

## 目录结构

```
lib/
├── main.dart                      # 入口
├── core/
│   ├── constants.dart             # API 地址、Storage Key
│   ├── theme.dart                 # Material 3 主题（亮/暗）
│   ├── router.dart                # go_router 路由配置
│   ├── api/
│   │   └── dio_client.dart        # Dio HTTP 客户端 + JWT 拦截器
│   └── auth/
│       ├── auth_models.dart       # LoginRequest, TokenResponse, UserOut
│       ├── auth_repository.dart   # 认证 API 封装
│       └── auth_provider.dart     # Riverpod AuthNotifier + AuthState
├── features/
│   ├── auth/
│   │   └── login_screen.dart      # 登录界面（完整实现）
│   ├── home/
│   │   └── home_screen.dart       # 首页（统计 + 四象限缩览）
│   ├── tasks/
│   │   └── tasks_screen.dart      # 任务页（Phase 7B）
│   ├── pomodoro/
│   │   └── pomodoro_screen.dart   # 专注页（Phase 7C）
│   └── profile/
│       └── profile_screen.dart    # 我的页（含退出登录）
└── shell/
    └── root_shell.dart            # 底部导航 Shell（5 个 Tab）
```

## 已实现 vs 待实现

| 功能 | 状态 | Phase |
|------|------|-------|
| Material 3 深色主题 | 完成 | 7A |
| JWT 认证（登录/登出/自动恢复会话） | 完成 | 7A |
| 底部导航（5 Tab） | 完成 | 7A |
| 登录界面 | 完成 | 7A |
| 首页骨架（统计卡片 + 四象限预览） | 完成 | 7A |
| 任务管理（四象限/看板/列表） | 待实现 | 7B |
| 快速添加任务 | 待实现 | 7B |
| 首页完整数据 | 待实现 | 7B |
| 番茄钟计时器 | 待实现 | 7C |
| 复盘 & AI 转换 | 待实现 | 7D |
| 我的页完整功能 | 待实现 | 7D |
