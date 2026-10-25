class Message {
  final int? id;
  final int senderId;
  final int receiverId;
  final String content;
  final DateTime timestamp;
  final bool isRead;
  final String? senderUsername;
  final String? senderAvatar;

  Message({
    this.id,
    required this.senderId,
    required this.receiverId,
    required this.content,
    required this.timestamp,
    this.isRead = false,
    this.senderUsername,
    this.senderAvatar,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    int parsedSenderId = 0;
    String? parsedSenderUsername;
    String? parsedSenderAvatar;
    if (json['sender'] is Map) {
      parsedSenderId = json['sender']['id'] ?? 0;
      parsedSenderUsername = json['sender']['username'];
      parsedSenderAvatar = json['sender']['avatarUrl'];
    } else {
      parsedSenderId = json['senderId'] ?? 0;
    }

    int parsedReceiverId = 0;
    if (json['receiver'] is Map) {
      parsedReceiverId = json['receiver']['id'] ?? 0;
    } else {
      parsedReceiverId = json['receiverId'] ?? 0;
    }

    return Message(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      senderId: parsedSenderId,
      receiverId: parsedReceiverId,
      content: json['content'] ?? '',
      timestamp: json['timestamp'] != null
          ? (DateTime.tryParse(json['timestamp']) ?? DateTime.now())
          : DateTime.now(),
      isRead: json['isRead'] ?? json['read'] ?? false,
      senderUsername: parsedSenderUsername ?? json['senderUsername'],
      senderAvatar: parsedSenderAvatar ?? json['senderAvatar'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'senderId': senderId,
      'receiverId': receiverId,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
      'senderUsername': senderUsername,
      'senderAvatar': senderAvatar,
    };
  }
}

class Conversation {
  final int userId;
  final String username;
  final String? avatar;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;

  Conversation({
    required this.userId,
    required this.username,
    this.avatar,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      userId: json['userId'] ?? json['user']?['id'] ?? 0,
      username: json['username'] ?? json['user']?['username'] ?? '',
      avatar: json['avatar'] ?? json['avatarUrl'] ?? json['user']?['avatarUrl'],
      lastMessage: json['lastMessage'] ?? json['content'] ?? '',
      lastMessageTime: json['lastMessageTime'] != null
          ? (DateTime.tryParse(json['lastMessageTime']) ?? DateTime.now())
          : DateTime.now(),
      unreadCount: json['unreadCount'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'username': username,
      'avatar': avatar,
      'lastMessage': lastMessage,
      'lastMessageTime': lastMessageTime.toIso8601String(),
      'unreadCount': unreadCount,
    };
  }
}
