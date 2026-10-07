import 'package:flutter/material.dart';
import 'api_service.dart';

class BalanceHistoryScreen extends StatefulWidget {
  const BalanceHistoryScreen({super.key});

  @override
  State<BalanceHistoryScreen> createState() => _BalanceHistoryScreenState();
}

class _BalanceHistoryScreenState extends State<BalanceHistoryScreen> {
  List<dynamic> history = [];
  bool isLoading = true;
  String search = '';
  String selectedStatus = 'Tất cả trạng thái';
  String selectedType = 'Tất cả loại';
  String selectedTime = 'Tất cả thời gian';
  int? currentUserId; // Lưu current user ID

  final List<String> statusOptions = [
    'Tất cả trạng thái',
    'Thành công',
    'Đang xử lý',
    'Thất bại',
  ];

  final List<String> typeOptions = [
    'Tất cả loại',
    'Nạp tiền',
    'Rút tiền',
    'Thuê',
    'Donate',
  ];

  final List<String> timeOptions = [
    'Tất cả thời gian',
    '7 ngày gần nhất',
    '30 ngày gần nhất',
  ];

  @override
  void initState() {
    super.initState();
    _getCurrentUserId().then((id) {
      setState(() {
        currentUserId = id;
      });
      loadHistory();
    });
  }

  Future<void> loadHistory() async {
    if (selectedType == 'Donate') {
      // Gọi API donate-history riêng
      print('Loading donate history...');
      final data = await ApiService.fetchDonateHistory();
      print('Donate history response: ${data.length} items');
      print('Data: $data');
      setState(() {
        history = data;
      });
    } else {
    final data = await ApiService.fetchBalanceHistory();
    print('Balance history response: ${data.length} items');
    print('Selected type: $selectedType');
    print('All data: $data');
    // Debug: In ra các giao dịch có type HIRE
    final hireTransactions = data.where((item) => 
      (item['type'] ?? '').toString().toUpperCase() == 'HIRE'
    ).toList();
    print('HIRE transactions found: ${hireTransactions.length}');
    print('HIRE transactions: $hireTransactions');
    setState(() {
      history = data;
    });
    }
  }

