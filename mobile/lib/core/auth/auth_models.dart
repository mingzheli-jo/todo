class LoginRequest {
  const LoginRequest({required this.username, required this.password});

  final String username;
  final String password;

  Map<String, dynamic> toJson() => {
        'username': username,
        'password': password,
      };
}

class TokenResponse {
  const TokenResponse({
    required this.accessToken,
    required this.tokenType,
  });

  final String accessToken;
  final String tokenType;

  factory TokenResponse.fromJson(Map<String, dynamic> json) => TokenResponse(
        accessToken: json['access_token'] as String,
        tokenType: json['token_type'] as String? ?? 'bearer',
      );
}

class UserOut {
  const UserOut({
    required this.id,
    required this.username,
    this.email,
    this.avatarUrl,
    this.createdAt,
  });

  final String id;
  final String username;
  final String? email;
  final String? avatarUrl;
  final String? createdAt;

  factory UserOut.fromJson(Map<String, dynamic> json) => UserOut(
        id: json['id'] as String,
        username: json['username'] as String,
        email: json['email'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        createdAt: json['created_at'] as String?,
      );
}
