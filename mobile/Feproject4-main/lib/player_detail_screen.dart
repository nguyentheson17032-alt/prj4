import 'package:flutter/material.dart';
import 'hire_player_screen.dart';
import 'donate_player_screen.dart';
import 'chat_screen.dart';
import 'api_service.dart';
import 'utils/notification_helper.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'config/api_config.dart';
import 'package:file_picker/file_picker.dart';

String fixImageUrl(String url) {
  if (url.startsWith('http')) return url;
  return 'http://10.0.2.2:8080/$url';
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  const _StatItem({required this.label, required this.value, this.icon});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (icon != null) Icon(icon, color: Colors.grey, size: 28),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.deepOrange)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54), textAlign: TextAlign.center),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  final String title;
  final bool selected;
  const _TabButton({required this.title, this.selected = false});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: selected ? Colors.orange : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange),
      ),
      child: Center(
        child: Text(
          title,
          style: TextStyle(
            color: selected ? Colors.white : Colors.orange,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class PlayerDetailScreen extends StatefulWidget {
  final Map<String, dynamic> player;
  const PlayerDetailScreen({super.key, required this.player});

  @override
  State<PlayerDetailScreen> createState() => _PlayerDetailScreenState();
}

class _PlayerDetailScreenState extends State<PlayerDetailScreen> {
  int followerCount = 0;
  int hireHours = 0;
  bool isLoadingStats = true;
  bool isFollowing = false;
  bool isLoadingFollow = false;
  int selectedTab = 0; // 0: Thông tin, 1: Đánh giá, 2: Thành tích
  double? averageRating;
  int? totalReviews;
  List<String> playerImages = [];
  bool isLoadingImages = true;
  Uint8List? avatarBytes;
  int? totalHireHours;
  bool isLoadingHireHours = true;
  Uint8List? coverImageBytes;

  // Thêm biến cho completionRate
  double? completionRate;
  bool isLoadingCompletionRate = true;

  @override
  void initState() {
    super.initState();
    _loadCoverImage();
    _loadStats();
    _checkFollowing();
    _loadRatingSummary();
    _loadPlayerImages();
    _loadAvatar();
    _loadHireHours();
    _loadCompletionRate();
  }

  Future<void> _loadStats() async {
    final id = widget.player['id'] is int ? widget.player['id'] : int.tryParse(widget.player['id'].toString() ?? '');
    if (id != null) {
      final followers = await ApiService.fetchFollowerCount(id);
      final hours = await ApiService.fetchHireHours(id);
      setState(() {
        followerCount = followers;
        hireHours = hours;
        isLoadingStats = false;
      });
    }
  }

  Future<void> _checkFollowing() async {
    final id = widget.player['id'] is int ? widget.player['id'] : int.tryParse(widget.player['id'].toString() ?? '');
    if (id != null) {
      final following = await ApiService.checkFollowing(id);
      setState(() {
        isFollowing = following;
      });
    }
  }

  Future<void> _handleFollow() async {
    setState(() { isLoadingFollow = true; });
    final id = widget.player['id'] is int ? widget.player['id'] : int.tryParse(widget.player['id'].toString() ?? '');
    print('[LOG] Bắt đầu gửi request theo dõi player: $id');
    if (id != null) {
      bool success = false;
      final wasFollowing = isFollowing; // Lưu trạng thái trước khi gọi API
      if (!isFollowing) {
        success = await ApiService.followPlayer(id);
        print('[LOG] Kết quả followPlayer: $success');
      } else {
        success = await ApiService.unfollowPlayer(id);
        print('[LOG] Kết quả unfollowPlayer: $success');
      }
      if (success) {
        setState(() {
          isFollowing = !wasFollowing;
        });
        await _loadStats();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(!wasFollowing ? 'Đã theo dõi người chơi!' : 'Đã hủy theo dõi!')),
        );
      } else {
        print('[LOG] Theo dõi thất bại! (wasFollowing: $wasFollowing)');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(!wasFollowing ? 'Theo dõi thất bại!' : 'Hủy theo dõi thất bại!')),
        );
      }
    } else {
      print('[LOG] ID player không hợp lệ!');
    }
    setState(() { isLoadingFollow = false; });
  }

  Future<void> _loadRatingSummary() async {
    final id = widget.player['id']?.toString();
    if (id != null) {
      final summary = await ApiService.getPlayerRatingSummary(id);
      setState(() {
        averageRating = summary?['averageRating']?.toDouble() ?? 0.0;
        totalReviews = summary?['totalReviews']?.toInt() ?? 0;
      });
    }
  }

  Future<void> _loadPlayerImages() async {
    final id = widget.player['id']?.toString();
    if (id != null) {
      final images = await ApiService.getPlayerImages(id);
      setState(() {
        playerImages = images;
        isLoadingImages = false;
      });
    }
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

  Future<void> _loadHireHours() async {
    setState(() { isLoadingHireHours = true; });
    final playerId = widget.player['id']?.toString();
    if (playerId == null) return;
    try {
      final token = await ApiService.storage.read(key: 'jwt');
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/players/$playerId/hire-hours',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );
      if (response.statusCode == 200) {
        setState(() {
          totalHireHours = response.data['totalHireHours'] ?? 0;
          isLoadingHireHours = false;
        });
      } else {
        setState(() { isLoadingHireHours = false; });
      }
    } catch (_) {
      setState(() { isLoadingHireHours = false; });
    }
  }

  Future<void> _loadCompletionRate() async {
    final id = widget.player['id'] is int ? widget.player['id'] : int.tryParse(widget.player['id'].toString() ?? '');
    if (id != null) {
      final stats = await ApiService.fetchPlayerStats(id);
      setState(() {
        completionRate = stats != null && stats['completionRate'] != null
            ? (stats['completionRate'] is int ? (stats['completionRate'] as int).toDouble() : stats['completionRate'] as double)
            : 0.0;
        isLoadingCompletionRate = false;
      });
    } else {
      setState(() {
        completionRate = 0.0;
        isLoadingCompletionRate = false;
      });
    }
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

  Widget _buildPlayerInfo(Map<String, dynamic> player) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Card(
        elevation: 3,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        color: Colors.white,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.person, color: Colors.deepOrange, size: 22),
                  const SizedBox(width: 8),
                  Text('Tên:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(player['username'] ?? '', style: TextStyle(color: Colors.black87))),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.attach_money, color: Colors.amber, size: 22),
                  const SizedBox(width: 8),
                  Text('Giá thuê:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_formatXuPerHour(player['pricePerHour']), style: TextStyle(color: Colors.black87))),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.circle, color: player['status'] == 'AVAILABLE' ? Colors.green : Colors.red, size: 18),
                  const SizedBox(width: 8),
                  Text('Trạng thái:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(player['status'] ?? '', style: TextStyle(color: Colors.black87))),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: Colors.blue, size: 22),
                  const SizedBox(width: 8),
                  Text('Mô tả:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(player['description'] ?? '', style: TextStyle(color: Colors.black87))),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Expanded(child: Text(value ?? '', style: const TextStyle(color: Colors.black87))),
        ],
      ),
    );
  }

  String _formatXuPerHour(dynamic price) {
    return '${formatXu(price)} xu/h';
  }

  String fixedUrl(String url) {
    return url.replaceFirst('http://localhost:', 'http://10.0.2.2:');
  }

  void _showAllImages({int initialIndex = 0}) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.8),
      builder: (_) {
        final controller = PageController(initialPage: initialIndex);
        final pageNotifier = ValueNotifier<int>(initialIndex);
        controller.addListener(() {
          if (controller.page != null) {
            pageNotifier.value = controller.page!.round();
          }
        });
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(12),
          child: Stack(
            children: [
              PageView.builder(
                controller: controller,
                itemCount: playerImages.length,
                itemBuilder: (context, index) {
                  return Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        playerImages[index],
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            width: 300,
                            height: 300,
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  color: Colors.grey,
                                  size: 48,
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Không thể tải ảnh',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          );
                        },
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            width: 300,
                            height: 300,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: CircularProgressIndicator(
                                strokeWidth: 3,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.orange),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  );
                },
              ),
              // Indicator
              Positioned(
                bottom: 16,
                left: 0, right: 0,
                child: Center(
                  child: ValueListenableBuilder<int>(
                    valueListenable: pageNotifier,
                    builder: (context, page, _) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${page + 1} / ${playerImages.length}',
                          style: const TextStyle(color: Colors.white, fontSize: 16),
                        ),
                      );
                    },
                  ),
                ),
              ),
              // Close button
              Positioned(
                top: 8, right: 8,
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPlayerImagesGallery() {
    final int maxShow = 5;
    final int totalImages = playerImages.length;
    final List<String> showImages = totalImages > maxShow ? playerImages.sublist(0, maxShow) : playerImages;
    final int remain = totalImages - maxShow;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(showImages.length, (index) {
          final img = showImages[index];
          final isLast = index == maxShow - 1 && remain > 0;
            return Padding(
              padding: EdgeInsets.only(right: index < showImages.length - 1 ? 8.0 : 0.0),
              child: GestureDetector(
            onTap: () => _showAllImages(initialIndex: index),
            child: Stack(
              alignment: Alignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        img, 
                        width: 60, 
                        height: 60, 
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.error_outline,
                              color: Colors.grey,
                              size: 24,
                            ),
                          );
                        },
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Center(
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.orange),
                              ),
                            ),
                          );
                        },
                      ),
                ),
                if (isLast)
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        '+$remain',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                      ),
                    ),
                  ),
              ],
                ),
            ),
          );
        }),
        ),
      ),
    );
  }

  void _showImageDialog(Uint8List imageBytes) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.9),
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(8),
        child: GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: InteractiveViewer(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.memory(imageBytes, fit: BoxFit.contain),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final player = widget.player;
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      appBar: AppBar(
        title: Text('Chi tiết ${player['username'] ?? ''}',
          style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Ảnh bìa + avatar
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Ảnh bìa
                Container(
                  width: double.infinity,
                  height: 140,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(32),
                      bottomRight: Radius.circular(32),
                    ),
                  ),
                  child: coverImageBytes != null
                      ? GestureDetector(
                          onTap: () => _showImageDialog(coverImageBytes!),
                          child: ClipRRect(
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(32),
                            bottomRight: Radius.circular(32),
                          ),
                          child: Image.memory(
                            coverImageBytes!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: 140,
                            ),
                          ),
                        )
                      : Center(child: Icon(Icons.image, size: 64, color: Colors.grey[400])),
                ),
                // Avatar chồng lên ảnh bìa
                Positioned(
                  left: 0,
                  right: 0,
                  top: 90,
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        if (avatarBytes != null) _showImageDialog(avatarBytes!);
                      },
                    child: CircleAvatar(
                      radius: 56,
                      backgroundColor: const Color(0xFFFFF3E0),
                      child: CircleAvatar(
                        radius: 52,
                        backgroundColor: const Color(0xFFFFE0B2),
                        backgroundImage: avatarBytes != null ? MemoryImage(avatarBytes!) : null,
                        child: avatarBytes == null
                            ? const Icon(Icons.person, size: 52, color: Color(0xFFFFA726))
                            : null,
                        ),
                      ),
                    ),
                  ),
                ),
                // Online indicator giữ nguyên nếu có
                Positioned(
                  top: 170,
                  right: MediaQuery.of(context).size.width / 2 - 56 - 16,
                  child: CircleAvatar(
                    radius: 10,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.circle, color: Colors.green, size: 18),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 56),
            Text(
              player['username'] ?? '',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.grey[800]),
            ),
            const SizedBox(height: 4),
            // Đánh giá và theo dõi
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (averageRating != null)
                  Row(
                    children: [
                      ...List.generate(5, (i) => Icon(
                        i < averageRating!.round()
                            ? Icons.star
                            : (i < averageRating! ? Icons.star_half : Icons.star_border),
                        color: Colors.amber,
                        size: 20,
                      )),
                      const SizedBox(width: 6),
                      Text(
                        '(${totalReviews ?? 0} đánh giá)',
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isFollowing ? Colors.grey[400] : const Color(0xFFFFB74D),
                    shape: const StadiumBorder(),
                  ),
                  onPressed: isLoadingFollow ? null : _handleFollow,
                  icon: isLoadingFollow
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Icon(isFollowing ? Icons.remove_circle_outline : Icons.favorite, color: Colors.white, size: 18),
                  label: Text(isFollowing ? 'Hủy theo dõi' : 'Theo dõi', style: const TextStyle(color: Colors.white)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Nút thuê lớn ở giữa
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.orange.withOpacity(0.06),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          const SizedBox(height: 16),
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.orange, width: 2),
                            ),
                            padding: const EdgeInsets.all(8),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(24),
                              onTap: () async {
                                // Kiểm tra xem user hiện tại có phải là chủ sở hữu player không
                                final userInfo = await ApiService.getCurrentUser();
                                final currentUserId = userInfo?['id'];
                                final playerOwnerId = player['user']?['id'];
                                
                                if (currentUserId != null && playerOwnerId != null && currentUserId == playerOwnerId) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Bạn không thể donate cho chính mình!')),
                                  );
                                  return;
                                }
                                
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => DonatePlayerScreen(player: player),
                                  ),
                                );
                              },
                              child: const Icon(Icons.attach_money, color: Colors.orange, size: 28),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(32),
                            ),
                            elevation: 0,
                            backgroundColor: const Color(0xFFFFB74D),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => HirePlayerScreen(player: player),
                              ),
                            );
                          },
                          child: Text(
                            'Thuê\n${_formatXuPerHour(player['pricePerHour'])}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          const SizedBox(height: 16),
                          Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.orange, width: 2),
                            ),
                            padding: const EdgeInsets.all(8),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(24),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ChatScreen(player: player, user: player['user']),
                                  ),
                                );
                              },
                              child: const Icon(Icons.chat_bubble_outline, color: Colors.orange, size: 28),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Các chỉ số
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _StatItem(label: 'Người\nTheo dõi', value: isLoadingStats ? '...' : followerCount.toString()),
                  _StatItem(label: 'Giờ\nĐược thuê', value: isLoadingHireHours ? '...' : (totalHireHours?.toString() ?? '0')),
                  // Đã bỏ % hoàn thành
                  Builder(
                    builder: (context) {
                      return GestureDetector(
                        onTap: () async {
                          String? reason;
                          String? description;
                          String? selectedVideoPath;
                          final reasonController = TextEditingController();
                          final descriptionController = TextEditingController();
                          
                          await showDialog(
                            context: context,
                            builder: (context) {
                              return StatefulBuilder(
                                builder: (context, setDialogState) {
                              return Dialog(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                                elevation: 8,
                                backgroundColor: Colors.white,
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        decoration: BoxDecoration(
                                          color: Colors.red.withOpacity(0.1),
                                          shape: BoxShape.circle,
                                        ),
                                        padding: const EdgeInsets.all(16),
                                        child: const Icon(Icons.report, color: Colors.red, size: 40),
                                      ),
                                      const SizedBox(height: 16),
                                      const Text(
                                        'Báo cáo người chơi',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.deepOrange),
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: 18),
                                      TextField(
                                        controller: reasonController,
                                        decoration: InputDecoration(
                                          labelText: 'Lý do',
                                          hintText: 'Nhập lý do báo cáo',
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                        ),
                                        onChanged: (value) => reason = value,
                                      ),
                                      const SizedBox(height: 14),
                                      TextField(
                                        controller: descriptionController,
                                        minLines: 2,
                                        maxLines: 4,
                                        decoration: InputDecoration(
                                          labelText: 'Mô tả',
                                          hintText: 'Mô tả chi tiết vấn đề',
                                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                        ),
                                        onChanged: (value) => description = value,
                                      ),
                                      const SizedBox(height: 14),
                                          // Video selection section
                                          Container(
                                            width: double.infinity,
                                            padding: const EdgeInsets.all(16),
                                            decoration: BoxDecoration(
                                              border: Border.all(color: Colors.grey[300]!),
                                              borderRadius: BorderRadius.circular(16),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Video bằng chứng (tùy chọn)',
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 14,
                                                    color: Colors.black87,
                                                  ),
                                                ),
                                                const SizedBox(height: 8),
                                                if (selectedVideoPath != null) ...[
                                                  Container(
                                                    padding: const EdgeInsets.all(8),
                                                    decoration: BoxDecoration(
                                                      color: Colors.green[50],
                                                      borderRadius: BorderRadius.circular(8),
                                                      border: Border.all(color: Colors.green[200]!),
                                                    ),
                                                    child: Row(
                                                      children: [
                                                        const Icon(Icons.video_file, color: Colors.green, size: 20),
                                                        const SizedBox(width: 8),
                                                        Expanded(
                                                          child: Text(
                                                            selectedVideoPath!.split('/').last,
                                                            style: const TextStyle(fontSize: 12),
                                                            overflow: TextOverflow.ellipsis,
                                                          ),
                                                        ),
                                                        IconButton(
                                                          icon: const Icon(Icons.close, size: 16),
                                                          onPressed: () {
                                                            setDialogState(() {
                                                              selectedVideoPath = null;
                                                            });
                                                          },
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  const SizedBox(height: 8),
                                                ],
                                                ElevatedButton.icon(
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: Colors.blue[50],
                                                    foregroundColor: Colors.blue[700],
                                                    elevation: 0,
                                                    shape: RoundedRectangleBorder(
                                                      borderRadius: BorderRadius.circular(12),
                                                      side: BorderSide(color: Colors.blue[200]!),
                                                    ),
                                                  ),
                                                  icon: const Icon(Icons.video_library, size: 20),
                                                  label: const Text('Chọn video từ máy'),
                                                  onPressed: () async {
                                                    try {
                                                      FilePickerResult? result = await FilePicker.platform.pickFiles(
                                                        type: FileType.video,
                                                        allowMultiple: false,
                                                      );
                                                      
                                                      if (result != null && result.files.isNotEmpty) {
                                                        final file = result.files.first;
                                                        if (file.path != null) {
                                                          // Check file size (max 50MB)
                                                          final fileSize = file.size;
                                                          if (fileSize > 50 * 1024 * 1024) {
                                                            ScaffoldMessenger.of(context).showSnackBar(
                                                              const SnackBar(
                                                                content: Text('Video quá lớn! Kích thước tối đa là 50MB.'),
                                                                backgroundColor: Colors.red,
                                                              ),
                                                            );
                                                            return;
                                                          }
                                                          
                                                          setDialogState(() {
                                                            selectedVideoPath = file.path;
                                                          });
                                                        }
                                                      }
                                                    } catch (e) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        SnackBar(
                                                          content: Text('Lỗi khi chọn video: $e'),
                                                          backgroundColor: Colors.red,
                                                        ),
                                                      );
                                                    }
                                                  },
                                                ),
                                              ],
                                        ),
                                      ),
                                      const SizedBox(height: 22),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton(
                                              style: OutlinedButton.styleFrom(
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                                side: const BorderSide(color: Colors.deepOrange),
                                                padding: const EdgeInsets.symmetric(vertical: 14),
                                              ),
                                              child: const Text('Hủy', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
                                              onPressed: () => Navigator.pop(context),
                                            ),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: ElevatedButton(
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: Colors.deepOrange,
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                                padding: const EdgeInsets.symmetric(vertical: 14),
                                              ),
                                              child: const Text('Gửi báo cáo', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                              onPressed: () {
                                                if ((reasonController.text).isNotEmpty && (descriptionController.text).isNotEmpty) {
                                                  reason = reasonController.text;
                                                  description = descriptionController.text;
                                                  Navigator.pop(context);
                                                }
                                              },
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                            },
                          );
                          
                          if ((reason ?? '').isNotEmpty && (description ?? '').isNotEmpty) {
                            String? error;
                            
                            if (selectedVideoPath != null) {
                              // Use new API with video file
                              error = await ApiService.reportPlayerWithVideo(
                              reportedPlayerId: widget.player['id'] is int ? widget.player['id'] : int.parse(widget.player['id'].toString()),
                              reason: reason!,
                              description: description!,
                                videoFilePath: selectedVideoPath!,
                              );
                            } else {
                              // Use old API without video
                              error = await ApiService.reportPlayer(
                                reportedPlayerId: widget.player['id'] is int ? widget.player['id'] : int.parse(widget.player['id'].toString()),
                                reason: reason!,
                                description: description!,
                                video: null,
                            );
                            }
                            
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(error == null ? 'Báo cáo thành công!' : error),
                                backgroundColor: error == null ? Colors.green : Colors.red,
                              ),
                            );
                          }
                        },
                        child: Column(
                          children: const [
                            Icon(Icons.report, color: Colors.red, size: 28),
                            SizedBox(height: 4),
                            Text('Báo cáo', style: TextStyle(fontSize: 12, color: Colors.black54), textAlign: TextAlign.center),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Tabs
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => selectedTab = 0),
                      child: _TabButton(title: 'Thông tin', selected: selectedTab == 0),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => selectedTab = 1),
                      child: _TabButton(title: 'Đánh giá', selected: selectedTab == 1),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => selectedTab = 2),
                      child: _TabButton(title: 'Thành tích', selected: selectedTab == 2),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (selectedTab == 0) ...[
              _buildPlayerInfo(player),
              const SizedBox(height: 12),
              if (playerImages.isNotEmpty) _buildPlayerImagesGallery(),
            ],
            if (selectedTab == 1)
              _PlayerReviewsTab(playerId: player['id'].toString()),
            if (selectedTab == 2)
              _PlayerMomentsTab(playerId: player['id'].toString()),
          ],
        ),
      ),
    );
  }
}

