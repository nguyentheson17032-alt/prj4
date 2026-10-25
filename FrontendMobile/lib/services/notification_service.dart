import 'api_service.dart';

class NotificationService {
  static Future<List<dynamic>> fetchNotifications() async {
    return ApiService.fetchNotifications();
  }

  static Future<List<Map<String, dynamic>>> getUserNotifications() async {
    return ApiService.getUserNotifications();
  }

  static Future<int> getUnreadNotificationsCount() async {
    return ApiService.getUnreadNotificationsCount();
  }

  static Future<bool> markNotificationAsRead(int notificationId) async {
    return ApiService.markNotificationAsRead(notificationId);
  }

  static Future<bool> markAllNotificationsAsRead() async {
    return ApiService.markAllNotificationsAsRead();
  }

  static Future<bool> deleteNotification(int notificationId) async {
    return ApiService.deleteNotification(notificationId);
  }

  static Future<bool> updateDeviceToken(String deviceToken) async {
    return ApiService.updateDeviceToken(deviceToken);
  }
}
