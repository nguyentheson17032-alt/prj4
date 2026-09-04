import 'package:flutter/material.dart';
import 'api_service.dart';
import 'hire_confirmation_screen.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'utils/notification_helper.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'config/api_config.dart';

class HirePlayerScreen extends StatefulWidget {
  final Map<String, dynamic> player;
  const HirePlayerScreen({super.key, required this.player});

  @override
  State<HirePlayerScreen> createState() => _HirePlayerScreenState();
}

class _HirePlayerScreenState extends State<HirePlayerScreen> {
  int selectedHour = 1;
  final TextEditingController messageController = TextEditingController();
  final List<int> hours = [1, 2, 3, 4, 5];
  int? walletBalance;
  bool isLoading = false;
  DateTime? selectedStartTime;
  DateTime? selectedEndTime;
  String? token;
  final baseUrl = 'http://10.0.2.2:8080';
  int? userId;
  Uint8List? avatarBytes;
  Uint8List? coverImageBytes;

  @override
  void initState() {
    super.initState();
    _loadWalletBalance();
    _loadUserInfo();
    _loadAvatar();
    _loadCoverImage();
  }

  Future<void> _loadUserInfo() async {
    final user = await ApiService.getCurrentUser();
    setState(() {
      userId = user?['id'];
    });
  }

  Future<void> _loadWalletBalance() async {
    setState(() { isLoading = true; });
    final balance = await ApiService.fetchWalletBalance();
    setState(() {
      walletBalance = balance;
      isLoading = false;
    });
  }

