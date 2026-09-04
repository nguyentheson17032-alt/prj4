import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class FirebaseHelper {
  static const storage = FlutterSecureStorage();
  
  /// Lấy FCM token một cách an toàn
  static Future<String?> getDeviceToken() async {
    try {
      FirebaseMessaging messaging = FirebaseMessaging.instance;
      String? token = await messaging.getToken();
      
      if (token != null) {
        print('FCM Token: $token');
        await storage.write(key: 'fcm_token', value: token);
        return token;
      } else {
        print('Không thể lấy được FCM token');
        return null;
      }
    } catch (e) {
      print('Lỗi khi lấy FCM token: $e');
      return null;
    }
  }
  
  /// Yêu cầu quyền thông báo một cách an toàn
  static Future<bool> requestNotificationPermission() async {
    try {
      FirebaseMessaging messaging = FirebaseMessaging.instance;
      
      NotificationSettings settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      
      print('Trạng thái quyền thông báo: ${settings.authorizationStatus}');
      return settings.authorizationStatus == AuthorizationStatus.authorized;
    } catch (e) {
      print('Lỗi khi yêu cầu quyền thông báo: $e');
      return false;
    }
  }
  
  /// Thiết lập FCM một cách an toàn
  static Future<bool> setupFCM() async {
    try {
      bool hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        print('Không có quyền thông báo');
        return false;
      }
      
      String? token = await getDeviceToken();
      return token != null;
    } catch (e) {
      print('Lỗi khi thiết lập FCM: $e');
      return false;
    }
  }
} 