  Future<int?> _getCurrentUserId() async {
    try {
      final userInfo = await ApiService.getCurrentUser();
      return userInfo?['id'];
    } catch (e) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lịch sử biến động số dư'),
        backgroundColor: const Color(0xFFF7F7F9),
      ),
      body: Column(
        children: [
          // Filter & Search
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Tìm kiếm giao dịch',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                  onChanged: (v) => setState(() => search = v),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedTime,
                        items: timeOptions.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                        onChanged: (v) => setState(() => selectedTime = v!),
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedStatus,
                        items: statusOptions.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                        onChanged: (v) => setState(() => selectedStatus = v!),
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedType,
                        items: typeOptions.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                        onChanged: (v) {
                          setState(() => selectedType = v!);
                          loadHistory(); // Reload data khi thay đổi filter
                        },
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              itemCount: _filteredHistory().length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = _filteredHistory()[index];
                return _buildHistoryItem(item);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: OutlinedButton.icon(
              onPressed: loadHistory,
              icon: const Icon(Icons.refresh),
              label: const Text('Xem thêm'),
            ),
          ),
        ],
      ),
    );
  }

  List<dynamic> _filteredHistory() {
    if (selectedType == 'Donate') {
      // Không cần filter lại, chỉ phân biệt gửi/nhận khi render
      return history;
    }
    
    print('Filtering history for type: $selectedType');
    print('Total history items: ${history.length}');
    
    return history.where((item) {
      String type = (item['type'] ?? '').toString().toUpperCase();
      print('Processing item: type=$type, id=${item['id']}');
      
      if (type == 'DONATE' && currentUserId != null) {
        // Chỉ hiển thị ở tab Donate, không hiển thị ở các tab khác
        if (selectedType != 'Donate') return false;
        final paymentUserId = item['user']?['id'] ?? item['userId'];
        final paymentPlayerId = item['player']?['id'] ?? item['playerId'];
        // Người gửi: chỉ thấy giao dịch gửi (dấu trừ)
        if (currentUserId == paymentUserId && currentUserId != paymentPlayerId) return true;
        // Người nhận: chỉ thấy giao dịch nhận (dấu cộng)
        if (currentUserId == paymentPlayerId && currentUserId != paymentUserId) return true;
        return false;
      }
      // Các filter khác giữ nguyên
      final matchSearch = search.isEmpty || (item['id']?.toString().contains(search) ?? false);
      String status = (item['status'] ?? '').toString().toUpperCase();
      bool matchStatus = selectedStatus == 'Tất cả trạng thái' ||
        (selectedStatus == 'Thành công' && status == 'COMPLETED') ||
        (selectedStatus == 'Đang xử lý' && status == 'PENDING') ||
        (selectedStatus == 'Thất bại' && status == 'FAILED');
      bool matchType = selectedType == 'Tất cả loại' ||
        (selectedType == 'Nạp tiền' && type == 'TOPUP') ||
        (selectedType == 'Rút tiền' && type == 'WITHDRAW') ||
        (selectedType == 'Thuê' && type == 'HIRE') ||
        (selectedType == 'Donate' && type == 'DONATE');
      
      print('Item $type: matchSearch=$matchSearch, matchStatus=$matchStatus, matchType=$matchType');
      
      // Nếu đang chọn 'Rút tiền' thì chỉ lấy type == 'WITHDRAW'
      if (selectedType == 'Rút tiền' && type != 'WITHDRAW') return false;
      // Nếu đang chọn 'Nạp tiền' thì chỉ lấy type == 'TOPUP'
      if (selectedType == 'Nạp tiền' && type != 'TOPUP') return false;
      // Nếu đang chọn 'Thuê' thì chỉ lấy type == 'HIRE'
      if (selectedType == 'Thuê' && type != 'HIRE') return false;
      // Nếu đang chọn 'Donate' thì chỉ lấy type == 'DONATE'
      if (selectedType == 'Donate' && type != 'DONATE') return false;
      
      DateTime? createdAt;
      try {
        createdAt = DateTime.tryParse(item['createdAt'] ?? item['dateTime'] ?? '');
      } catch (_) {}
      bool matchTime = true;
      if (createdAt != null && selectedTime != 'Tất cả thời gian') {
        final now = DateTime.now();
        if (selectedTime == '7 ngày gần nhất') {
          matchTime = createdAt.isAfter(now.subtract(const Duration(days: 7)));
        } else if (selectedTime == '30 ngày gần nhất') {
          matchTime = createdAt.isAfter(now.subtract(const Duration(days: 30)));
        }
      }
      
      bool result = matchSearch && matchStatus && matchType && matchTime;
      print('Item $type final result: $result');
      return result;
    }).toList();
  }

  Widget _buildHistoryItem(Map<String, dynamic> item) {
    String type = (item['type'] ?? '').toString().toUpperCase();
    String coinText = '';
    Color coinColor = Colors.amber;
    if (selectedType == 'Donate' && currentUserId != null) {
      // Phân biệt gửi/nhận dựa vào description
      String description = (item['description'] ?? '').toString();
      if (description.contains('Nhận donate từ')) {
        // Người nhận donate - hiển thị dấu +
        coinText = '+${item['coin']} xu';
        coinColor = Colors.green;
      } else if (description.contains('Donate cho')) {
        // Người gửi donate - hiển thị dấu -
        coinText = '-${item['coin']} xu';
        coinColor = Colors.red;
      } else {
        coinText = '${item['coin']} xu';
        coinColor = Colors.amber;
      }
    } else {
      if (type == 'TOPUP') {
        coinText = '+${item['coin']} xu';
        coinColor = Colors.green;
      } else if (type == 'WITHDRAW') {
        coinText = '-${item['coin']} xu';
        coinColor = Colors.red;
      } else if (type == 'HIRE' && currentUserId != null) {
        final paymentUserId = item['user']?['id'] ?? item['userId'];
        final paymentPlayerId = item['player']?['id'] ?? item['playerId'];
        if (currentUserId == paymentUserId) {
          // Người thuê - trừ tiền
          coinText = '-${item['coin']} xu';
          coinColor = Colors.red;
        } else if (currentUserId == paymentPlayerId) {
          // Người được thuê - cộng tiền
          coinText = '+${item['coin']} xu';
          coinColor = Colors.green;
        } else {
          coinText = '${item['coin']} xu';
          coinColor = Colors.amber;
        }
      } else if (type == 'DONATE' && currentUserId != null) {
        final paymentUserId = item['user']?['id'] ?? item['userId'];
        final paymentPlayerId = item['player']?['id'] ?? item['playerId'];
        if (currentUserId == paymentUserId) {
          coinText = '-${item['coin']} xu';
          coinColor = Colors.red;
        } else if (currentUserId == paymentPlayerId) {
          coinText = '+${item['coin']} xu';
          coinColor = Colors.green;
        }
      } else {
        coinText = '${item['coin']} xu';
        coinColor = Colors.amber;
      }
    }
    String status = (item['status'] ?? '').toString().toUpperCase();
    String statusText = item['statusText'] ?? '';
    Color statusColor = Colors.grey;
    if (statusText.isEmpty) {
      switch (status) {
        case 'COMPLETED':
          statusText = 'Thành công';
          statusColor = Colors.green;
          break;
        case 'PENDING':
          statusText = 'Đang xử lý';
          statusColor = Colors.orange;
          break;
        case 'FAILED':
          statusText = 'Thất bại';
          statusColor = Colors.red;
          break;
        default:
          statusText = status;
          statusColor = Colors.grey;
      }
    } else if (item['statusColor'] != null) {
      try {
        statusColor = Color(int.parse(item['statusColor'].replaceFirst('#', '0xff')));
      } catch (_) {}
    }
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item['createdAt'] ?? item['dateTime'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.monetization_on, color: Colors.amber, size: 20),
              const SizedBox(width: 4),
              Text(coinText, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: coinColor)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text('Mã giao dịch: ${item['id']}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
              const Spacer(),
              if (statusText.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
} 