  Future<void> _loadAvatar() async {
    final userId = widget.player['user']?['id']?.toString();
    if (userId == null) return;
    try {
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/auth/avatar/$userId',
        options: Options(responseType: ResponseType.bytes),
      );
      if (response.statusCode == 200) {
        setState(() {
          avatarBytes = Uint8List.fromList(response.data);
        });
      }
    } catch (_) {}
  }

  Future<void> _loadCoverImage() async {
    final userId = widget.player['user']?['id']?.toString();
    if (userId == null) return;
    try {
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/users/$userId/cover-image-bytes',
        options: Options(responseType: ResponseType.bytes),
      );
      if (response.statusCode == 200) {
        setState(() {
          coverImageBytes = Uint8List.fromList(response.data);
        });
      }
    } catch (_) {}
  }

  double get totalHours {
    if (selectedStartTime == null || selectedEndTime == null) return 0.0;
    final duration = selectedEndTime!.difference(selectedStartTime!);
    return duration.inMinutes / 60.0; // Tính chính xác số giờ (bao gồm phần thập phân)
  }

  int get totalCoin {
    final pricePerHour = (widget.player['pricePerHour'] is int)
        ? widget.player['pricePerHour']
        : (widget.player['pricePerHour'] is double)
            ? (widget.player['pricePerHour'] as double).toInt()
            : int.tryParse(widget.player['pricePerHour'].toString().split('.').first) ?? 0;
    // Tính chính xác chi phí dựa trên số giờ thực tế
    final exactHours = totalHours;
    if (exactHours <= 0) return pricePerHour; // Mặc định 1 giờ nếu chưa chọn thời gian
    return (pricePerHour * exactHours).round(); // Làm tròn để có số nguyên
  }

  Future<void> _handleHire() async {
    if (totalHours <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn số giờ thuê')),
      );
      return;
    }

    if (walletBalance == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không lấy được số dư ví!')),
      );
      return;
    }

    if (totalCoin > walletBalance!) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Số dư ví không đủ')),
      );
      return;
    }

    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không lấy được thông tin người dùng!')),
      );
      return;
    }

    setState(() { isLoading = true; });

    try {
      final result = await ApiService.hirePlayer(
        playerId: widget.player['id'] is int ? widget.player['id'] : int.tryParse(widget.player['id'].toString()) ?? 0,
        coin: totalCoin,
        startTime: selectedStartTime!,
        endTime: selectedEndTime!,
        hours: totalHours > 0 ? totalHours.round() : 1, // Làm tròn số giờ để gửi lên server
        userId: userId,
        specialRequest: messageController.text.trim(),
      );
      setState(() { isLoading = false; });

      if (result != null && result['success'] == true) {
        // Reload số dư xu sau khi trừ tiền
        try {
          await _loadWalletBalance();
        } catch (e) {
          print('Lỗi reload số dư xu: $e');
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Yêu cầu thuê đã được gửi. Số tiền ${totalCoin} xu đã được trừ từ ví của bạn. Vui lòng chờ player xác nhận.'),
            duration: const Duration(seconds: 4),
          ),
        );
        Navigator.pop(context);
      } else {
        final errorMsg = result?['message'] ?? 'Thuê player thất bại!';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMsg)),
        );
      }
    } catch (e) {
      setState(() { isLoading = false; });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: ${e.toString()}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thuê người chơi', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        titleTextStyle: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 22),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 90,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                image: coverImageBytes != null
                    ? DecorationImage(
                        image: MemoryImage(coverImageBytes!),
                        fit: BoxFit.cover,
                        colorFilter: ColorFilter.mode(
                          Colors.black.withOpacity(0.12),
                          BlendMode.darken,
                        ),
                      )
                    : null,
                color: const Color(0xFFFFF8E1),
                boxShadow: [
                  BoxShadow(
                    color: Colors.orange.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(width: 12),
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white,
                    backgroundImage: avatarBytes != null ? MemoryImage(avatarBytes!) : null,
                    child: avatarBytes == null
                        ? Icon(Icons.person, size: 28, color: Colors.deepOrange)
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      widget.player['username'] ?? '',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Colors.white,
                        shadows: [Shadow(blurRadius: 4, color: Colors.black26)],
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.85),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.attach_money, color: Colors.white, size: 16),
                        Text(
                          '${formatXu(widget.player['pricePerHour'])} xu/h',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F7FA),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey.withOpacity(0.05),
                          blurRadius: 6,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance_wallet, color: Color(0xFFFFA726), size: 22),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text('Số dư:', style: TextStyle(fontSize: 15, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            walletBalance != null ? formatXu(walletBalance) : '...',
                            style: TextStyle(color: Colors.grey[800], fontSize: 17, fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F7FA),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.grey.withOpacity(0.05),
                          blurRadius: 6,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calculate, color: Color(0xFFFFA726), size: 22),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text('Cần:', style: TextStyle(fontSize: 15, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            formatXu(totalCoin),
                            style: TextStyle(fontSize: 17, color: Colors.grey[800], fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            // Hiển thị thông tin thời gian thuê và chi phí
            if (selectedStartTime != null && selectedEndTime != null && selectedEndTime!.isAfter(selectedStartTime!))
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF8E1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.orange.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.orange[600], size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Thông tin thuê',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.orange[800],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Thời gian thuê:', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                              const SizedBox(height: 4),
                              Text(
                                '${totalHours.toStringAsFixed(1)} giờ',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey[800]),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Chi phí:', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                              const SizedBox(height: 4),
                              Text(
                                '${formatXu(totalCoin)} xu',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.orange[700]),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bắt đầu', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Colors.grey[800])),
                      const SizedBox(height: 6),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.access_time, size: 18, color: Color(0xFFFFA726)),
                        label: Text(selectedStartTime == null
                            ? 'Chọn thời gian'
                            : '${selectedStartTime!.day}/${selectedStartTime!.month} ${selectedStartTime!.hour}:${selectedStartTime!.minute.toString().padLeft(2, '0')}',
                          style: TextStyle(color: Colors.grey[800])),
                        onPressed: () async {
                          final now = DateTime.now();
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: now,
                            firstDate: now,
                            lastDate: now.add(const Duration(days: 7)),
                          );
                          if (picked != null) {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(now.add(const Duration(minutes: 1))),
                            );
                            if (time != null) {
                              setState(() {
                                selectedStartTime = DateTime(
                                  picked.year, picked.month, picked.day, time.hour, time.minute,
                                );
                              });
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFF3E0),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Kết thúc', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Colors.grey[800])),
                      const SizedBox(height: 6),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.access_time_filled, size: 18, color: Color(0xFFFFA726)),
                        label: Text(selectedEndTime == null
                            ? 'Chọn thời gian'
                            : '${selectedEndTime!.day}/${selectedEndTime!.month} ${selectedEndTime!.hour}:${selectedEndTime!.minute.toString().padLeft(2, '0')}',
                          style: TextStyle(color: Colors.grey[800])),
                        onPressed: () async {
                          final now = selectedStartTime ?? DateTime.now();
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: now,
                            firstDate: now,
                            lastDate: now.add(const Duration(days: 7)),
                          );
                          if (picked != null) {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(now.add(const Duration(hours: 1))),
                            );
                            if (time != null) {
                              setState(() {
                                selectedEndTime = DateTime(
                                  picked.year, picked.month, picked.day, time.hour, time.minute,
                                );
                              });
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFF3E0),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (selectedStartTime != null && selectedEndTime != null && !selectedEndTime!.isAfter(selectedStartTime!))
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text('Thời gian kết thúc phải sau thời gian bắt đầu!', style: TextStyle(color: Colors.red[400], fontWeight: FontWeight.w500)),
              ),
            const SizedBox(height: 22),
            const Text('Yêu cầu đặc biệt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF616161))),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: Color(0xFFF5F7FA),
                borderRadius: BorderRadius.circular(18),
              ),
              child: TextField(
                controller: messageController,
                maxLines: 3,
                style: TextStyle(color: Colors.grey[800]),
                decoration: const InputDecoration(
                  hintText: 'Bạn muốn player lưu ý điều gì? (VD: Chơi vị trí xạ thủ, không nói tục... )',
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFFFB74D), Color(0xFFFFE082)]),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.orange.withOpacity(0.12),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
                    elevation: 0,
                  ),
                  onPressed: isLoading || walletBalance == null || walletBalance! < 1 || selectedStartTime == null || selectedEndTime == null || !selectedEndTime!.isAfter(selectedStartTime!)
                      ? null
                      : _handleHire,
                  child: isLoading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text('Thuê người chơi', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
