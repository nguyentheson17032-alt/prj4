import 'api_service.dart';

class ReportService {
  static Future<String?> reportPlayer({
    required int reportedPlayerId,
    required String reason,
    required String description,
    String? video,
  }) async {
    return ApiService.reportPlayer(
      reportedPlayerId: reportedPlayerId,
      reason: reason,
      description: description,
      video: video,
    );
  }

  static Future<String?> reportPlayerWithVideo({
    required int reportedPlayerId,
    required String reason,
    required String description,
    required String videoFilePath,
  }) async {
    return ApiService.reportPlayerWithVideo(
      reportedPlayerId: reportedPlayerId,
      reason: reason,
      description: description,
      videoFilePath: videoFilePath,
    );
  }
}
