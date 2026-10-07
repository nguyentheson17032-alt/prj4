import 'package:flutter/material.dart';
import 'utils/notification_helper.dart';
import 'api_service.dart';
class RatePlayerScreen extends StatefulWidget {
  final String playerName;
  final String? playerAvatarUrl;
  final String? playerRank;
  final String? game;
  final String playerId;
  final String orderId; // Thêm orderId

  const RatePlayerScreen({
    Key? key,
    required this.playerName,
    required this.playerId,
    required this.orderId, // Thêm orderId
    this.playerAvatarUrl,
    this.playerRank,
    this.game,
  }) : super(key: key);

  @override
  State<RatePlayerScreen> createState() => _RatePlayerScreenState();
}

class _RatePlayerScreenState extends State<RatePlayerScreen> {
  int rating = 0;
  final TextEditingController _commentController = TextEditingController();
  bool isSubmitting = false;

  void _submitRating() async {
    if (rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn số sao đánh giá!')),
      );
      return;
    }
    setState(() { isSubmitting = true; });
    final success = await ApiService.submitOrderReview(
      orderId: widget.orderId,
      rating: rating,
      comment: _commentController.text,
    );
    setState(() { isSubmitting = false; });
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gửi đánh giá thành công!')),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gửi đánh giá thất bại!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đánh giá người chơi', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Avatar + tên + rank/game
            CircleAvatar(
              radius: 38,
              backgroundImage: (widget.playerAvatarUrl != null && widget.playerAvatarUrl!.isNotEmpty)
                  ? NetworkImage(widget.playerAvatarUrl!)
                  : null,
              child: (widget.playerAvatarUrl == null || widget.playerAvatarUrl!.isEmpty)
                  ? const Icon(Icons.person, size: 40, color: Colors.deepOrange)
                  : null,
              backgroundColor: Colors.deepOrange.shade50,
            ),
            const SizedBox(height: 12),
            Text(widget.playerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            if (widget.playerRank != null && widget.playerRank!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('Rank: ${widget.playerRank}', style: const TextStyle(color: Colors.grey)),
              ),
            if (widget.game != null && widget.game!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text('Game: ${widget.game}', style: const TextStyle(color: Colors.grey)),
              ),
            const SizedBox(height: 24),
            // Chọn số sao
            const Text('Chọn số sao đánh giá:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) => IconButton(
                icon: Icon(
                  Icons.star,
                  size: 36,
                  color: index < rating ? Colors.deepOrange : Colors.grey[300],
                ),
                onPressed: () => setState(() { rating = index + 1; }),
              )),
            ),
            const SizedBox(height: 18),
            // Nhận xét
            Container(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: TextField(
                controller: _commentController,
                minLines: 3,
                maxLines: 5,
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: 'Nhận xét của bạn về player này... (không bắt buộc)',
                ),
              ),
            ),
            const SizedBox(height: 28),
            // Nút gửi đánh giá
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isSubmitting ? null : _submitRating,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepOrange,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                child: isSubmitting
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Gửi đánh giá', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
} 