class Report {
  final int? id;
  final int? reporterId;
  final int? targetId;
  final int? orderId;
  final String reason;
  final String? details;
  final String? videoUrl;
  final String status;
  final DateTime? createdAt;

  Report({
    this.id,
    this.reporterId,
    this.targetId,
    this.orderId,
    required this.reason,
    this.details,
    this.videoUrl,
    this.status = 'PENDING',
    this.createdAt,
  });

  factory Report.fromJson(Map<String, dynamic> json) {
    return Report(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      reporterId: json['reporterId'] is int ? json['reporterId'] : int.tryParse(json['reporterId']?.toString() ?? ''),
      targetId: json['targetId'] is int ? json['targetId'] : int.tryParse(json['targetId']?.toString() ?? ''),
      orderId: json['orderId'] is int ? json['orderId'] : int.tryParse(json['orderId']?.toString() ?? ''),
      reason: json['reason'] ?? '',
      details: json['details'] ?? json['description'],
      videoUrl: json['videoUrl'] ?? json['video_url'],
      status: json['status'] ?? 'PENDING',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reporterId': reporterId,
      'targetId': targetId,
      'orderId': orderId,
      'reason': reason,
      'details': details,
      'videoUrl': videoUrl,
      'status': status,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
