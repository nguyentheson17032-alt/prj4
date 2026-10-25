class Player {
  final int? id;
  final String? username;
  final int? userId;
  final int? gameId;
  final String? gameName;
  final String? rank;
  final String? role;
  final String? server;
  final double pricePerHour;
  final String status;
  final String? description;
  final double rating;
  final int totalGames;
  final int winRate;
  final int followerCount;
  final int hireHours;
  final String? avatarUrl;
  final bool isAvailable;

  Player({
    this.id,
    this.username,
    this.userId,
    this.gameId,
    this.gameName,
    this.rank,
    this.role,
    this.server,
    this.pricePerHour = 0.0,
    this.status = 'AVAILABLE',
    this.description,
    this.rating = 5.0,
    this.totalGames = 0,
    this.winRate = 0,
    this.followerCount = 0,
    this.hireHours = 0,
    this.avatarUrl,
    this.isAvailable = true,
  });

  factory Player.fromJson(Map<String, dynamic> json) {
    int? parsedUserId;
    if (json['user'] != null && json['user'] is Map) {
      parsedUserId = json['user']['id'];
    } else if (json['userId'] != null) {
      parsedUserId = json['userId'] is int ? json['userId'] : int.tryParse(json['userId'].toString());
    }

    int? parsedGameId;
    String? parsedGameName;
    if (json['game'] != null && json['game'] is Map) {
      parsedGameId = json['game']['id'];
      parsedGameName = json['game']['name'];
    } else {
      parsedGameId = json['gameId'] is int ? json['gameId'] : int.tryParse(json['gameId']?.toString() ?? '');
      parsedGameName = json['gameName'];
    }

    return Player(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      username: json['username'] ?? json['user']?['username'],
      userId: parsedUserId,
      gameId: parsedGameId,
      gameName: parsedGameName,
      rank: json['rank'],
      role: json['role'],
      server: json['server'],
      pricePerHour: (json['pricePerHour'] ?? json['price_per_hour'] ?? 0).toDouble(),
      status: json['status'] ?? 'AVAILABLE',
      description: json['description'],
      rating: (json['rating'] ?? 5.0).toDouble(),
      totalGames: json['totalGames'] ?? json['total_games'] ?? 0,
      winRate: json['winRate'] ?? json['win_rate'] ?? 0,
      followerCount: json['followerCount'] ?? json['follower_count'] ?? 0,
      hireHours: json['hireHours'] ?? json['hire_hours'] ?? 0,
      avatarUrl: json['avatarUrl'] ?? json['avatar_url'] ?? json['user']?['avatarUrl'],
      isAvailable: (json['status'] ?? 'AVAILABLE').toString().toUpperCase() == 'AVAILABLE',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'userId': userId,
      'gameId': gameId,
      'gameName': gameName,
      'rank': rank,
      'role': role,
      'server': server,
      'pricePerHour': pricePerHour,
      'status': status,
      'description': description,
      'rating': rating,
      'totalGames': totalGames,
      'winRate': winRate,
      'followerCount': followerCount,
      'hireHours': hireHours,
      'avatarUrl': avatarUrl,
      'isAvailable': isAvailable,
    };
  }
}
