import 'api_service.dart';

class GameService {
  static Future<List<dynamic>> fetchGames() async {
    return ApiService.fetchGames();
  }
}
