class User {
  final int? id;
  final String username;
  final String? email;
  final String? fullName;
  final String? phoneNumber;
  final String? address;
  final String? avatarUrl;
  final String? profileImageUrl;
  final String? coverImageUrl;
  final String? bio;
  final String? gender;
  final double walletBalance;
  final int coin;
  final List<String> roles;
  final String? deviceToken;
  final bool isOnline;
  final DateTime? createdAt;
  final DateTime? lastActiveAt;

  User({
    this.id,
    required this.username,
    this.email,
    this.fullName,
    this.phoneNumber,
    this.address,
    this.avatarUrl,
    this.profileImageUrl,
    this.coverImageUrl,
    this.bio,
    this.gender,
    this.walletBalance = 0.0,
    this.coin = 0,
    this.roles = const [],
    this.deviceToken,
    this.isOnline = false,
    this.createdAt,
    this.lastActiveAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    List<String> parsedRoles = [];
    if (json['roles'] != null) {
      if (json['roles'] is List) {
        parsedRoles = (json['roles'] as List).map((r) => r.toString()).toList();
      }
    }

    return User(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      username: json['username'] ?? '',
      email: json['email'],
      fullName: json['fullName'] ?? json['full_name'],
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
      address: json['address'],
      avatarUrl: json['avatarUrl'] ?? json['avatar_url'],
      profileImageUrl: json['profileImageUrl'] ?? json['profile_image_url'],
      coverImageUrl: json['coverImageUrl'] ?? json['cover_image_url'],
      bio: json['bio'],
      gender: json['gender'],
      walletBalance: (json['walletBalance'] ?? json['wallet_balance'] ?? 0).toDouble(),
      coin: (json['coin'] ?? 0) is int ? (json['coin'] ?? 0) : (json['coin'] as num?)?.toInt() ?? 0,
      roles: parsedRoles,
      deviceToken: json['deviceToken'] ?? json['device_token'],
      isOnline: json['isOnline'] ?? json['is_online'] ?? false,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
      lastActiveAt: json['lastActiveAt'] != null ? DateTime.tryParse(json['lastActiveAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'address': address,
      'avatarUrl': avatarUrl,
      'profileImageUrl': profileImageUrl,
      'coverImageUrl': coverImageUrl,
      'bio': bio,
      'gender': gender,
      'walletBalance': walletBalance,
      'coin': coin,
      'roles': roles,
      'deviceToken': deviceToken,
      'isOnline': isOnline,
      'createdAt': createdAt?.toIso8601String(),
      'lastActiveAt': lastActiveAt?.toIso8601String(),
    };
  }
}
