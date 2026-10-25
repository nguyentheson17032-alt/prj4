class Order {
  final int? id;
  final int? renterId;
  final String? renterUsername;
  final String? renterAvatar;
  final int? playerId;
  final String? playerUsername;
  final String? playerAvatar;
  final int hours;
  final double price;
  final String status; // PENDING, CONFIRMED, CANCELED, COMPLETED, REJECTED
  final DateTime? startTime;
  final DateTime? endTime;
  final String? note;
  final String? payoutStatus;
  final double? discountRate;
  final double? platformFee;
  final double? playerReceived;
  final DateTime? createdAt;

  Order({
    this.id,
    this.renterId,
    this.renterUsername,
    this.renterAvatar,
    this.playerId,
    this.playerUsername,
    this.playerAvatar,
    this.hours = 1,
    this.price = 0.0,
    this.status = 'PENDING',
    this.startTime,
    this.endTime,
    this.note,
    this.payoutStatus,
    this.discountRate,
    this.platformFee,
    this.playerReceived,
    this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    int? parsedRenterId;
    String? parsedRenterUsername;
    String? parsedRenterAvatar;
    if (json['renter'] != null && json['renter'] is Map) {
      parsedRenterId = json['renter']['id'];
      parsedRenterUsername = json['renter']['username'];
      parsedRenterAvatar = json['renter']['avatarUrl'];
    }

    int? parsedPlayerId;
    String? parsedPlayerUsername;
    String? parsedPlayerAvatar;
    if (json['player'] != null && json['player'] is Map) {
      parsedPlayerId = json['player']['id'];
      parsedPlayerUsername = json['player']['username'];
      parsedPlayerAvatar = json['player']['avatarUrl'];
    }

    return Order(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      renterId: parsedRenterId ?? json['renterId'],
      renterUsername: parsedRenterUsername ?? json['renterUsername'],
      renterAvatar: parsedRenterAvatar ?? json['renterAvatar'],
      playerId: parsedPlayerId ?? json['playerId'],
      playerUsername: parsedPlayerUsername ?? json['playerUsername'],
      playerAvatar: parsedPlayerAvatar ?? json['playerAvatar'],
      hours: json['hours'] ?? 1,
      price: (json['price'] ?? 0).toDouble(),
      status: json['status'] ?? 'PENDING',
      startTime: json['startTime'] != null ? DateTime.tryParse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.tryParse(json['endTime']) : null,
      note: json['note'],
      payoutStatus: json['payoutStatus'] ?? json['payout_status'],
      discountRate: (json['discountRate'] ?? json['discount_rate'])?.toDouble(),
      platformFee: (json['platformFee'] ?? json['platform_fee'])?.toDouble(),
      playerReceived: (json['playerReceived'] ?? json['player_received'])?.toDouble(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'renterId': renterId,
      'renterUsername': renterUsername,
      'renterAvatar': renterAvatar,
      'playerId': playerId,
      'playerUsername': playerUsername,
      'playerAvatar': playerAvatar,
      'hours': hours,
      'price': price,
      'status': status,
      'startTime': startTime?.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'note': note,
      'payoutStatus': payoutStatus,
      'discountRate': discountRate,
      'platformFee': platformFee,
      'playerReceived': playerReceived,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
