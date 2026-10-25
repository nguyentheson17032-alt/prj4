class NotificationModel {
  final int? id;
  final int? userId;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final String? actionUrl;
  final int? orderId;
  final DateTime? createdAt;

  NotificationModel({
    this.id,
    this.userId,
    this.title = '',
    required this.message,
    this.type = 'GENERAL',
    this.isRead = false,
    this.actionUrl,
    this.orderId,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    int? parsedUserId;
    if (json['user'] is Map) {
      parsedUserId = json['user']['id'];
    } else {
      parsedUserId = json['userId'];
    }

    return NotificationModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      userId: parsedUserId,
      title: json['title'] ?? '',
      message: json['message'] ?? json['body'] ?? '',
      type: json['type'] ?? 'GENERAL',
      isRead: json['isRead'] ?? json['read'] ?? false,
      actionUrl: json['actionUrl'] ?? json['action_url'],
      orderId: json['orderId'] is int ? json['orderId'] : int.tryParse(json['orderId']?.toString() ?? ''),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'message': message,
      'type': type,
      'isRead': isRead,
      'actionUrl': actionUrl,
      'orderId': orderId,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
