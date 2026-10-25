import 'api_service.dart';

class OrderService {
  static Future<Map<String, dynamic>?> hirePlayer({
    required int playerId,
    required int hours,
    required String startTime,
    String? note,
  }) async {
    return ApiService.hirePlayer(
      playerId: playerId,
      hours: hours,
      startTime: startTime,
      note: note,
    );
  }

  static Future<List<dynamic>> fetchPlayersHiredByMe() async {
    return ApiService.fetchPlayersHiredByMe();
  }

  static Future<Map<String, dynamic>?> fetchOrderDetail(String orderId) async {
    return ApiService.fetchOrderDetail(orderId);
  }

  static Future<bool> confirmHire(String orderId) async {
    return ApiService.confirmHire(orderId);
  }

  static Future<Map<String, dynamic>?> rejectHire(String orderId) async {
    return ApiService.rejectHire(orderId);
  }

  static Future<Map<String, dynamic>?> cancelOrder(String orderId) async {
    return ApiService.cancelOrder(orderId);
  }

  static Future<List<dynamic>?> getAllUserOrders(int userId) async {
    return ApiService.getAllUserOrders(userId);
  }
}
