import 'package:flutter/material.dart';
import 'api_service.dart';
import 'hire_confirmation_screen.dart';
import 'utils/notification_helper.dart';
import 'package:intl/intl.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({Key? key}) : super(key: key);

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<dynamic> notifications = [];
  List<dynamic> filteredNotifications = [];
  bool isLoading = true;
  bool isRefreshing = false;

  // Bộ lọc
  DateTime? selectedDate;
  int? selectedMonth;
  int? selectedYear;
  TimeOfDay? selectedTime;

  @override
  void initState() {
    super.initState();
    fetchAllNotifications();
  }

  Future<void> fetchAllNotifications() async {
    if (isRefreshing) return;
    
    setState(() {
      if (notifications.isEmpty) {
        isLoading = true;
      } else {
        isRefreshing = true;
      }
    });

    try {
      final data = await ApiService.getUserNotifications();
      // Lọc bỏ thông báo tin nhắn
      final filtered = data.where((n) => n['type'] != 'message').toList();
      // Sắp xếp theo thời gian mới nhất
      filtered.sort((a, b) {
        final aTime = DateTime.tryParse(a['createdAt'] ?? '') ?? DateTime(1970);
        final bTime = DateTime.tryParse(b['createdAt'] ?? '') ?? DateTime(1970);
        return bTime.compareTo(aTime);
      });
      
      setState(() {
        notifications = filtered;
        isLoading = false;
        isRefreshing = false;
      });
      applyFilters();
      
      // Cập nhật số thông báo chưa đọc
      await NotificationHelper.loadUnreadCount();
    } catch (e) {
      print('Lỗi tải thông báo: $e');
      setState(() {
        isLoading = false;
        isRefreshing = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không thể tải thông báo: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void applyFilters() {
    List<dynamic> result = List.from(notifications);
    if (selectedDate != null) {
      result = result.where((n) {
        final dt = DateTime.tryParse(n['createdAt'] ?? '');
        return dt != null && dt.year == selectedDate!.year && dt.month == selectedDate!.month && dt.day == selectedDate!.day;
      }).toList();
    }
    if (selectedMonth != null && selectedYear != null) {
      result = result.where((n) {
        final dt = DateTime.tryParse(n['createdAt'] ?? '');
        return dt != null && dt.year == selectedYear && dt.month == selectedMonth;
      }).toList();
    }
    if (selectedTime != null) {
      result = result.where((n) {
        final dt = DateTime.tryParse(n['createdAt'] ?? '');
        return dt != null && dt.hour == selectedTime!.hour && dt.minute == selectedTime!.minute;
      }).toList();
    }
    setState(() {
      filteredNotifications = result;
    });
  }

  void clearFilters() {
    setState(() {
      selectedDate = null;
      selectedMonth = null;
      selectedYear = null;
      selectedTime = null;
    });
    applyFilters();
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'system':
        return Icons.info_outline;
      case 'rent':
        return Icons.sports_esports;
      case 'promotion':
        return Icons.card_giftcard;
      case 'rent_request':
        return Icons.pending_actions;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'system':
        return Colors.blue;
      case 'rent':
        return Colors.green;
      case 'promotion':
        return Colors.orange;
      case 'rent_request':
        return Colors.purple;
      default:
        return Colors.deepOrange;
    }
  }

  String _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return '';
    try {
      final dt = DateTime.parse(dateTimeStr);
      final now = DateTime.now();
      final difference = now.difference(dt);

      if (difference.inDays > 0) {
        return '${difference.inDays} ngày trước';
      } else if (difference.inHours > 0) {
        return '${difference.inHours} giờ trước';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes} phút trước';
      } else {
        return 'Vừa xong';
      }
    } catch (e) {
      return dateTimeStr.substring(0, 16).replaceAll('T', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text(
          'Thông báo',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.deepOrange,
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.mark_email_read, color: Colors.blue),
            tooltip: 'Đánh dấu tất cả đã đọc',
            onPressed: () async {
              try {
                await NotificationHelper.markAllAsRead();
                // Cập nhật UI
                setState(() {
                  for (final notification in notifications) {
                    notification['read'] = true;
                  }
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Đã đánh dấu tất cả thông báo là đã đọc'),
                    backgroundColor: Colors.green,
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Lỗi: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_sweep, color: Colors.red),
            tooltip: 'Xóa tất cả',
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Xác nhận'),
                  content: const Text('Bạn có chắc chắn muốn xóa tất cả thông báo?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Hủy'),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                      child: const Text('Xóa', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );

              if (confirmed == true) {
                try {
                  for (final n in notifications) {
                    await ApiService.deleteNotification(n['id']);
                  }
                  await fetchAllNotifications();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã xóa tất cả thông báo'),
                      backgroundColor: Colors.green,
                    ),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Lỗi khi xóa: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: fetchAllNotifications,
        child: isLoading
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Colors.deepOrange),
                    SizedBox(height: 16),
                    Text('Đang tải thông báo...'),
                  ],
                ),
              )
            : Column(
                children: [
                  // Bộ lọc
                  if (notifications.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            // Lọc theo ngày
                            OutlinedButton.icon(
                              icon: const Icon(Icons.calendar_today, size: 16),
                              label: Text(
                                selectedDate == null 
                                  ? 'Ngày' 
                                  : '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              onPressed: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: selectedDate ?? DateTime.now(),
                                  firstDate: DateTime(2020),
                                  lastDate: DateTime(2100),
                                );
                                if (picked != null) {
                                  setState(() {
                                    selectedDate = picked;
                                    selectedMonth = null;
                                    selectedYear = null;
                                  });
                                  applyFilters();
                                }
                              },
                            ),
                            const SizedBox(width: 8),
                            // Lọc theo tháng
                            OutlinedButton.icon(
                              icon: const Icon(Icons.date_range, size: 16),
                              label: Text(
                                selectedMonth == null 
                                  ? 'Tháng' 
                                  : '${selectedMonth!}/${selectedYear ?? DateTime.now().year}',
                                style: const TextStyle(fontSize: 12),
                              ),
                              onPressed: () async {
                                final now = DateTime.now();
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime(selectedYear ?? now.year, selectedMonth ?? now.month),
                                  firstDate: DateTime(2020),
                                  lastDate: DateTime(2100),
                                  helpText: 'Chọn tháng',
                                  initialEntryMode: DatePickerEntryMode.calendarOnly,
                                );
                                if (picked != null) {
                                  setState(() {
                                    selectedMonth = picked.month;
                                    selectedYear = picked.year;
                                    selectedDate = null;
                                  });
                                  applyFilters();
                                }
                              },
                            ),
                            const SizedBox(width: 8),
                            // Xóa filter
                            if (selectedDate != null || selectedMonth != null || selectedTime != null)
                              OutlinedButton.icon(
                                icon: const Icon(Icons.clear, size: 16),
                                label: const Text('Xóa lọc', style: TextStyle(fontSize: 12)),
                                onPressed: clearFilters,
                              ),
                          ],
                        ),
                      ),
                    ),
                  // Danh sách thông báo
                  Expanded(
                    child: filteredNotifications.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.notifications_none,
                                  size: 64,
                                  color: Colors.grey[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  notifications.isEmpty ? 'Không có thông báo nào!' : 'Không tìm thấy thông báo phù hợp',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.grey[600],
                                  ),
                                ),
                                if (notifications.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  TextButton(
                                    onPressed: clearFilters,
                                    child: const Text('Xóa bộ lọc'),
                                  ),
                                ],
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: filteredNotifications.length,
                            itemBuilder: (context, index) {
                              final item = filteredNotifications[index];
                              final isUnread = item['read'] == false;
                              
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                elevation: isUnread ? 2 : 1,
                                color: isUnread ? Colors.blue.shade50 : Colors.white,
                                child: ListTile(
                                  leading: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: _colorForType(item['type']).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      _iconForType(item['type']), 
                                      color: _colorForType(item['type']),
                                      size: 24,
                                    ),
                                  ),
                                  title: Text(
                                    item['title'] ?? '',
                                    style: TextStyle(
                                      fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                                      color: isUnread ? Colors.black : Colors.black87,
                                    ),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text(
                                        item['message'] ?? '',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 13,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _formatDateTime(item['createdAt']),
                                        style: TextStyle(
                                          color: Colors.grey[500],
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isUnread)
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: Colors.blue,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      const SizedBox(width: 8),
                                      IconButton(
                                        icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                                        tooltip: 'Xóa thông báo',
                                        onPressed: () async {
                                          try {
                                            await ApiService.deleteNotification(item['id']);
                                            await fetchAllNotifications();
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(
                                                content: Text('Đã xóa thông báo'),
                                                backgroundColor: Colors.green,
                                              ),
                                            );
                                          } catch (e) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text('Lỗi khi xóa: $e'),
                                                backgroundColor: Colors.red,
                                              ),
                                            );
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                  onTap: () async {
                                    // Đánh dấu thông báo đã đọc nếu chưa đọc
                                    if (isUnread) {
                                      await NotificationHelper.markAsRead(item['id']);
                                      // Cập nhật UI
                                      setState(() {
                                        item['read'] = true;
                                      });
                                    }
                                    
                                    // Chỉ xử lý nếu là thông báo thuê mới hoặc đã gửi yêu cầu thuê và có orderId
                                    if ((item['type'] == 'rent' || item['type'] == 'rent_request') && item['orderId'] != null) {
                                      showDialog(
                                        context: context,
                                        barrierDismissible: false,
                                        builder: (_) => const Center(child: CircularProgressIndicator()),
                                      );
                                      try {
                                        final order = await ApiService.fetchOrderDetail(item['orderId'].toString());
                                        Navigator.pop(context); // Đóng loading
                                        if (order != null) {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) => HireConfirmationScreen(
                                                playerName: order['playerName'] ?? '',
                                                playerAvatarUrl: order['playerAvatarUrl'] ?? '',
                                                playerRank: order['playerRank'] ?? '',
                                                game: order['game'] ?? '',
                                                hours: order['hours'] ?? 0,
                                                totalCoin: order['totalCoin'] ?? 0,
                                                orderId: order['id'].toString(),
                                                startTime: order['startTime']?.toString() ?? '',
                                              ),
                                            ),
                                          );
                                        } else {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Không lấy được thông tin đơn thuê!'),
                                              backgroundColor: Colors.red,
                                            ),
                                          );
                                        }
                                      } catch (e) {
                                        Navigator.pop(context); // Đóng loading
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Lỗi: $e'),
                                            backgroundColor: Colors.red,
                                          ),
                                        );
                                      }
                                    }
                                  },
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
    );
  }
} 