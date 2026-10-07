import 'package:flutter/material.dart';
import 'player_profile_screen.dart';
import 'config/api_config.dart';

class MomentDetailScreen extends StatelessWidget {
  final Map<String, dynamic> moment;
  const MomentDetailScreen({Key? key, required this.moment}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Debug: Print the entire moment object
    print('🖼️ MomentDetailScreen: Full moment data = $moment');
    
    final imageUrls = moment['imageUrls'] as List?;
    print('🖼️ MomentDetailScreen: imageUrls type = ${imageUrls.runtimeType}');
    print('🖼️ MomentDetailScreen: imageUrls = $imageUrls');
    
    String? imageUrl;
    if (imageUrls != null && imageUrls.isNotEmpty) {
      final firstImage = imageUrls[0];
      print('🖼️ MomentDetailScreen: firstImage = $firstImage (type: ${firstImage.runtimeType})');
      
      if (firstImage is String) {
        final fileName = firstImage.split('/').last;
        imageUrl = '${ApiConfig.baseUrl}/api/moments/moment-images/$fileName';
        print('🖼️ MomentDetailScreen: fileName = $fileName');
      } else {
        print('🖼️ MomentDetailScreen: firstImage is not a String!');
      }
    }
    
    print('🖼️ MomentDetailScreen: Final imageUrl = $imageUrl');
    
    final userId = moment['playerUserId']?.toString();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết khoảnh khắc', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        centerTitle: true,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: imageUrl != null
                  ? Image.network(
                      imageUrl,
                      width: double.infinity,
                      height: 260,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          height: 260,
                          color: Colors.grey[200],
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                CircularProgressIndicator(
                                  value: loadingProgress.expectedTotalBytes != null
                                      ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                      : null,
                                  color: Colors.deepOrange,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Đang tải ảnh...',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stack) {
                        print('❌ MomentDetailScreen: Lỗi tải ảnh từ URL 1: $error');
                        print('❌ MomentDetailScreen: URL 1: $imageUrl');
                        
                        // Thử fallback URL
                        final fallbackUrl = imageUrls != null && imageUrls.isNotEmpty
                            ? '${ApiConfig.baseUrl}/api/moments/images/${imageUrls[0].toString().split('/').last}'
                            : null;
                        
                        if (fallbackUrl != null && fallbackUrl != imageUrl) {
                          print('🔄 MomentDetailScreen: Thử fallback URL: $fallbackUrl');
                          return Image.network(
                            fallbackUrl,
                            width: double.infinity,
                            height: 260,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error2, stack2) {
                              print('❌ MomentDetailScreen: Lỗi tải ảnh từ fallback URL: $error2');
                              return _buildErrorContainer(imageUrl, fallbackUrl);
                            },
                          );
                        }
                        
                        return _buildErrorContainer(imageUrl, null);
                      },
                    )
                  : Container(
                      height: 260,
                      color: Colors.grey[200],
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.image, size: 80, color: Colors.grey),
                            SizedBox(height: 16),
                            Text(
                              'Không có ảnh',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                GestureDetector(
                  onTap: () {
                    if (userId != null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PlayerProfileScreen(playerUserId: userId),
                        ),
                      );
                    }
                  },
                  child: CircleAvatar(
                    radius: 24,
                    backgroundColor: Colors.deepOrange.withOpacity(0.1),
                    backgroundImage: userId != null
                        ? NetworkImage('${ApiConfig.baseUrl}/api/auth/avatar/$userId')
                        : null,
                    onBackgroundImageError: (_, __) {},
                    child: userId == null
                        ? const Icon(Icons.person, color: Colors.deepOrange)
                        : null,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    moment['gamePlayerUsername'] ?? '',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.deepOrange),
                  ),
                ),
                Text(
                  moment['createdAt'] ?? '',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              moment['content'] ?? '',
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w600, color: Colors.black87, height: 1.5),
            ),
            const SizedBox(height: 18),
            if (moment['gameName'] != null)
              Row(
                children: [
                  const Icon(Icons.sports_esports, color: Colors.deepOrange, size: 20),
                  const SizedBox(width: 6),
                  Text(
                    moment['gameName'],
                    style: const TextStyle(fontSize: 15, color: Colors.deepOrange, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorContainer(String? originalUrl, String? fallbackUrl) {
    return Container(
      height: 260,
      color: Colors.grey[200],
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.broken_image, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'Không thể tải ảnh',
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'URL: ${originalUrl?.substring(0, originalUrl!.length > 50 ? 50 : originalUrl!.length)}...',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
            textAlign: TextAlign.center,
          ),
          if (fallbackUrl != null) ...[
            const SizedBox(height: 8),
            Text(
              'Fallback URL: ${fallbackUrl.substring(0, fallbackUrl.length > 50 ? 50 : fallbackUrl.length)}...',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
} 