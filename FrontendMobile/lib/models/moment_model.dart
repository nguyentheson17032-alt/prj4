class Moment {
  final int? id;
  final int? userId;
  final String? username;
  final String? userAvatar;
  final int? gameId;
  final String? gameName;
  final String content;
  final String? imageUrl;
  final int likesCount;
  final int viewsCount;
  final bool isLiked;
  final DateTime? createdAt;

  Moment({
    this.id,
    this.userId,
    this.username,
    this.userAvatar,
    this.gameId,
    this.gameName,
    required this.content,
    this.imageUrl,
    this.likesCount = 0,
    this.viewsCount = 0,
    this.isLiked = false,
    this.createdAt,
  });

  factory Moment.fromJson(Map<String, dynamic> json) {
    int? parsedUserId;
    String? parsedUsername;
    String? parsedUserAvatar;
    if (json['user'] is Map) {
      parsedUserId = json['user']['id'];
      parsedUsername = json['user']['username'];
      parsedUserAvatar = json['user']['avatarUrl'];
    }

    int? parsedGameId;
    String? parsedGameName;
    if (json['game'] is Map) {
      parsedGameId = json['game']['id'];
      parsedGameName = json['game']['name'];
    }

    String? parsedImageUrl;
    if (json['images'] is List && (json['images'] as List).isNotEmpty) {
      parsedImageUrl = json['images'][0]['imageUrl'] ?? json['images'][0]['image_url'] ?? json['images'][0].toString();
    } else {
      parsedImageUrl = json['imageUrl'] ?? json['image_url'];
    }

    return Moment(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      userId: parsedUserId ?? json['userId'],
      username: parsedUsername ?? json['username'],
      userAvatar: parsedUserAvatar ?? json['userAvatar'],
      gameId: parsedGameId ?? json['gameId'],
      gameName: parsedGameName ?? json['gameName'],
      content: json['content'] ?? '',
      imageUrl: parsedImageUrl,
      likesCount: json['likesCount'] ?? json['likes_count'] ?? json['likeCount'] ?? 0,
      viewsCount: json['viewsCount'] ?? json['views_count'] ?? json['viewCount'] ?? 0,
      isLiked: json['isLiked'] ?? json['liked'] ?? false,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'username': username,
      'userAvatar': userAvatar,
      'gameId': gameId,
      'gameName': gameName,
      'content': content,
      'imageUrl': imageUrl,
      'likesCount': likesCount,
      'viewsCount': viewsCount,
      'isLiked': isLiked,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
