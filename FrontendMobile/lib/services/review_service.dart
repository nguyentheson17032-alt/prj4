import 'api_service.dart';

class ReviewService {
  static Future<bool> submitOrderReview({
    required String orderId,
    required int rating,
    String? comment,
  }) async {
    return ApiService.submitOrderReview(
      orderId: orderId,
      rating: rating,
      comment: comment,
    );
  }

  static Future<List<dynamic>?> getUserGivenReviews() async {
    return ApiService.getUserGivenReviews();
  }

  static Future<bool> deleteOrderReview(String orderId) async {
    return ApiService.deleteOrderReview(orderId);
  }

  static Future<List<dynamic>?> getPlayerReviews(String playerId) async {
    return ApiService.getPlayerReviews(playerId);
  }

  static Future<Map<String, dynamic>?> getPlayerRatingSummary(String playerId) async {
    return ApiService.getPlayerRatingSummary(playerId);
  }

  static Future<Map<String, dynamic>?> getOrderReview(String orderId) async {
    return ApiService.getOrderReview(orderId);
  }
}
