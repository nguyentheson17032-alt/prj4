class Review {
  final int? id;
  final int? orderId;
  final int? reviewerId;
  final String? reviewerName;
  final String? reviewerAvatar;
  final int? playerId;
  final double rating;
  final String? comment;
  final DateTime? createdAt;

  Review({
    this.id,
    this.orderId,
    this.reviewerId,
    this.reviewerName,
    this.reviewerAvatar,
    this.playerId,
    this.rating = 5.0,
    this.comment,
    this.createdAt,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    int? parsedReviewerId;
    String? parsedReviewerName;
    String? parsedReviewerAvatar;
    if (json['reviewer'] is Map) {
      parsedReviewerId = json['reviewer']['id'];
      parsedReviewerName = json['reviewer']['username'];
      parsedReviewerAvatar = json['reviewer']['avatarUrl'];
    }

    return Review(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      orderId: json['orderId'] is int ? json['orderId'] : int.tryParse(json['orderId']?.toString() ?? ''),
      reviewerId: parsedReviewerId ?? json['reviewerId'],
      reviewerName: parsedReviewerName ?? json['reviewerName'],
      reviewerAvatar: parsedReviewerAvatar ?? json['reviewerAvatar'],
      playerId: json['playerId'] is int ? json['playerId'] : int.tryParse(json['playerId']?.toString() ?? ''),
      rating: (json['rating'] ?? 5.0).toDouble(),
      comment: json['comment'] ?? json['content'],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'reviewerId': reviewerId,
      'reviewerName': reviewerName,
      'reviewerAvatar': reviewerAvatar,
      'playerId': playerId,
      'rating': rating,
      'comment': comment,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
