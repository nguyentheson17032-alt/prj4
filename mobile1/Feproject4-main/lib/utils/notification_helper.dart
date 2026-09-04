import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import '../api_service.dart';

class NotificationHelper {
  // Stream controller for unread count
  static final StreamController<int> _unreadCountController = StreamController<int>.broadcast();
  static int _unreadCount = 0;
  static final List<Function(int)> _listeners = [];

  // Getter for unread count stream
  static Stream<int> get unreadCountStream => _unreadCountController.stream;

  // Method to load unread count
  static Future<void> loadUnreadCount() async {
    try {
      print('🔄 NotificationHelper: Đang tải số thông báo chưa đọc...');
      final notifications = await ApiService.getUserNotifications();
      final unreadCount = notifications.where((n) => n['read'] == false).length;
      
      _unreadCount = unreadCount;
      _unreadCountController.add(_unreadCount);
      
      // Notify all listeners
      for (var listener in _listeners) {
        listener(_unreadCount);
      }
      
      print('✅ NotificationHelper: Số thông báo chưa đọc: $_unreadCount');
    } catch (e) {
      print('❌ NotificationHelper: Lỗi tải số thông báo chưa đọc: $e');
    }
  }

  // Method to add unread count listener
  static void addUnreadCountListener(Function(int) listener) {
    _listeners.add(listener);
    // Immediately call with current count
    listener(_unreadCount);
  }

  // Method to remove unread count listener
  static void removeUnreadCountListener(Function(int) listener) {
    _listeners.remove(listener);
  }

  // Method to update unread count
  static void updateUnreadCount(int count) {
    _unreadCount = count;
    _unreadCountController.add(_unreadCount);
    
    // Notify all listeners
    for (var listener in _listeners) {
      listener(_unreadCount);
    }
  }

  // Method to increment unread count
  static void incrementUnreadCount() {
    updateUnreadCount(_unreadCount + 1);
  }

  // Method to decrement unread count
  static void decrementUnreadCount() {
    if (_unreadCount > 0) {
      updateUnreadCount(_unreadCount - 1);
    }
  }

  // Method to reset unread count
  static void resetUnreadCount() {
    updateUnreadCount(0);
  }

  // Method to mark a specific notification as read
  static Future<void> markAsRead(int notificationId) async {
    try {
      print('🔄 NotificationHelper: Đang mark notification $notificationId as read...');
      final success = await ApiService.markNotificationAsRead(notificationId);
      if (success) {
        decrementUnreadCount();
        print('✅ NotificationHelper: Đã mark notification $notificationId as read');
      } else {
        print('❌ NotificationHelper: Không thể mark notification $notificationId as read');
      }
    } catch (e) {
      print('❌ NotificationHelper: Lỗi mark notification as read: $e');
    }
  }

  // Method to mark all notifications as read
  static Future<void> markAllAsRead() async {
    try {
      print('🔄 NotificationHelper: Đang mark all notifications as read...');
      final success = await ApiService.markAllNotificationsAsRead();
      if (success) {
        resetUnreadCount();
        print('✅ NotificationHelper: Đã mark all notifications as read');
      } else {
        print('❌ NotificationHelper: Không thể mark all notifications as read');
      }
    } catch (e) {
      print('❌ NotificationHelper: Lỗi mark all notifications as read: $e');
    }
  }

  // Dispose method to clean up resources
  static void dispose() {
    _unreadCountController.close();
    _listeners.clear();
  }

  static void showSuccess(BuildContext context, String message) {
    // Ví dụ: message = 'Thao tác thành công!'
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        margin: const EdgeInsets.all(8),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  static void showError(BuildContext context, String message) {
    // Ví dụ: message = 'Đã xảy ra lỗi, vui lòng thử lại!'
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        margin: const EdgeInsets.all(8),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  static void showWarning(BuildContext context, String message) {
    // Ví dụ: message = 'Cảnh báo: Bạn chưa nhập đủ thông tin!'
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.orange[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        margin: const EdgeInsets.all(8),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  static void showInfo(BuildContext context, String message) {
    // Ví dụ: message = 'Đây là thông tin mới nhất.'
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.info_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.blue[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        margin: const EdgeInsets.all(8),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  static Future<bool?> showConfirmDialog(
    BuildContext context, {
    required String title,
    required String content,
    String? cancelText,
    String? confirmText,
    Color? confirmColor,
  }) {
    // Ví dụ: title = 'Xác nhận', content = 'Bạn có chắc chắn muốn xóa?'
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(cancelText ?? 'Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: confirmColor ?? Colors.deepOrange,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              confirmText ?? 'Xác nhận',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  static Future<void> showLoadingDialog(
    BuildContext context, {
    String? message,
  }) {
    // Ví dụ: message = 'Đang xử lý...'
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 16),
            Expanded(
              child: Text(message ?? 'Đang xử lý...'),
            ),
          ],
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }

  void showPrettyError(BuildContext context, String title, String message) {
    // Ví dụ: title = 'Lỗi', message = 'Không thể kết nối đến máy chủ.'
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.white,
        elevation: 8,
        behavior: SnackBarBehavior.floating,
        content: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: Colors.red[800],
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    message,
                    style: TextStyle(
                      color: Colors.black87,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        duration: Duration(seconds: 4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.red[200]!),
        ),
        margin: EdgeInsets.all(16),
      ),
    );
  }
}

String formatXu(dynamic value) {
  if (value == null) return '0';
  try {
    final number = value is num ? value : int.tryParse(value.toString()) ?? 0;
    return NumberFormat('#,###', 'vi_VN').format(number).replaceAll(',', '.') ;
  } catch (_) {
    return value.toString();
  }
}

void showPrettyError(BuildContext context, String title, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      backgroundColor: Colors.white,
      elevation: 8,
      behavior: SnackBarBehavior.floating,
      content: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: Colors.red[800],
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: TextStyle(
                    color: Colors.black87,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      duration: Duration(seconds: 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.red[200]!),
      ),
      margin: EdgeInsets.all(16),
    ),
  );
} 