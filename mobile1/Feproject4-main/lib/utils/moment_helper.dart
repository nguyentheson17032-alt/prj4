import 'dart:async';
import '../api_service.dart';

class MomentHelper {
  static int _unviewedCount = 0;
  static final StreamController<int> _unviewedCountController = StreamController<int>.broadcast();

  // Stream để lắng nghe thay đổi số khoảnh khắc chưa xem
  static Stream<int> get unviewedCountStream => _unviewedCountController.stream;

  // Lấy số khoảnh khắc chưa xem hiện tại
  static int get unviewedCount => _unviewedCount;

  // Thêm listener cho số khoảnh khắc chưa xem
  static void addUnviewedCountListener(Function(int) listener) {
    _unviewedCountController.stream.listen(listener);
  }

  // Tải số khoảnh khắc chưa xem từ server
  static Future<void> loadUnviewedCount() async {
    try {
      print('🔄 MomentHelper: Đang gọi API getUnviewedMomentsCount...');
      final count = await ApiService.getUnviewedMomentsCount();
      print('📊 MomentHelper: Nhận được số khoảnh khắc chưa xem: $count');
      updateUnviewedCount(count);
    } catch (e) {
      print('❌ Lỗi tải số khoảnh khắc chưa xem: $e');
    }
  }

  // Cập nhật số khoảnh khắc chưa xem
  static void updateUnviewedCount(int count) {
    print('🔄 MomentHelper: Cập nhật số khoảnh khắc từ $_unviewedCount thành $count');
    _unviewedCount = count;
    _unviewedCountController.add(count);
    print('📢 MomentHelper: Đã gửi cập nhật qua stream');
  }

  // Tăng số khoảnh khắc chưa xem (khi có khoảnh khắc mới)
  static void incrementUnviewedCount() {
    updateUnviewedCount(_unviewedCount + 1);
  }

  // Giảm số khoảnh khắc chưa xem (khi xem khoảnh khắc)
  static void decrementUnviewedCount() {
    if (_unviewedCount > 0) {
      updateUnviewedCount(_unviewedCount - 1);
    }
  }

  // Reset số khoảnh khắc chưa xem về 0
  static void resetUnviewedCount() {
    updateUnviewedCount(0);
  }

  // Mark moment as viewed và cập nhật count
  static Future<void> markMomentAsViewed(int momentId) async {
    try {
      final success = await ApiService.markMomentAsViewed(momentId);
      if (success) {
        decrementUnviewedCount();
        print('✅ MomentHelper: Đã mark moment $momentId as viewed');
      }
    } catch (e) {
      print('❌ MomentHelper: Lỗi mark moment as viewed: $e');
    }
  }

  // Mark all moments as viewed
  static Future<void> markAllMomentsAsViewed() async {
    try {
      final success = await ApiService.markAllMomentsAsViewed();
      if (success) {
        resetUnviewedCount();
        print('✅ MomentHelper: Đã mark all moments as viewed');
      }
    } catch (e) {
      print('❌ MomentHelper: Lỗi mark all moments as viewed: $e');
    }
  }

  // Dispose stream controller
  static void dispose() {
    _unviewedCountController.close();
  }
} 