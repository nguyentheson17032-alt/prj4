import 'dart:async';
import '../services/api_service.dart';

class MessageHelper {
  static int _unreadCount = 0;
  static final StreamController<int> _unreadCountController = StreamController<int>.broadcast();

  // Stream để lắng nghe thay đổi số tin nhắn chưa đọc
  static Stream<int> get unreadCountStream => _unreadCountController.stream;

  // Lấy số tin nhắn chưa đọc hiện tại
  static int get unreadCount => _unreadCount;

  // Thêm listener cho số tin nhắn chưa đọc
  static void addUnreadCountListener(Function(int) listener) {
    _unreadCountController.stream.listen(listener);
  }

  // Tải số tin nhắn chưa đọc từ server
  static Future<void> loadUnreadCount() async {
    try {
      print('🔄 MessageHelper: Đang gọi API getUnreadMessagesCount...');
      final count = await ApiService.getUnreadMessagesCount();
      print('📊 MessageHelper: Nhận được số tin nhắn chưa đọc: $count');
      updateUnreadCount(count);
    } catch (e) {
      print('❌ Lỗi tải số tin nhắn chưa đọc: $e');
    }
  }

  // Cập nhật số tin nhắn chưa đọc
  static void updateUnreadCount(int count) {
    print('🔄 MessageHelper: Cập nhật số tin nhắn từ $_unreadCount thành $count');
    _unreadCount = count;
    _unreadCountController.add(count);
    print('📢 MessageHelper: Đã gửi cập nhật qua stream');
  }

  // Tăng số tin nhắn chưa đọc (khi có tin nhắn mới)
  static void incrementUnreadCount() {
    updateUnreadCount(_unreadCount + 1);
  }

  // Giảm số tin nhắn chưa đọc (khi đọc tin nhắn)
  static void decrementUnreadCount() {
    if (_unreadCount > 0) {
      updateUnreadCount(_unreadCount - 1);
    }
  }

  // Reset số tin nhắn chưa đọc về 0
  static void resetUnreadCount() {
    updateUnreadCount(0);
  }

  // Dispose stream controller
  static void dispose() {
    _unreadCountController.close();
  }
} 