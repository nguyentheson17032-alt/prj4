import 'api_service.dart';

class PaymentService {
  static Future<String?> topUp(int coin) async {
    return ApiService.topUp(coin);
  }

  static Future<Map<String, dynamic>?> deposit(double amount, String method) async {
    return ApiService.deposit(amount, method);
  }

  static Future<int?> fetchWalletBalance() async {
    return ApiService.fetchWalletBalance();
  }

  static Future<int?> getCoinBalance() async {
    return ApiService.getCoinBalance();
  }

  static Future<Map<String, dynamic>?> processPayment(String transactionId) async {
    return ApiService.processPayment(transactionId);
  }

  static Future<Map<String, dynamic>?> createVnPayPayment({
    required double amount,
    required String orderInfo,
  }) async {
    return ApiService.createVnPayPayment(amount: amount, orderInfo: orderInfo);
  }

  static Future<String?> withdraw({
    required int coin,
    required String bankAccountNumber,
    required String bankAccountName,
    required String bankName,
  }) async {
    return ApiService.withdraw(
      coin: coin,
      bankAccountNumber: bankAccountNumber,
      bankAccountName: bankAccountName,
      bankName: bankName,
    );
  }

  static Future<List<dynamic>> fetchBalanceHistory() async {
    return ApiService.fetchBalanceHistory();
  }

  static Future<String?> donatePlayer({
    required int playerId,
    required int coin,
    String? message,
  }) async {
    return ApiService.donatePlayer(
      playerId: playerId,
      coin: coin,
      message: message,
    );
  }

  static Future<List<dynamic>> fetchDonateHistory() async {
    return ApiService.fetchDonateHistory();
  }

  static Future<List<dynamic>> fetchTopupHistory() async {
    return ApiService.fetchTopupHistory();
  }
}
