import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:toto/core/api/dio_client.dart';
import 'package:toto/core/auth/auth_models.dart';
import 'package:toto/core/auth/auth_repository.dart';

// ---------------------------------------------------------------------------
// Providers for infrastructure singletons
// ---------------------------------------------------------------------------

final _secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
});

final _dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(_secureStorageProvider);
  return DioClient(storage);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dioClient: ref.watch(_dioClientProvider),
    storage: ref.watch(_secureStorageProvider),
  );
});

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

sealed class AuthState {
  const AuthState();
}

final class AuthUnknown extends AuthState {
  const AuthUnknown();
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final UserOut user;
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

// ---------------------------------------------------------------------------
// AuthNotifier
// ---------------------------------------------------------------------------

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo, this._dioClient) : super(const AuthUnknown()) {
    // Wire 401 callback so the DioClient can trigger logout
    _dioClient.onUnauthorized = _handleUnauthorized;
    _tryRestoreSession();
  }

  final AuthRepository _repo;
  final DioClient _dioClient;

  Future<void> _tryRestoreSession() async {
    try {
      final token = await _repo.readToken();
      if (token == null) {
        state = const AuthUnauthenticated();
        return;
      }
      final user = await _repo.me();
      state = AuthAuthenticated(user);
    } on Object {
      state = const AuthUnauthenticated();
    }
  }

  Future<void> login(String username, String password) async {
    await _repo.login(username, password);
    final user = await _repo.me();
    state = AuthAuthenticated(user);
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthUnauthenticated();
  }

  void _handleUnauthorized() {
    _repo.logout();
    state = const AuthUnauthenticated();
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  final dioClient = ref.watch(_dioClientProvider);
  return AuthNotifier(repo, dioClient);
});
