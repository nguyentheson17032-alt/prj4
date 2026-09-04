class ApiConfig {
  // Base URL cho API
  static const baseUrl = 'http://10.0.2.2:8080';
  
  // Timeout cho các request
  static const Duration timeout = Duration(seconds: 10);
  
  // Headers mặc định
  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Language': 'vi',
  };
  
  // Auth endpoints
  static const String login = '/api/auth/login';
  static const String register = '/api/auth/register';
  static const String refreshToken = '/api/auth/refresh-token';
  static const String logout = '/api/auth/logout';
  static const String me = '/api/auth/me';
  static const String userInfo = '/api/auth/user-info';
  static const String updateProfile = '/api/auth/update';
  static const String updateAvatar = '/api/auth/update/avatar';
  static const String updateProfileImage = '/api/auth/update/profile-image';
  static const String deviceToken = '/api/auth/device-token';
  
  // Notification endpoints
  static const String notifications = '/api/notifications';
  
  // Message endpoints
  static const String messages = '/api/messages';
  static const String conversations = '/api/messages/conversations';
  static const String allConversations = '/api/messages/all-conversations';
  
  // Game endpoints
  static const String games = '/api/games';
  static const String gamePlayers = '/api/game-players';
  
  // Payment endpoints
  static const String payments = '/api/payments';
  
  // Player endpoints
  static const String players = '/api/players';
} 