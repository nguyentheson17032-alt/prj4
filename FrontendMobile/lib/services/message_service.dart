import 'api_service.dart';

class MessageService {
  static Future<int> getUnreadMessagesCount() async {
    return ApiService.getUnreadMessagesCount();
  }

  static Future<List<Map<String, dynamic>>> getAllConversations() async {
    return ApiService.getAllConversations();
  }

  static Future<List<Map<String, dynamic>>> getConversation(int userId) async {
    return ApiService.getConversation(userId);
  }

  static Future<Map<String, dynamic>?> sendMessage(int userId, String content) async {
    return ApiService.sendMessage(userId, content);
  }

  static Future<bool> markMessageAsRead(int messageId) async {
    return ApiService.markMessageAsRead(messageId);
  }

  static Future<bool> markAllMessagesAsRead(int userId) async {
    return ApiService.markAllMessagesAsRead(userId);
  }
}