class _PlayerReviewsTab extends StatefulWidget {
  final String playerId;
  const _PlayerReviewsTab({required this.playerId});
  @override
  State<_PlayerReviewsTab> createState() => _PlayerReviewsTabState();
}

class _PlayerReviewsTabState extends State<_PlayerReviewsTab> {
  List<dynamic> reviews = [];
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _fetchReviews();
  }

  Future<void> _fetchReviews() async {
    setState(() { isLoading = true; error = null; });
    try {
      final fetched = await ApiService.getPlayerReviews(widget.playerId);
      setState(() {
        reviews = fetched ?? [];
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Lỗi khi tải đánh giá: $e';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (error != null) {
      return Center(child: Text(error!));
    }
    if (reviews.isEmpty) {
      return const Center(child: Text('Chưa có đánh giá nào.'));
    }
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: reviews.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (context, index) {
        final review = reviews[index];
        return Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundImage: (review['playerAvatar'] != null && review['playerAvatar'].toString().isNotEmpty)
                          ? NetworkImage(fixImageUrl(review['playerAvatar']))
                          : (review['reviewerAvatar'] != null && review['reviewerAvatar'].toString().isNotEmpty)
                          ? NetworkImage(fixImageUrl(review['reviewerAvatar']))
                          : null,
                      backgroundColor: Colors.deepOrange.shade50,
                      child: ((review['playerAvatar'] == null || review['playerAvatar'].toString().isEmpty) && (review['reviewerAvatar'] == null || review['reviewerAvatar'].toString().isEmpty))
                          ? const Icon(Icons.person, color: Colors.deepOrange)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(review['reviewerName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                    ),
                    Row(
                      children: List.generate(5, (i) => Icon(
                        Icons.star,
                        size: 20,
                        color: i < (review['rating'] ?? 0) ? Colors.amber : Colors.grey[300],
                      )),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (review['comment'] != null && review['comment'].toString().isNotEmpty)
                  Text('"${review['comment']}"', style: const TextStyle(fontStyle: FontStyle.italic)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(review['createdAt'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PlayerMomentsTab extends StatefulWidget {
  final String playerId;
  const _PlayerMomentsTab({required this.playerId});
  @override
  State<_PlayerMomentsTab> createState() => _PlayerMomentsTabState();
}

class _PlayerMomentsTabState extends State<_PlayerMomentsTab> {
  List<dynamic> moments = [];
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _fetchMoments();
  }

  Future<void> _fetchMoments() async {
    setState(() { isLoading = true; error = null; });
    try {
      final fetched = await ApiService.fetchPlayerMoments(widget.playerId);
      setState(() {
        moments = fetched;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Lỗi khi tải khoảnh khắc: $e';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (error != null) {
      return Center(child: Text(error!));
    }
    if (moments.isEmpty) {
      return const Center(child: Text('Chưa có khoảnh khắc nào.'));
    }
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: moments.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (context, index) {
        final moment = moments[index];
        final imageUrl = (moment['imageUrls'] as List).isNotEmpty
            ? '${ApiConfig.baseUrl}/api/moments/moment-images/' + (moment['imageUrls'][0] as String).split('/').last
            : null;
        return Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          elevation: 3,
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
                          height: 180,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stack) => Container(
                            height: 180,
                            color: Colors.grey[200],
                            child: const Center(child: Icon(Icons.broken_image, size: 60, color: Colors.grey)),
                          ),
                        )
                      : Container(
                          height: 180,
                          color: Colors.grey[200],
                          child: const Center(child: Icon(Icons.image, size: 60, color: Colors.grey)),
                        ),
                ),
                const SizedBox(height: 12),
                Text(
                  moment['content'] ?? '',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    moment['createdAt'] ?? '',
                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
} 