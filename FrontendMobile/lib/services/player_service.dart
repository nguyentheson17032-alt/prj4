import 'api_service.dart';

class PlayerService {
  static Future<String?> registerPlayer(Map<String, dynamic> data) async {
    return ApiService.registerPlayer(data);
  }

  static Future<List<dynamic>> fetchAllPlayers() async {
    return ApiService.fetchAllPlayers();
  }

  static Future<Map<String, dynamic>?> fetchPlayerById(int id) async {
    return ApiService.fetchPlayerById(id);
  }

  static Future<List<dynamic>> fetchPlayersByUser(int userId) async {
    return ApiService.fetchPlayersByUser(userId);
  }

  static Future<String?> updatePlayer(int playerId, Map<String, dynamic> data) async {
    return ApiService.updatePlayer(playerId, data);
  }

  static Future<bool> followPlayer(int playerId) async {
    return ApiService.followPlayer(playerId);
  }

  static Future<bool> checkFollowing(int playerId) async {
    return ApiService.checkFollowing(playerId);
  }

  static Future<bool> unfollowPlayer(int playerId) async {
    return ApiService.unfollowPlayer(playerId);
  }

  static Future<int> fetchFollowerCount(int playerId) async {
    return ApiService.fetchFollowerCount(playerId);
  }

  static Future<int> fetchHireHours(int playerId) async {
    return ApiService.fetchHireHours(playerId);
  }

  static Future<Map<String, dynamic>?> fetchPlayerRewardStatus(String playerId) async {
    return ApiService.fetchPlayerRewardStatus(playerId);
  }

  static Future<List<dynamic>?> fetchPlayerRewardHistory(String playerId) async {
    return ApiService.fetchPlayerRewardHistory(playerId);
  }

  static Future<Map<String, dynamic>?> fetchPlayerStats(int playerId) async {
    return ApiService.fetchPlayerStats(playerId);
  }

  static Future<List<String>> getPlayerImages(String playerId) async {
    return ApiService.getPlayerImages(playerId);
  }

  static Future<bool> uploadPlayerGalleryImage(String playerId, String filePath) async {
    return ApiService.uploadPlayerGalleryImage(playerId, filePath);
  }
}
