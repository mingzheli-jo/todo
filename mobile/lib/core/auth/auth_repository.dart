import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:toto/core/api/dio_client.dart';
import 'package:toto/core/auth/auth_models.dart';
import 'package:toto/core/constants.dart';

class AuthRepository {
  const AuthRepository({
    required DioClient dioClient,
    required FlutterSecureStorage storage,
  })  : _client = dioClient,
        _storage = storage;

  final DioClient _client;
  final FlutterSecureStorage _storage;

  Future<TokenResponse> login(String username, String password) async {
    final request = LoginRequest(username: username, password: password);
    final response = await _client.post<Map<String, dynamic>>(
      '/auth/login',
      data: request.toJson(),
    );
    final token = TokenResponse.fromJson(
      response.data as Map<String, dynamic>,
    );
    await _storage.write(
      key: AppConstants.tokenStorageKey,
      value: token.accessToken,
    );
    return token;
  }

  Future<UserOut> me() async {
    final response =
        await _client.get<Map<String, dynamic>>('/auth/me');
    return UserOut.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenStorageKey);
  }

  Future<String?> readToken() async {
    return _storage.read(key: AppConstants.tokenStorageKey);
  }
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  @override
  String toString() => 'AuthException: $message';
}

String authErrorMessage(Object error) {
  if (error is DioException) {
    final status = error.response?.statusCode;
    if (status == 401 || status == 403) return '用户名或密码错误';
    if (status != null && status >= 500) return '服务器错误，请稍后重试';
  }
  return '网络连接失败，请检查网络';
}
