import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'api_service.dart';
import 'hire_confirmation_screen.dart';
import 'config/api_config.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<dynamic> orders = [];
  List<dynamic> filteredOrders = [];
  bool isLoading = true;
  String? error;
  Map<String, dynamic>? _currentUser;

  // Bộ lọc
  String? filterStatus;
  String? filterType;
  DateTime? filterFromDate;
  DateTime? filterToDate;

  // Sửa danh sách trạng thái và loại đơn thành list map value-label
  final List<Map<String, String>> statusList = [
    {'value': 'COMPLETED', 'label': 'Đã hoàn thành'},
    {'value': 'CANCELLED', 'label': 'Đã huỷ'},
    {'value': 'PENDING', 'label': 'Chờ xác nhận'},
    {'value': 'IN_PROGRESS', 'label': 'Đang thực hiện'},
  ];
  final List<Map<String, String>> typeList = [
    {'value': 'HIRED', 'label': 'Tôi thuê'},
    {'value': 'HIRING', 'label': 'Tôi được thuê'},
  ];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() { isLoading = true; error = null; });
    try {
      final user = await ApiService.getCurrentUser();
      final userId = user?['id'];
      _currentUser = user;
      if (userId == null) {
        setState(() { error = 'Không tìm thấy thông tin người dùng.'; isLoading = false; });
        return;
      }
      final fetchedOrders = await ApiService.getAllUserOrders(userId);
      setState(() {
        orders = fetchedOrders ?? [];
        isLoading = false;
        filteredOrders = orders;
      });
    } catch (e) {
      setState(() {
        error = 'Lỗi khi tải đơn hàng: $e';
        isLoading = false;
      });
    }
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        DateTime? tempFrom = filterFromDate;
        DateTime? tempTo = filterToDate;
        String? tempStatus = filterStatus;
        String? tempType = filterType;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 16,
                    offset: Offset(0, -4),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 5,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    const Text('Bộ lọc đơn hàng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                    const SizedBox(height: 20),
                    // Trạng thái
                    DropdownButtonFormField<String>(
                      value: tempStatus,
                      decoration: InputDecoration(
                        labelText: 'Trạng thái',
                        prefixIcon: const Icon(Icons.info, color: Colors.deepOrange),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        filled: true,
                        fillColor: Colors.orange[50],
                      ),
                      items: [const DropdownMenuItem<String>(value: null, child: Text('Tất cả'))] +
                        statusList.map((s) => DropdownMenuItem<String>(value: s['value'], child: Text(s['label']!))).toList(),
                      onChanged: (v) => setModalState(() => tempStatus = v),
                      isExpanded: true,
                    ),
                    const SizedBox(height: 14),
                    // Loại đơn
                    DropdownButtonFormField<String>(
                      value: tempType,
                      decoration: InputDecoration(
                        labelText: 'Loại đơn',
                        prefixIcon: const Icon(Icons.category, color: Colors.blue),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        filled: true,
                        fillColor: Colors.orange[50],
                      ),
                      items: [const DropdownMenuItem<String>(value: null, child: Text('Tất cả'))] +
                        typeList.map((s) => DropdownMenuItem<String>(value: s['value'], child: Text(s['label']!))).toList(),
                      onChanged: (v) => setModalState(() => tempType = v),
                      isExpanded: true,
                    ),
                    const SizedBox(height: 14),
                    // Thời gian
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: tempFrom ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2100),
                              );
                              if (picked != null) setModalState(() => tempFrom = picked);
                            },
                            child: InputDecorator(
                              decoration: InputDecoration(
                                labelText: 'Từ ngày',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                filled: true,
                                fillColor: Colors.orange[50],
                              ),
                              child: Text(tempFrom != null ? DateFormat('dd/MM/yyyy').format(tempFrom!) : 'Chọn'),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: GestureDetector(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: tempTo ?? DateTime.now(),
                                firstDate: DateTime(2020),
                                lastDate: DateTime(2100),
                              );
                              if (picked != null) setModalState(() => tempTo = picked);
                            },
                            child: InputDecorator(
                              decoration: InputDecoration(
                                labelText: 'Đến ngày',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                filled: true,
                                fillColor: Colors.orange[50],
                              ),
                              child: Text(tempTo != null ? DateFormat('dd/MM/yyyy').format(tempTo!) : 'Chọn'),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              setState(() {
                                filterStatus = null;
                                filterType = null;
                                filterFromDate = null;
                                filterToDate = null;
                                filteredOrders = orders;
                              });
                              Navigator.pop(context);
                            },
                            icon: const Icon(Icons.clear, color: Colors.black),
                            label: const Text('Xóa lọc', style: TextStyle(color: Colors.black)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey[200],
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              setState(() {
                                filterStatus = tempStatus;
                                filterType = tempType;
                                filterFromDate = tempFrom;
                                filterToDate = tempTo;
                                _applyOrderFilter();
                              });
                              Navigator.pop(context);
                            },
                            icon: const Icon(Icons.check_circle, color: Colors.white),
                            label: const Text('Áp dụng', style: TextStyle(color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.deepOrange,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // Sửa hàm _applyOrderFilter để so sánh đúng key
  void _applyOrderFilter() {
    setState(() {
      filteredOrders = orders.where((order) {
        bool match = true;
        if (filterStatus != null && filterStatus!.isNotEmpty) {
          match &= (order['status'] == filterStatus);
        }
        if (filterType != null && filterType!.isNotEmpty) {
          match &= (order['orderType'] == filterType);
        }
        if (filterFromDate != null) {
          final orderDate = DateTime.tryParse(order['startTime'] ?? '') ?? DateTime(2000);
          match &= orderDate.isAfter(filterFromDate!.subtract(const Duration(days: 1)));
        }
        if (filterToDate != null) {
          final orderDate = DateTime.tryParse(order['endTime'] ?? '') ?? DateTime(2100);
          match &= orderDate.isBefore(filterToDate!.add(const Duration(days: 1)));
        }
        return match;
      }).toList();
    });
  }

  // Thêm hàm ánh xạ trạng thái và loại đơn sang tiếng Việt
  String getStatusLabel(String? status) {
    switch (status) {
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'COMPLETED':
        return 'Đã hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'HIRING':
        return 'Đang thuê';
      default:
        return status ?? '';
    }
  }

  String getOrderTypeLabel(String? type) {
    switch (type) {
      case 'HIRED':
        return 'Tôi thuê';
      case 'HIRING':
        return 'Tôi được thuê';
      default:
        return type ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.deepOrange),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Đơn hàng của tôi',
          style: TextStyle(
            color: Colors.deepOrange,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_alt_outlined, color: Colors.deepOrange),
            onPressed: _showFilterSheet,
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : filteredOrders.isEmpty
                  ? const Center(child: Text('Bạn chưa có đơn hàng nào.'))
                  : RefreshIndicator(
                      onRefresh: _loadOrders,
                      child: ListView.separated(
                        itemCount: filteredOrders.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final order = filteredOrders[index];
                          // Lấy avatar đúng vai trò
                          String? avatarUrl;
                          final isCurrentPlayer = _currentUser?['id'] != null && (_currentUser!['id'].toString() == order['playerId']?.toString());
                          if (isCurrentPlayer) {
                            avatarUrl = order['hirerAvatar'];
                            if (avatarUrl == null && order['hirerId'] != null) {
                              avatarUrl = '${ApiConfig.baseUrl}/api/auth/avatar/${order['hirerId']}';
                            }
                          } else {
                            avatarUrl = order['playerAvatarUrl'];
                          }
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => HireConfirmationScreen(
                                      playerName: order['playerName'] ?? '',
                                      playerAvatarUrl: order['playerAvatarUrl'] ?? '',
                                      playerRank: order['playerRank'] ?? '',
                                      game: order['game'] ?? '',
                                      hours: order['hours'] is int ? order['hours'] : int.tryParse(order['hours']?.toString() ?? '') ?? 0,
                                      totalCoin: order['price'] is int ? order['price'] : int.tryParse(order['price']?.toString() ?? '') ?? 0,
                                      orderId: order['id'].toString(),
                                      startTime: order['hireTime'] ?? '',
                                    ),
                                  ),
                                );
                              },
                              child: Card(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 2,
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Avatar đã bị loại bỏ theo yêu cầu
                                          Icon(Icons.event_note, color: Colors.deepOrange, size: 32),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        'Đơn #${order['id']} - ${order['game'] ?? ''}',
                                                        style: const TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 16,
                                                        ),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    Text(
                                                      '${order['price']} xu',
                                                      style: const TextStyle(
                                                        fontWeight: FontWeight.bold,
                                                        color: Colors.deepOrange,
                                                        fontSize: 15,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                Text('Người thuê: ${order['renterName']}', style: const TextStyle(fontSize: 14)),
                                                Text('Player: ${order['playerName']}', style: const TextStyle(fontSize: 14)),
                                                const SizedBox(height: 4),
                                                Row(
                                                  children: [
                                                    const Icon(Icons.access_time, size: 16, color: Colors.grey),
                                                    const SizedBox(width: 4),
                                                    Expanded(
                                                      child: Text(
                                                        '${order['hireTime']}',
                                                        style: const TextStyle(fontSize: 13, color: Colors.black54),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                // Khi hiển thị trạng thái và loại đơn, dùng label:
                                                Text('Trạng thái: ${getStatusLabel(order['status'])}', style: const TextStyle(fontSize: 13, color: Colors.deepOrange)),
                                                Text('Loại đơn: ${getOrderTypeLabel(order['orderType'])}', style: const TextStyle(fontSize: 13)),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
} 