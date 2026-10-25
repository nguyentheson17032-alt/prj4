class Payment {
  final int? id;
  final int? userId;
  final double amount;
  final String type; // TOPUP, WITHDRAW, HIRE, DONATE
  final String status; // PENDING, SUCCESS, FAILED
  final String? transactionId;
  final String? method;
  final String? note;
  final DateTime? createdAt;

  Payment({
    this.id,
    this.userId,
    required this.amount,
    this.type = 'TOPUP',
    this.status = 'PENDING',
    this.transactionId,
    this.method,
    this.note,
    this.createdAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    int? parsedUserId;
    if (json['user'] is Map) {
      parsedUserId = json['user']['id'];
    } else {
      parsedUserId = json['userId'];
    }

    return Payment(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      userId: parsedUserId,
      amount: (json['amount'] ?? 0).toDouble(),
      type: json['type'] ?? 'TOPUP',
      status: json['status'] ?? 'PENDING',
      transactionId: json['transactionId'] ?? json['transaction_id'],
      method: json['method'],
      note: json['note'],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'amount': amount,
      'type': type,
      'status': status,
      'transactionId': transactionId,
      'method': method,
      'note': note,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
