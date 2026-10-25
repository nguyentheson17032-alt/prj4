import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'api_service.dart';

class AuthService {
  static Future<String?> login(String username, String password) async {
    return ApiService.login(username, password);
  }

  static Future<String?> register(Map<String, dynamic> userData) async {
    return ApiService.register(userData);
  }

  static Future<void> logout() async {
    return ApiService.logout();
  }

  static Future<String?> refreshToken() async {
    return ApiService.refreshToken();
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    return ApiService.getCurrentUser();
  }

  static Future<bool> forgotPassword(String email) async {
    return ApiService.forgotPassword(email);
  }

  static Future<String?> changePassword(String oldPassword, String newPassword) async {
    return ApiService.changePassword(oldPassword, newPassword);
  }
}
