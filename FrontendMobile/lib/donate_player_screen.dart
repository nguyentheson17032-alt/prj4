import 'package:flutter/material.dart';
import 'api_service.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'config/api_config.dart';

class DonatePlayerScreen extends StatefulWidget {
  final Map<String, dynamic> player;
  const DonatePlayerScreen({super.key, required this.player});

  @override
  State<DonatePlayerScreen> createState() => _DonatePlayerScreenState();
}

class _DonatePlayerScreenState extends State<DonatePlayerScreen> {
  final TextEditingController amountController = TextEditingController();
  final TextEditingController messageController = TextEditingController();
  int? coinBalance;
  bool isLoadingBalance = true;
  Uint8List? avatarBytes;
  Uint8List? coverImageBytes;

  @override
  void initState() {
    super.initState();
    loadCoinBalance();
    _loadAvatar();
    _loadCoverImage();
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

  Future<void> loadCoinBalance() async {
    try {
      print('Đang gọi getCurrentUser...');
      final userInfo = await ApiService.getCurrentUser();
      print('Kết quả getCurrentUser: $userInfo');
      setState(() {
        coinBalance = userInfo?['coin'] ?? 0;
        isLoadingBalance = false;
      });
    } catch (e) {
      print('Lỗi getCurrentUser: $e');
      setState(() {
        isLoadingBalance = false;
      });
    }
  }

  @override
  void dispose() {
    amountController.dispose();
    messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final player = widget.player;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Donate người chơi'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      backgroundColor: const Color(0xFFF7F7F9),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Card thông tin player với ảnh bìa
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
                      player['username'] ?? '',
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
                    child: Text(
                      '${player['pricePerHour']?.toString().replaceAllMapped(RegExp(r"\B(?=(\d{3})+(?!\d))"), (match) => ".") ?? ''} xu/h',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Text('Số dư xu', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 4),
            isLoadingBalance
                ? const CircularProgressIndicator()
                : Text(
                    '${coinBalance?.toString() ?? '0'} xu',
                    style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
            const SizedBox(height: 24),
            const Text('Số xu donate:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 8),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Nhập số xu',
                prefixIcon: const Icon(Icons.monetization_on, color: Colors.amber),
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
              ),
            ),
            const SizedBox(height: 24),
            const Text('Gửi tin nhắn', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 8),
            TextField(
              controller: messageController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Nhập tin nhắn',
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE75A3C),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(32),
                  ),
                ),
                onPressed: () async {
                  final coin = int.tryParse(amountController.text) ?? 0;
                  if (coin < 1) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Số xu donate phải lớn hơn 0')),
                    );
                    return;
                  }
                  final error = await ApiService.donatePlayer(
                    playerId: widget.player['id'] is int ? widget.player['id'] : int.tryParse(widget.player['id'].toString()) ?? 0,
                    coin: coin,
                    message: messageController.text.trim(),
                  );
                  if (error == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Donate thành công!')),
                    );
                    Navigator.pop(context);
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(error)),
                    );
                  }
                },
                child: const Text('Donate', style: TextStyle(fontSize: 18, color: Colors.white)),
              ),
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
          ],
        ),
      ),
    );
  }
} 