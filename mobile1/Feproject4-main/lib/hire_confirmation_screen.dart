import 'package:flutter/material.dart';
import 'api_service.dart';
import 'dart:async';
import 'utils/notification_helper.dart';
import 'rate_player_screen.dart';
import 'config/api_config.dart';

class HireConfirmationScreen extends StatefulWidget {
  final String playerName;
  final String playerAvatarUrl;
  final String playerRank;
  final String game;
  final int hours;
  final int totalCoin;
  final String orderId;
  final String startTime;

  const HireConfirmationScreen({
    Key? key,
    required this.playerName,
    required this.playerAvatarUrl,
    required this.playerRank,
    required this.game,
    required this.hours,
    required this.totalCoin,
    required this.orderId,
    required this.startTime,
  }) : super(key: key);

  @override
  State<HireConfirmationScreen> createState() => _HireConfirmationScreenState();
}

class _HireConfirmationScreenState extends State<HireConfirmationScreen> {
  String? orderStatus;
  bool isLoading = true;
  Map<String, dynamic>? orderDetail;
  Timer? _countdownTimer;
  Duration? remainingTime;
  Map<String, dynamic>? currentUser;
  bool isPlayer = false;
  String? hirerAvatarUrl;

  @override
  void initState() {
    super.initState();
    fetchOrder();
    ApiService.getCurrentUser().then((user) {
      setState(() {
        currentUser = user;
      });
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> fetchOrder() async {
    setState(() { isLoading = true; });
    final detail = await ApiService.fetchOrderDetail(widget.orderId);
    setState(() {
      orderDetail = detail;
      orderStatus = detail != null ? detail['status']?.toString() : null;
      isLoading = false;
    });
    // Nếu là player, lấy avatar của hirer
    if (detail != null && detail['hirerId'] != null) {
      final user = await ApiService.getUserById(int.parse(detail['hirerId'].toString()));
      setState(() {
        hirerAvatarUrl = user?['avatar'] ?? '';
      });
    }
    _startCountdown();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    if (orderStatus != null && orderStatus != 'PENDING') return;
    final startTimeStr = orderDetail?['startTime']?.toString() ?? widget.startTime;
    DateTime? startTime;
    try {
      startTime = DateTime.parse(startTimeStr);
    } catch (_) {
      return;
    }
    void updateTime() {
      final now = DateTime.now();
      final diff = startTime!.difference(now);
      setState(() {
        remainingTime = diff.isNegative ? Duration.zero : diff;
      });
      if (diff.inSeconds <= 0 && (orderStatus == null || orderStatus == 'PENDING')) {
        _countdownTimer?.cancel();
        _rejectOrder();
      }
    }
    updateTime();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) => updateTime());
  }

  String _formatDuration(Duration? d) {
    if (d == null) return '--:--';
    final h = d.inHours;
    final m = d.inMinutes % 60;
    final s = d.inSeconds % 60;
    if (h > 0) {
      return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    } else {
      return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
  }

  String getFullAvatarUrl(String? url) {
    if (url == null || url.isEmpty || url == 'null') return '';
    if (url.startsWith('http')) return url;
    return ApiConfig.baseUrl + '/' + url;
  }

  Future<void> _confirmOrder() async {
    try {
      final success = await ApiService.confirmHire(widget.orderId);
      if (success == true) {
        setState(() { orderStatus = 'CONFIRMED'; });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã xác nhận đơn thành công!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Xác nhận đơn thất bại!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: ${e.toString()}')),
      );
    }
  }

  // Cho phép người thuê hủy đơn
  Future<void> _cancelOrder() async {
    try {
      final response = await ApiService.cancelOrder(widget.orderId);
      if (response != null && response['success'] == true) {
        setState(() { orderStatus = 'REJECTED'; });
        
        // Reload số dư xu ngay lập tức
        try {
          await ApiService.fetchWalletBalance();
        } catch (e) {
          print('Lỗi reload số dư xu: $e');
        }
        
        // Lấy số tiền được hoàn lại từ response
        final data = response['data'];
        final refundedCoin = data?['refundedCoin'] ?? 0;
        
        // Debug: In ra response để kiểm tra
        print('Cancel order response: $response');
        print('Response type: ${response.runtimeType}');
        print('Response keys: ${response.keys.toList()}');
        print('Data object: $data');
        print('Refunded coin: $refundedCoin');
        
        // Nếu refundedCoin là 0, sử dụng số tiền đơn hàng
        final displayRefundAmount = refundedCoin > 0 ? refundedCoin : widget.totalCoin;
        
        // Sau khi hủy đơn, reload số dư xu nếu có hàm cập nhật
        if (mounted) {
          if (Navigator.canPop(context)) {
            Navigator.pop(context, true);
          }
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã hủy đơn thành công! Số tiền ${formatXu(displayRefundAmount)} xu đã được hoàn lại vào ví của bạn.'),
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hủy đơn thất bại!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: ${e.toString()}')),
      );
    }
  }

  // Cho phép player từ chối đơn
  Future<void> _rejectOrder() async {
    try {
      final response = await ApiService.rejectHire(widget.orderId);
      if (response != null && response['success'] == true) {
        setState(() { orderStatus = 'REJECTED'; });
        
        // Lấy số tiền được hoàn lại từ response
        final data = response['data'];
        final refundedCoin = data?['refundedCoin'] ?? 0;
        
        // Debug: In ra response để kiểm tra
        print('Reject order response: $response');
        print('Response type: ${response.runtimeType}');
        print('Response keys: ${response.keys.toList()}');
        print('Data object: $data');
        print('Refunded coin: $refundedCoin');
        
        // Nếu refundedCoin là 0, sử dụng số tiền đơn hàng
        final displayRefundAmount = refundedCoin > 0 ? refundedCoin : widget.totalCoin;
        
        // Sau khi từ chối đơn, quay lại màn hình trước
        if (mounted) {
          if (Navigator.canPop(context)) {
            Navigator.pop(context, true);
          }
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã từ chối đơn thành công! Số tiền ${formatXu(displayRefundAmount)} xu đã được hoàn lại cho người thuê.'),
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Từ chối đơn thất bại!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: ${e.toString()}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Lấy dữ liệu từ widget hoặc orderDetail nếu có
    final playerName = orderDetail?['playerName'] ?? widget.playerName;
    final playerAvatarUrl = orderDetail?['playerAvatarUrl'] ?? widget.playerAvatarUrl;
    final playerRank = orderDetail?['playerRank'] ?? widget.playerRank;
    final game = orderDetail?['game'] ?? widget.game;
    final hours = orderDetail?['hours'] ?? widget.hours;
    final totalCoin = orderDetail?['totalCoin'] ?? widget.totalCoin;
    final startTime = orderDetail?['startTime']?.toString() ?? widget.startTime;
    final specialRequest = orderDetail?['specialRequest'] ?? orderDetail?['description'] ?? 'Không có';
    final servicePrice = totalCoin;
    final hireTime = '';
    final hireDate = startTime.length >= 10 ? startTime.substring(0, 10) : startTime;
    final confirmTime = '26:50';

    // Xác định vai trò
    final userId = currentUser != null ? currentUser!['id']?.toString() : null;
    final orderUserId = orderDetail?['hirerId']?.toString();
    final orderPlayerId = orderDetail?['playerId']?.toString();
    final isCurrentPlayer = userId != null && (userId == orderPlayerId);
    final isCurrentUser = userId != null && (userId == orderUserId);

    // Format lại thời gian đặt đơn
    String formattedOrderTime = '';
    try {
      final dt = DateTime.parse(startTime);
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      final day = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      final year = dt.year.toString();
      formattedOrderTime = '$hour:$minute - $day/$month/$year';
    } catch (_) {
      formattedOrderTime = startTime;
    }

    // Format lại thời gian thuê
    String hireTimeDisplay = '';
    String hireDateDisplay = '';
    try {
      final dt = DateTime.parse(startTime);
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      hireTimeDisplay = '$hour:$minute';
      hireDateDisplay = '${dt.year.toString().padLeft(4, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    } catch (_) {
      hireTimeDisplay = hireTime;
      hireDateDisplay = hireDate;
    }

    // Lấy tên hiển thị đúng vai trò
    String displayName = playerName;
    if (isCurrentPlayer) {
      displayName = orderDetail?['hirerName'] ?? '';
    } else if (isCurrentUser) {
      displayName = orderDetail?['playerName'] ?? '';
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      appBar: AppBar(
        title: Text(isCurrentPlayer ? 'Xác nhận đơn hàng' : 'Chi tiết đơn hàng'),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        titleTextStyle: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold, fontSize: 24),
        centerTitle: true,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Thông tin người chơi (luôn là player)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.deepOrange.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundImage: (() {
                      String? userId;
                      if (isCurrentPlayer) {
                        userId = orderDetail?['hirerId']?.toString();
                      } else {
                        userId = orderDetail?['playerId']?.toString();
                      }
                      if (userId != null && userId.isNotEmpty) {
                        return NetworkImage('${ApiConfig.baseUrl}/api/auth/avatar/$userId');
                      }
                      return null;
                    })(),
                    child: (() {
                      String? userId;
                      if (isCurrentPlayer) {
                        userId = orderDetail?['hirerId']?.toString();
                      } else {
                        userId = orderDetail?['playerId']?.toString();
                      }
                      if (userId == null || userId.isEmpty) {
                        return const Icon(Icons.person, size: 36, color: Colors.deepOrange);
                      }
                      return null;
                    })(),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(displayName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.black)),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.deepOrange.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text('Đã xác thực', style: TextStyle(fontSize: 12, color: Colors.deepOrange, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('Đặt lúc: $formattedOrderTime', style: const TextStyle(fontSize: 14, color: Colors.grey)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Chi tiết đơn hàng
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.deepOrange.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.deepOrange.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.access_time, color: Colors.deepOrange),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Thời gian thuê', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text(hireTimeDisplay, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                        ],
                      ),
                      const Spacer(),
                      Text(hireDateDisplay, style: const TextStyle(color: Colors.grey, fontSize: 15)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.deepOrange.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.emoji_events, color: Colors.deepOrange),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Loại game', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text(game, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      const Text('Rank yêu cầu:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(width: 8),
                      Icon(Icons.verified, color: Colors.deepOrange, size: 20),
                      Text(' $playerRank', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text('Yêu cầu đặc biệt:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.deepOrange.shade50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      (specialRequest != null && specialRequest.toString().trim().isNotEmpty)
                          ? specialRequest
                          : 'Không có',
                      style: const TextStyle(color: Colors.black87, fontSize: 15),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Giá mỗi giờ:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      Text('${formatXu(servicePrice ~/ hours)} xu', style: const TextStyle(fontSize: 15)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Tổng thời gian:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      Text('$hours giờ', style: const TextStyle(fontSize: 15)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Tổng tiền:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange, fontSize: 17)),
                      Text('${formatXu(servicePrice)} xu', style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold, fontSize: 17)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            // Hiển thị trạng thái lớn cho cả người thuê và người được thuê
            if (orderStatus == 'REJECTED')
              Center(
                child: Column(
                  children: const [
                    Icon(Icons.cancel, color: Colors.red, size: 64),
                    SizedBox(height: 12),
                    Text('Đơn đã được hủy', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 22)),
                  ],
                ),
              ),
            if (orderStatus == 'CONFIRMED')
              Center(
                child: Column(
                  children: const [
                    Icon(Icons.check_circle, color: Colors.green, size: 64),
                    SizedBox(height: 12),
                    Text('Đơn đã được xác nhận', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 22)),
                  ],
                ),
              ),
            // Lưu ý/nút xác nhận/từ chối chỉ cho player
            if (isCurrentPlayer) ...[
              if (orderStatus == 'PENDING' || orderStatus == null)
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.deepOrange.withOpacity(0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Lưu ý quan trọng', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange, fontSize: 17)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          const Icon(Icons.timer, color: Colors.red, size: 22),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Bạn cần xác nhận đơn hàng trong vòng ${_formatDuration(remainingTime)} để tránh mất đơn',
                              style: const TextStyle(color: Colors.red, fontSize: 15, fontWeight: FontWeight.w600),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text('Nếu từ chối đơn, vui lòng cung cấp lý do để chúng tôi hỗ trợ khách hàng tốt hơn.', style: TextStyle(fontSize: 14)),
                      const SizedBox(height: 6),
                      const Text('Sau khi xác nhận, bạn sẽ được kết nối với khách hàng qua ứng dụng chat.', style: TextStyle(fontSize: 14)),
                    ],
                  ),
                ),
              if (orderStatus == 'PENDING' || orderStatus == null)
                const SizedBox(height: 24),
              if (orderStatus == 'PENDING' || orderStatus == null)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _rejectOrder,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.deepOrange,
                          side: const BorderSide(color: Colors.deepOrange, width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('TỪ CHỐI ĐƠN'),
                      ),
                    ),
                    const SizedBox(width: 18),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _confirmOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.deepOrange,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('XÁC NHẬN ĐƠN'),
                      ),
                    ),
                  ],
                ),
            ],
            // Thêm nút hủy cho người thuê
            if (isCurrentUser && (orderStatus == 'PENDING' || orderStatus == null))
              Padding(
                padding: const EdgeInsets.only(top: 12.0),
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.cancel, color: Colors.deepOrange),
                  onPressed: _cancelOrder,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.deepOrange,
                    side: const BorderSide(color: Colors.deepOrange, width: 2),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  label: const Text('HỦY ĐƠN'),
                ),
              ),
            // Chỉ hiển thị nút đánh giá khi đơn đã hoàn thành và là người thuê
            if (!isCurrentPlayer && orderStatus == 'COMPLETED')
              FutureBuilder<Map<String, dynamic>?> (
                future: ApiService.getOrderReview(widget.orderId),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SizedBox();
                  }
                  final hasReviewed = (snapshot.data != null && snapshot.data!['data'] != null);
                  if (hasReviewed) return const SizedBox();
                  return Padding(
                    padding: const EdgeInsets.only(top: 16.0),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.star, color: Colors.white),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.deepOrange,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => RatePlayerScreen(
                                playerName: playerName,
                                playerId: orderDetail?['playerId']?.toString() ?? '',
                                orderId: widget.orderId,
                                playerAvatarUrl: playerAvatarUrl,
                                playerRank: playerRank,
                                game: game,
                              ),
                            ),
                          ).then((rated) {
                            if (rated == true) fetchOrder();
                          });
                        },
                        label: const Text('Đánh giá người chơi', style: TextStyle(color: Colors.white)),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
} 