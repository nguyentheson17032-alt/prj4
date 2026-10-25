import 'dart:io';
import 'api_service.dart';

class MomentService {
  static Future<bool> createMoment({
    required String gamePlayerId,
    required String content,
    File? imageFile,
  }) async {
    return ApiService.createMoment(
      gamePlayerId: gamePlayerId,
      content: content,
      imageFile: imageFile,
    );
  }

  static Future<List<dynamic>> fetchPlayerMoments(String playerId) async {
    return ApiService.fetchPlayerMoments(playerId);
  }

  static Future<List<dynamic>> fetchAllMoments({int page = 0, int size = 20}) async {
    return ApiService.fetchAllMoments(page: page, size: size);
  }

  static Future<List<Map<String, dynamic>>> getAllMoments({int page = 0, int size = 20}) async {
    return ApiService.getAllMoments(page: page, size: size);
  }

  static Future<List<Map<String, dynamic>>> getMomentFeed({int page = 0, int size = 20}) async {
    return ApiService.getMomentFeed(page: page, size: size);
  }

  static Future<int> getUnviewedMomentsCount() async {
    return ApiService.getUnviewedMomentsCount();
  }

  static Future<bool> markMomentAsViewed(int momentId) async {
    return ApiService.markMomentAsViewed(momentId);
  }

  static Future<bool> markAllMomentsAsViewed() async {
    return ApiService.markAllMomentsAsViewed();
  }
}
