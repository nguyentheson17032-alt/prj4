class Game {
  final int? id;
  final String name;
  final String? code;
  final String? description;
  final String? avatar;
  final String? category;
  final String? platform;
  final List<String> ranks;
  final List<String> roles;
  final List<String> servers;

  Game({
    this.id,
    required this.name,
    this.code,
    this.description,
    this.avatar,
    this.category,
    this.platform,
    this.ranks = const [],
    this.roles = const [],
    this.servers = const [],
  });

  factory Game.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic field) {
      if (field == null) return [];
      if (field is List) return field.map((e) => e.toString()).toList();
      return [];
    }

    return Game(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      name: json['name'] ?? '',
      code: json['code'],
      description: json['description'],
      avatar: json['avatar'] ?? json['avatarUrl'] ?? json['image'],
      category: json['category'] is Map ? json['category']['name'] : json['category'],
      platform: json['platform'] is Map ? json['platform']['name'] : json['platform'],
      ranks: parseList(json['ranks']),
      roles: parseList(json['roles']),
      servers: parseList(json['servers']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'code': code,
      'description': description,
      'avatar': avatar,
      'category': category,
      'platform': platform,
      'ranks': ranks,
      'roles': roles,
      'servers': servers,
    };
  }
}
