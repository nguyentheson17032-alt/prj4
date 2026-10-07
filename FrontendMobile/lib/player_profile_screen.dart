import 'package:flutter/material.dart';
import 'api_service.dart';
import 'package:intl/intl.dart';
import 'config/api_config.dart';

class PlayerProfileScreen extends StatefulWidget {
  final String playerUserId;
  const PlayerProfileScreen({Key? key, required this.playerUserId}) : super(key: key);

  @override
  State<PlayerProfileScreen> createState() => _PlayerProfileScreenState();
}

class _PlayerProfileScreenState extends State<PlayerProfileScreen> {
  Map<String, dynamic>? playerInfo;
  Map<String, dynamic>? userInfo;
  Map<String, dynamic>? ratingSummary;
  List<dynamic> moments = [];
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() { isLoading = true; error = null; });
    try {
      // Lấy player theo userId
      final players = await ApiService.fetchPlayersByUser(int.parse(widget.playerUserId));
      Map<String, dynamic>? player;
      if (players.isNotEmpty) {
        player = players[0];
        // Lấy chi tiết player nếu có id
        if (player != null && player['id'] != null) {
          final detail = await ApiService.fetchPlayerById(player['id']);
          if (detail != null) player = detail;
        }
      }
      final user = await ApiService.getUserById(int.parse(widget.playerUserId));
      final rating = player != null && player['id'] != null
          ? await ApiService.getPlayerRatingSummary(player['id'].toString())
          : null;
      final playerMoments = player != null && player['id'] != null
          ? await ApiService.fetchPlayerMoments(player['id'].toString())
          : [];
      setState(() {
        playerInfo = player;
        userInfo = user;
        ratingSummary = rating;
        moments = playerMoments;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Lỗi khi tải thông tin player: $e';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final avatarUrl = '${ApiConfig.baseUrl}/api/auth/avatar/${widget.playerUserId}';
    final name = playerInfo?['username'] ?? playerInfo?['fullName'] ?? userInfo?['fullName'] ?? userInfo?['username'] ?? '';
    final phone = playerInfo?['phoneNumber'] ?? userInfo?['phoneNumber'] ?? '';
    final game = playerInfo?['gameName'] ?? playerInfo?['game']?['name'] ?? '';
    final role = playerInfo?['role'] ?? '';
    final rank = playerInfo?['rank'] ?? '';
    final price = playerInfo?['pricePerHour'];
    String priceDisplay = '';
    if (price != null) {
      priceDisplay = NumberFormat.decimalPattern('vi').format(price) + ' xu/h';
    }
    final description = playerInfo?['description'] ?? '';
    final server = playerInfo?['server'] ?? '';
    final rating = ratingSummary?['averageRating']?.toStringAsFixed(2) ?? '--';
    final totalReviews = ratingSummary?['totalReviews']?.toString() ?? '0';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông tin Player', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        centerTitle: true,
        elevation: 0,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: CircleAvatar(
                          radius: 48,
                          backgroundColor: Colors.deepOrange.withOpacity(0.1),
                          backgroundImage: NetworkImage(avatarUrl),
                          onBackgroundImageError: (_, __) {},
                          child: Container(),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Center(
                        child: Text(
                          name,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.deepOrange),
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (phone.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.phone, color: Colors.green, size: 20),
                            const SizedBox(width: 8),
                            Text(phone, style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      if (game.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.sports_esports, color: Colors.deepOrange, size: 20),
                            const SizedBox(width: 8),
                            Text(game, style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      if (role.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.person_pin, color: Colors.amber, size: 20),
                            const SizedBox(width: 8),
                            Text(role, style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      if (rank.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.emoji_events, color: Colors.blue, size: 20),
                            const SizedBox(width: 8),
                            Text(rank, style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      if (priceDisplay.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.attach_money, color: Colors.green, size: 20),
                            const SizedBox(width: 8),
                            Text(priceDisplay, style: const TextStyle(fontSize: 16)),
                          ],
                        ),
                      const SizedBox(height: 18),
                      // Thông tin player đẹp hơn
                      if (description.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Card(
                            color: Colors.white,
                            elevation: 4,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
                              child: Center(
                                child: Text(
                                  description,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    color: Colors.deepOrange,
                                    fontWeight: FontWeight.bold,
                                    fontStyle: FontStyle.italic,
                                    height: 1.5,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      const SizedBox(height: 18),
                      const Text('Tất cả khoảnh khắc', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      const SizedBox(height: 10),
                      ...moments.map((moment) {
                        final imageUrls = moment['imageUrls'] as List?;
                        final imageUrl = (imageUrls != null && imageUrls.isNotEmpty)
                            ? '${ApiConfig.baseUrl}/api/moments/moment-images/' + (imageUrls[0] as String).split('/').last
                            : null;
                        return Card(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                          elevation: 2,
                          color: Colors.white,
                          margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 0),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(14),
                                  child: imageUrl != null
                                      ? Image.network(
                                          imageUrl,
                                          width: double.infinity,
                                          height: 140,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stack) => Container(
                                            height: 140,
                                            color: Colors.grey[200],
                                            child: const Center(child: Icon(Icons.broken_image, size: 40, color: Colors.grey)),
                                          ),
                                        )
                                      : Container(
                                          height: 140,
                                          color: Colors.grey[200],
                                          child: const Center(child: Icon(Icons.image, size: 40, color: Colors.grey)),
                                        ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  (moment['content'] as String?) ?? '',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  (moment['createdAt'] as String?) ?? '',
                                  style: const TextStyle(fontSize: 13, color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ],
                  ),
                ),
    );
  }
} 