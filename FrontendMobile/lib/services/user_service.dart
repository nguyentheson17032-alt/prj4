import 'api_service.dart';

class UserService {
  static Future<Map<String, dynamic>?> getUserInfo() async {
    return ApiService.getUserInfo();
  }

  static Future<Map<String, dynamic>?> getUserById(int userId) async {
    return ApiService.getUserById(userId);
  }

  static Future<String?> updateUserProfile(Map<String, dynamic> data) async {
    return ApiService.updateUserProfile(data);
  }

  static Future<String?> uploadCoverImage(String filePath) async {
    return ApiService.uploadCoverImage(filePath);
  }

  static Future<String?> fetchCoverImageUrl(String userId) async {
    return ApiService.fetchCoverImageUrl(userId);
  }

  static Future<String?> fetchUserCoverImageUrl(String userId) async {
    return ApiService.fetchUserCoverImageUrl(userId);
  }
}
