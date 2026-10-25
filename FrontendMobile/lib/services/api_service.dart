import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import 'package:logger/logger.dart';

class ApiService {
  static const storage = FlutterSecureStorage();
  static Map<String, dynamic>? _currentUser;
  static const timeout = Duration(seconds: 10);
  static final logger = Logger();

  // Kiểm tra kết nối internet
  static Future<bool> checkConnection() async {
    try {
      final result = await InternetAddress.lookup('google.com');
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    }
  }

  // Lấy headers với token
  static Future<Map<String, String>> get _headersWithToken async {
    final token = await storage.read(key: 'jwt');
    return {
      ...ApiConfig.defaultHeaders,
      'Authorization': 'Bearer $token',
    };
  }

  // Refresh token
  static Future<String?> refreshToken() async {
    try {
      final refreshToken = await storage.read(key: 'refresh_token');
      if (refreshToken == null) return null;

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.refreshToken}'),
        headers: ApiConfig.defaultHeaders,
        body: jsonEncode({'refreshToken': refreshToken}),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await storage.write(key: 'jwt', value: data['token']);
        await storage.write(key: 'refresh_token', value: data['refreshToken']);
        return data['token'];
      }
      return null;
    } catch (e) {
      logger.e('Error refreshing token: $e');
      return null;
    }
  }

  // Login
  static Future<String?> login(String username, String password) async {
    if (!await checkConnection()) {
      return 'Không có kết nối internet';
    }

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.login}'),
        headers: ApiConfig.defaultHeaders,
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await storage.write(key: 'jwt', value: data['token']);
        await storage.write(key: 'refresh_token', value: data['refreshToken']);
        await storage.write(key: 'user', value: jsonEncode(data));
        _currentUser = data;
        return null;
      } else {
        final error = jsonDecode(response.body);
        String errorMessage = error['message'] ?? 'Đăng nhập thất bại';
        
        // Log chi tiết lỗi để debug
        print('🔐 ApiService: Login failed with status ${response.statusCode}');
        print('📄 ApiService: Error response: ${response.body}');
        print('❌ ApiService: Error message: $errorMessage');
        
        return errorMessage;
      }
    } catch (e) {
      logger.e('Login error: $e');
      return 'Lỗi kết nối: $e';
    }
  }

  // Register
  static Future<String?> register(Map<String, dynamic> userData) async {
    if (!await checkConnection()) {
      return 'Không có kết nối internet';
    }

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.register}'),
        headers: ApiConfig.defaultHeaders,
        body: jsonEncode(userData),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        return null;
      } else {
        final error = jsonDecode(response.body);
        return error['message'] ?? 'Đăng ký thất bại';
      }
    } catch (e) {
      logger.e('Register error: $e');
      return 'Lỗi kết nối: $e';
    }
  }

  // Logout
  static Future<void> logout() async {
    try {
      final headers = await _headersWithToken;
      await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.logout}'),
        headers: headers,
      );
    } catch (e) {
      logger.e('Logout error: $e');
    } finally {
      await storage.delete(key: 'jwt');
      await storage.delete(key: 'refresh_token');
      await storage.delete(key: 'user');
      await storage.delete(key: 'device_token_sent');
      _currentUser = null;
    }
  }

  // Get current user info
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    if (!await checkConnection()) {
      return null;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.me}'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _currentUser = data;
        return data;
      } else if (response.statusCode == 401) {
        // Token expired, try to refresh
        final newToken = await refreshToken();
        if (newToken != null) {
          return getCurrentUser(); // Retry with new token
        }
      }
      return null;
    } catch (e) {
      logger.e('Get current user error: $e');
      return null;
    }
  }

  // Update device token
  static Future<bool> updateDeviceToken(String deviceToken) async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.deviceToken}'),
        headers: headers,
        body: jsonEncode({'deviceToken': deviceToken}),
      ).timeout(timeout);

      return response.statusCode == 200;
    } catch (e) {
      logger.e('Update device token error: $e');
      return false;
    }
  }

  // Get User Info
  static Future<Map<String, dynamic>?> getUserInfo() async {
    if (!await checkConnection()) {
      return null;
    }

    try {
      logger.d('Bắt đầu lấy thông tin user');
      final headers = await _headersWithToken;
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.userInfo}'),
        headers: headers,
      ).timeout(timeout);

      logger.d('Response status: ${response.statusCode}');
      logger.d('Response body: ${response.body}');

      if (response.statusCode == 200 && response.body.isNotEmpty) {
        final data = jsonDecode(response.body);
        if (data != null && data is Map<String, dynamic>) {
          return data;
        }
      } else if (response.statusCode == 401) {
        // Token expired, try to refresh
        final newToken = await refreshToken();
        if (newToken != null) {
          return getUserInfo(); // Retry with new token
        }
      }
      return null;
    } catch (e) {
      logger.e('Lỗi khi đọc thông tin người dùng: $e');
      return null;
    }
  }



  static Future<List<dynamic>> fetchGames() async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.games}');
      final response = await http.get(url).timeout(timeout);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  static Future<String?> registerPlayer(Map<String, dynamic> data) async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.gamePlayers}');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(data),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['success'] == true) {
          return null;
        } else {
          return result['message'] ?? 'Đăng ký player thất bại';
        }
      } else {
        try {
          final error = jsonDecode(response.body);
          return error['message'] ?? 'Đăng ký player thất bại';
        } catch (e) {
          return response.body.isNotEmpty ? response.body : 'Đăng ký player thất bại';
        }
      }
    } catch (e) {
      return 'Đã xảy ra lỗi: ${e.toString()}';
    }
  }

  static Future<List<dynamic>> fetchAllPlayers() async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.gamePlayers}');
      final response = await http.get(url).timeout(timeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] as List;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> fetchPlayerById(int id) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.gamePlayers}/$id');
      final response = await http.get(url).timeout(timeout);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  // Nạp tiền (topup)
  static Future<String?> topUp(int coin) async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.payments}/topup');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'coin': coin,
        }),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        return null; // Thành công
      } else {
        final error = jsonDecode(response.body);
        return error['message'] ?? 'Nạp coin thất bại';
      }
    } catch (e) {
      print('Lỗi khi nạp coin: ${e.toString()}');
      return 'Đã xảy ra lỗi: ${e.toString()}';
    }
  }

  // Nạp tiền qua QR/bank (deposit)
  static Future<Map<String, dynamic>?> deposit(double amount, String method) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.payments}/deposit');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'amount': amount,
        'method': method,
      }),
    ).timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      return jsonDecode(response.body);
    }
  }

  // Lấy số dư ví
  static Future<int?> fetchWalletBalance() async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.payments}/wallet-balance');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(timeout);

      if (response.statusCode == 200) {
        // BE trả về số xu (long)
        return int.tryParse(response.body);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> processPayment(String transactionId) async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.payments}/process');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'transactionId': transactionId,
        }),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['message'] ?? 'Xử lý thanh toán thất bại');
      }
    } catch (e) {
      print('Lỗi khi xử lý thanh toán: ${e.toString()}');
      return null;
    }
  }

  static Future<int> fetchFollowerCount(int playerId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.players}/$playerId/followers/count');
    final response = await http.get(url).timeout(timeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['followerCount'] ?? 0;
    }
    return 0;
  }

  static Future<int> fetchHireHours(int playerId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.players}/$playerId/hire-hours');
    final response = await http.get(url).timeout(timeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['totalHireHours'] ?? 0;
    }
    return 0;
  }

  static Future<bool> followPlayer(int playerId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.players}/$playerId/follow');
    print('[LOG] Gửi POST follow tới $url với token: ${token != null}');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    print('[LOG] Response followPlayer: statusCode=${response.statusCode}, body=${response.body}');
    return response.statusCode == 200;
  }

  static Future<bool> checkFollowing(int playerId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.players}/$playerId/is-following');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['isFollowing'] == true;
    }
    return false;
  }

  static Future<bool> unfollowPlayer(int playerId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.players}/$playerId/unfollow');
    final response = await http.delete(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    return response.statusCode == 200;
  }

  static Future<Map<String, dynamic>?> getUserById(int userId) async {
    if (!await checkConnection()) {
      return null;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/users/$userId'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      logger.e('Get user by ID error: $e');
      return null;
    }
  }

  static Future<String?> updateUserProfile(Map<String, dynamic> data) async {
    try {
      final token = await storage.read(key: 'jwt');
      // Map gender về đúng format BE
      String? gender = data['gender'];
      if (gender == 'Nam') gender = 'MALE';
      if (gender == 'Nữ') gender = 'FEMALE';
      if (gender == 'Khác') gender = 'OTHER';
      final body = {
        'fullName': data['fullName'],
        'dateOfBirth': data['dateOfBirth'],
        'phoneNumber': data['phoneNumber'],
        'address': data['address'],
        'bio': data['bio'],
        'gender': gender,
      };
      final url = Uri.parse('${ApiConfig.baseUrl}/api/auth/update');
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      ).timeout(timeout);
      if (response.statusCode == 200) {
        return null;
      } else {
        final error = jsonDecode(response.body);
        return error['message'] ?? 'Cập nhật thất bại';
      }
    } catch (e) {
      return 'Lỗi:  [31m${e.toString()} [0m';
    }
  }

  static Future<List<dynamic>> fetchPlayersByUser(int userId) async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.gamePlayers}/user/$userId');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(timeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map && data.containsKey('data')) {
          return data['data'] as List;
        }
        if (data is List) {
          return data;
        }
        return [];
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  static Future<String?> updatePlayer(int playerId, Map<String, dynamic> data) async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.gamePlayers}/$playerId');
      final response = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(data),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['success'] == true) {
          return null;
        } else {
          return result['message'] ?? 'Cập nhật player thất bại';
        }
      } else {
        try {
          final error = jsonDecode(response.body);
          return error['message'] ?? 'Cập nhật player thất bại';
        } catch (e) {
          return response.body.isNotEmpty ? response.body : 'Cập nhật player thất bại';
        }
      }
    } catch (e) {
      return 'Đã xảy ra lỗi: ${e.toString()}';
    }
  }

  static Future<List<dynamic>> fetchTopupHistory() async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}/api/payments/topup-history');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(timeout);
      if (response.statusCode == 200 && response.body.isNotEmpty) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
      }
      return [];
    } catch (e) {
      print('Lỗi lấy lịch sử nạp xu: $e');
      return [];
    }
  }

  // Thuê player (API mới)
  static Future<Map<String, dynamic>?> hirePlayer({
    required int playerId,
    required int coin,
    required DateTime startTime,
    required DateTime endTime,
    int? hours,
    int? userId, // nếu cần truyền userId, lấy từ token hoặc truyền vào
    String? specialRequest,
  }) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/game-players/$playerId/hire');
    final now = DateTime.now();
    final body = {
      'userId': userId, // cần truyền userId, nếu không có thì cần lấy từ token
      'hours': hours ?? ((endTime.difference(startTime).inMinutes / 60).round()),
      'coin': coin,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      if (specialRequest != null && specialRequest.isNotEmpty) 'specialRequest': specialRequest,
    };
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    ).timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      try {
        return jsonDecode(response.body);
      } catch (e) {
        return {'message': 'Thuê player thất bại'};
      }
    }
  }

  static Future<List<dynamic>> fetchPlayersHiredByMe() async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/game-players/hired-by-me');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    if (response.statusCode == 200 && response.body.isNotEmpty) {
      final data = jsonDecode(response.body);
      if (data is Map && data['data'] is List) {
        return data['data'];
      }
    }
    return [];
  }

  // Lấy tất cả thông báo (trừ tin nhắn sẽ lọc ở UI)
  static Future<List<dynamic>> fetchNotifications() async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/notifications/user');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    if (response.statusCode == 200 && response.body.isNotEmpty) {
      final data = jsonDecode(response.body);
      if (data is List) return data;
      if (data is Map && data['data'] is List) return data['data'];
    }
    return [];
  }

  // Lấy chi tiết đơn thuê theo orderId
  static Future<Map<String, dynamic>?> fetchOrderDetail(String orderId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/orders/detail/$orderId');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    if (response.statusCode == 200 && response.body.isNotEmpty) {
      final data = jsonDecode(response.body);
      if (data != null) {
        return data;
      }
    }
    return null;
  }

  static Future<bool> confirmHire(String orderId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/game-players/order/$orderId/confirm');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    return response.statusCode == 200;
  }

  static Future<Map<String, dynamic>?> rejectHire(String orderId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/game-players/order/$orderId/reject');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    
    if (response.statusCode == 200) {
      try {
        final data = jsonDecode(response.body);
        return data;
      } catch (e) {
        return {'success': true};
      }
    }
    return null;
  }

  // API cho người thuê hủy đơn
  static Future<Map<String, dynamic>?> cancelOrder(String orderId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/game-players/order/$orderId/cancel');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    
    if (response.statusCode == 200) {
      try {
        final data = jsonDecode(response.body);
        return data;
      } catch (e) {
        return {'success': true};
      }
    }
    return null;
  }

  static Future<bool> deleteNotification(int notificationId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/notifications/$notificationId');
    final response = await http.delete(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    ).timeout(timeout);
    return response.statusCode == 200;
  }

  static Future<bool> forgotPassword(String email) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/api/auth/forgot-password');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );
    if (response.statusCode == 200) {
      return true;
    } else {
      // Nếu backend trả về message lỗi dạng Map
      try {
        final body = jsonDecode(response.body);
        throw Exception(body['error'] ?? body['message'] ?? response.body);
      } catch (_) {
        throw Exception(response.body);
      }
    }
  }

  static Future<String?> changePassword(String oldPassword, String newPassword) async {
    if (!await checkConnection()) {
      return 'Không có kết nối internet';
    }
    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/auth/change-password'),
        headers: headers,
        body: jsonEncode({
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        }),
      ).timeout(timeout);
      if (response.statusCode == 200) {
        return null;
      } else {
        final error = jsonDecode(response.body);
        return error['message'] ?? error['error'] ?? 'Đổi mật khẩu thất bại';
      }
    } catch (e) {
      logger.e('Change password error: $e');
      return 'Lỗi kết nối: $e';
    }
  }

  static Future<Map<String, dynamic>?> createVnPayPayment({
    required int amount,
    required String orderInfo,
    required int userId,
  }) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/payments/vnpay/create');
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        'amount': amount.toString(),
        'orderInfo': orderInfo,
        'userId': userId.toString(),
      },
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      return null;
    }
  }

  static Future<List<dynamic>?> getAllUserOrders(int userId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/orders/user-all/$userId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List;
    }
    return null;
  }

  static Future<bool> submitOrderReview({
    required String orderId,
    required int rating,
    String? comment,
  }) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/order-reviews/$orderId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'rating': rating,
        'comment': comment ?? '',
      }),
    );
    return response.statusCode == 200;
  }

  static Future<List<dynamic>?> getUserGivenReviews() async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/order-reviews/user/given-reviews'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']['reviews'] as List?;
    }
    return null;
  }

  static Future<bool> deleteOrderReview(String orderId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.delete(
      Uri.parse('${ApiConfig.baseUrl}/api/order-reviews/$orderId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    return response.statusCode == 200;
  }

  static Future<List<dynamic>?> getPlayerReviews(String playerId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/order-reviews/player/$playerId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']['reviews'] as List?;
    }
    return null;
  }

  static Future<Map<String, dynamic>?> getPlayerRatingSummary(String playerId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/order-reviews/rating-summary/player/$playerId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] as Map<String, dynamic>?;
    }
    return null;
  }

  static Future<List<String>> getPlayerImages(String playerId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/game-players/$playerId/images'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final images = data['data']['images'] as List?;
      if (images != null) {
        return images.map((img) => img['imageUrl'] as String).toList();
      }
    }
    return [];
  }

  static Future<Map<String, dynamic>?> getOrderReview(String orderId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/order-reviews/$orderId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  static Future<Map<String, dynamic>?> fetchPlayerRewardStatus(String playerId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/player-rewards/status/$playerId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      return Map<String, dynamic>.from(jsonDecode(response.body));
    }
    return null;
  }

  static Future<List<dynamic>?> fetchPlayerRewardHistory(String playerId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/player-rewards/history/$playerId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      return List<dynamic>.from(jsonDecode(response.body));
    }
    return null;
  }

  static Future<String?> uploadCoverImage(String filePath) async {
    final token = await storage.read(key: 'jwt');
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.baseUrl}/api/auth/update/cover-image'),
    );
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('file', filePath));
    final response = await request.send();
    if (response.statusCode == 200) {
      final respStr = await response.stream.bytesToString();
      final data = jsonDecode(respStr);
      return data['coverImageUrl'] as String?;
    }
    return null;
  }

  static Future<String?> fetchCoverImageUrl(String userId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/auth/me'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['coverImageUrl'] as String?;
    }
    return null;
  }

  static Future<String?> fetchUserCoverImageUrl(String userId) async {
    final token = await storage.read(key: 'jwt');
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/api/users/$userId/cover-image'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['coverImageUrl'] as String?;
    }
    return null;
  }

  static Future<bool> uploadPlayerGalleryImage(String playerId, String filePath) async {
    final token = await storage.read(key: 'jwt');
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.baseUrl}/api/game-players/$playerId/images'),
    );
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('file', filePath));
    final response = await request.send();
    final respStr = await response.stream.bytesToString();
    print('UPLOAD status:  [33m${response.statusCode} [0m, body: $respStr');
    return response.statusCode == 200 || response.statusCode == 201;
  }

  static Future<bool> createMoment({
    required String gamePlayerId,
    required String content,
    File? imageFile,
  }) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/moments/$gamePlayerId/upload');
    var request = http.MultipartRequest('POST', url);
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['content'] = content;
    if (imageFile != null) {
      request.files.add(await http.MultipartFile.fromPath('imageFile', imageFile.path));
    }
    final response = await request.send();
    if (response.statusCode == 200 || response.statusCode == 201) {
      return true;
    }
    return false;
  }

  static Future<List<dynamic>> fetchPlayerMoments(String playerId) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/moments/player/$playerId');
    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['content'] as List;
    }
    return [];
  }

  static Future<List<dynamic>> fetchAllMoments({int page = 0, int size = 20}) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/moments/all?page=$page&size=$size');
    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['content'] as List;
    }
    return [];
  }

  // Báo cáo player
  static Future<String?> reportPlayer({
    required int reportedPlayerId,
    required String reason,
    required String description,
    String? video,
  }) async {
    if (!await checkConnection()) {
      return 'Không có kết nối mạng';
    }
    try {
      final headers = await _headersWithToken;
      final body = {
        'reportedPlayerId': reportedPlayerId,
        'reason': reason,
        'description': description,
      };
      if (video != null && video.isNotEmpty) {
        body['video'] = video;
      }
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/reports'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(timeout);
      if (response.statusCode == 200) {
        return null; // Thành công
      } else {
        try {
          final respBody = jsonDecode(response.body);
          return respBody['message'] ?? 'Báo cáo thất bại!';
        } catch (_) {
          return 'Báo cáo thất bại!';
        }
      }
    } catch (e) {
      logger.e('Report player error: $e');
      return 'Báo cáo thất bại!';
    }
  }

  // Báo cáo player với video file
  static Future<String?> reportPlayerWithVideo({
    required int reportedPlayerId,
    required String reason,
    required String description,
    required String videoFilePath,
  }) async {
    if (!await checkConnection()) {
      return 'Không có kết nối mạng';
    }
    try {
      final token = await storage.read(key: 'jwt');
      if (token == null) {
        return 'Chưa đăng nhập';
      }

      // Tạo multipart request
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConfig.baseUrl}/api/reports/with-video'),
      );

      // Thêm headers
      request.headers['Authorization'] = 'Bearer $token';

      // Thêm form fields
      request.fields['reportedPlayerId'] = reportedPlayerId.toString();
      request.fields['reason'] = reason;
      request.fields['description'] = description;

      // Thêm video file
      final videoFile = await http.MultipartFile.fromPath(
        'videoFile',
        videoFilePath,
      );
      request.files.add(videoFile);

      // Gửi request
      final streamedResponse = await request.send().timeout(timeout);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return null; // Thành công
      } else {
        try {
          final respBody = jsonDecode(response.body);
          return respBody['message'] ?? 'Báo cáo thất bại!';
        } catch (_) {
          return 'Báo cáo thất bại!';
        }
      }
    } catch (e) {
      logger.e('Report player with video error: $e');
      return 'Báo cáo thất bại!';
    }
  }

  static Future<String?> withdraw({
    required int coin,
    required String bankAccountNumber,
    required String bankAccountName,
    required String bankName,
  }) async {
    if (!await checkConnection()) {
      return 'Không có kết nối mạng';
    }
    
    try {
      logger.d('🔄 Bắt đầu withdraw API call');
      final token = await storage.read(key: 'jwt');
      if (token == null) {
        logger.e('❌ Token không tồn tại');
        return 'Chưa đăng nhập';
      }
      
      final url = Uri.parse('${ApiConfig.baseUrl}/api/payments/withdraw');
      logger.d('🌐 URL: $url');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'coin': coin,
          'bankAccountNumber': bankAccountNumber,
          'bankAccountName': bankAccountName,
          'bankName': bankName,
        }),
      ).timeout(timeout);
      
      logger.d('📡 Response status: ${response.statusCode}');
      logger.d('📄 Response body: ${response.body}');
      
      if (response.statusCode == 200) {
        logger.d('✅ Withdraw thành công');
        return null; // Thành công
      } else {
        try {
          final error = jsonDecode(response.body);
          return error['message'] ?? 'Rút tiền thất bại';
        } catch (_) {
          return 'Rút tiền thất bại';
        }
      }
    } catch (e) {
      logger.e('Withdraw error: $e');
      if (e.toString().contains('TimeoutException')) {
        return 'Kết nối quá thời gian chờ';
      }
      return 'Lỗi kết nối: $e';
    }
  }

  static Future<List<dynamic>> fetchBalanceHistory() async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/payments/balance-history');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
    if (response.statusCode == 200 && response.body.isNotEmpty) {
      return List<dynamic>.from(jsonDecode(response.body));
    }
    return [];
  }

  static Future<String?> donatePlayer({
    required int playerId,
    required int coin,
    String? message,
  }) async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/payments/donate');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'playerId': playerId,
        'coin': coin,
        if (message != null && message.isNotEmpty) 'message': message,
      }),
    );
    if (response.statusCode == 200) {
      return null; // Thành công
    } else {
      try {
        final error = jsonDecode(response.body);
        return error['message'] ?? 'Donate thất bại';
      } catch (_) {
        return 'Donate thất bại';
      }
    }
  }

  // Get coin balance
  static Future<int?> getCoinBalance() async {
    if (!await checkConnection()) {
      return null;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/users/me'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['coin'] ?? 0;
      } else if (response.statusCode == 401) {
        // Token expired, try to refresh
        final newToken = await refreshToken();
        if (newToken != null) {
          return getCoinBalance(); // Retry with new token
        }
      }
      return null;
    } catch (e) {
      logger.e('Get coin balance error: $e');
      return null;
    }
  }

  // Lấy thống kê player (bao gồm completionRate)
  static Future<Map<String, dynamic>?> fetchPlayerStats(int playerId) async {
    try {
      final token = await storage.read(key: 'jwt');
      final url = Uri.parse('${ApiConfig.baseUrl}/api/players/$playerId/stats');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(timeout);
      if (response.statusCode == 200 && response.body.isNotEmpty) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<List<dynamic>> fetchDonateHistory() async {
    final token = await storage.read(key: 'jwt');
    final url = Uri.parse('${ApiConfig.baseUrl}/api/payments/donate-history');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
    if (response.statusCode == 200 && response.body.isNotEmpty) {
      return List<dynamic>.from(jsonDecode(response.body));
    }
    return [];
  }

  // Get unread notifications count
  static Future<int> getUnreadNotificationsCount() async {
    print('🔄 ApiService: Bắt đầu getUnreadNotificationsCount');
    if (!await checkConnection()) {
      print('❌ ApiService: Không có kết nối internet');
      return 0;
    }

    try {
      final headers = await _headersWithToken;
      final url = '${ApiConfig.baseUrl}/api/notifications/unread';
      print('🌐 ApiService: Gọi API: $url');
      print('🔑 ApiService: Headers: $headers');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      ).timeout(timeout);

      print('📡 ApiService: Response status: ${response.statusCode}');
      print('📄 ApiService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final List<dynamic> notifications = jsonDecode(response.body);
        final count = notifications.length;
        print('✅ ApiService: Số thông báo chưa đọc: $count');
        return count;
      }
      print('❌ ApiService: Response status không phải 200');
      return 0;
    } catch (e) {
      print('❌ ApiService: Lỗi getUnreadNotificationsCount: $e');
      logger.e('Get unread notifications count error: $e');
      return 0;
    }
  }

  // Get unread messages count
  static Future<int> getUnreadMessagesCount() async {
    print('🔄 ApiService: Bắt đầu getUnreadMessagesCount');
    if (!await checkConnection()) {
      print('❌ ApiService: Không có kết nối internet');
      return 0;
    }

    try {
      final headers = await _headersWithToken;
      final url = '${ApiConfig.baseUrl}/api/messages/unread/count';
      print('🌐 ApiService: Gọi API: $url');
      print('🔑 ApiService: Headers: $headers');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      ).timeout(timeout);

      print('📡 ApiService: Response status: ${response.statusCode}');
      print('📄 ApiService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final count = jsonDecode(response.body);
        print('✅ ApiService: Số tin nhắn chưa đọc: $count');
        return count;
      }
      print('❌ ApiService: Response status không phải 200');
      return 0;
    } catch (e) {
      print('❌ ApiService: Lỗi getUnreadMessagesCount: $e');
      logger.e('Get unread messages count error: $e');
      return 0;
    }
  }

  // Get all conversations
  static Future<List<Map<String, dynamic>>> getAllConversations() async {
    if (!await checkConnection()) {
      return [];
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/messages/all-conversations'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final List<dynamic> conversations = jsonDecode(response.body);
        return conversations.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      logger.e('Get all conversations error: $e');
      return [];
    }
  }

  // Get conversation with specific user
  static Future<List<Map<String, dynamic>>> getConversation(int userId) async {
    if (!await checkConnection()) {
      return [];
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/messages/conversation/$userId'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final Map<String, dynamic> conversation = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(conversation['messages']);
      }
      return [];
    } catch (e) {
      logger.e('Get conversation error: $e');
      return [];
    }
  }

  // Send message
  static Future<Map<String, dynamic>?> sendMessage(int userId, String content) async {
    if (!await checkConnection()) {
      return null;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/messages/send/$userId'),
        headers: headers,
        body: jsonEncode({'content': content}),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      logger.e('Send message error: $e');
      return null;
    }
  }

  // Mark message as read
  static Future<bool> markMessageAsRead(int messageId) async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/messages/read/$messageId'),
        headers: headers,
      ).timeout(timeout);

      return response.statusCode == 200;
    } catch (e) {
      logger.e('Mark message as read error: $e');
      return false;
    }
  }

  // Mark all messages as read with specific user
  static Future<bool> markAllMessagesAsRead(int userId) async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/messages/read-all/$userId'),
        headers: headers,
      ).timeout(timeout);

      return response.statusCode == 200;
    } catch (e) {
      logger.e('Mark all messages as read error: $e');
      return false;
    }
  }

  // Get user notifications
  static Future<List<Map<String, dynamic>>> getUserNotifications() async {
    if (!await checkConnection()) {
      return [];
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/notifications/user'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final List<dynamic> notifications = jsonDecode(response.body);
        return notifications.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      logger.e('Get user notifications error: $e');
      return [];
    }
  }

  // Mark notification as read
  static Future<bool> markNotificationAsRead(int notificationId) async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/api/notifications/$notificationId/read'),
        headers: headers,
      ).timeout(timeout);

      return response.statusCode == 200;
    } catch (e) {
      logger.e('Mark notification as read error: $e');
      return false;
    }
  }

  // Mark all notifications as read
  static Future<bool> markAllNotificationsAsRead() async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final notifications = await getUserNotifications();
      final unreadNotifications = notifications.where((n) => n['read'] == false).toList();
      
      bool allSuccess = true;
      for (final notification in unreadNotifications) {
        final success = await markNotificationAsRead(notification['id']);
        if (!success) allSuccess = false;
      }
      
      return allSuccess;
    } catch (e) {
      logger.e('Mark all notifications as read error: $e');
      return false;
    }
  }

  // Get unviewed moments count
  static Future<int> getUnviewedMomentsCount() async {
    print('🔄 ApiService: Bắt đầu getUnviewedMomentsCount');
    if (!await checkConnection()) {
      print('❌ ApiService: Không có kết nối internet');
      return 0;
    }

    try {
      final headers = await _headersWithToken;
      final url = '${ApiConfig.baseUrl}/api/moments/unviewed/count';
      print('🌐 ApiService: Gọi API: $url');
      print('🔑 ApiService: Headers: $headers');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      ).timeout(timeout);

      print('📡 ApiService: Response status: ${response.statusCode}');
      print('📄 ApiService: Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final count = data['unviewedCount'] ?? 0;
        print('✅ ApiService: Số khoảnh khắc chưa xem: $count');
        return count;
      }
      print('❌ ApiService: Response status không phải 200');
      return 0;
    } catch (e) {
      print('❌ ApiService: Lỗi getUnviewedMomentsCount: $e');
      logger.e('Get unviewed moments count error: $e');
      return 0;
    }
  }

  // Get all moments (feed)
  static Future<List<Map<String, dynamic>>> getAllMoments({int page = 0, int size = 20}) async {
    if (!await checkConnection()) {
      return [];
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/moments/all?page=$page&size=$size'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['content'] ?? []);
      }
      return [];
    } catch (e) {
      logger.e('Get all moments error: $e');
      return [];
    }
  }

  // Get moment feed (moments from followed players)
  static Future<List<Map<String, dynamic>>> getMomentFeed({int page = 0, int size = 20}) async {
    if (!await checkConnection()) {
      return [];
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/api/moments/feed?page=$page&size=$size'),
        headers: headers,
      ).timeout(timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['content'] ?? []);
      }
      return [];
    } catch (e) {
      logger.e('Get moment feed error: $e');
      return [];
    }
  }

  // Mark moment as viewed
  static Future<bool> markMomentAsViewed(int momentId) async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/moments/$momentId/view'),
        headers: headers,
      ).timeout(timeout);

      return response.statusCode == 200;
    } catch (e) {
      logger.e('Mark moment as viewed error: $e');
      return false;
    }
  }

  // Mark all moments as viewed
  static Future<bool> markAllMomentsAsViewed() async {
    if (!await checkConnection()) {
      return false;
    }

    try {
      final headers = await _headersWithToken;
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/moments/mark-all-viewed'),
        headers: headers,
      ).timeout(timeout);

      return response.statusCode == 200;
    } catch (e) {
      logger.e('Mark all moments as viewed error: $e');
      return false;
    }
  }
}