import 'dart:async';
import 'package:flutter/material.dart';
import 'api_service.dart';
import 'chat_screen.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'utils/message_helper.dart';

class MessageListScreen extends StatefulWidget {
  const MessageListScreen({super.key});

  @override
  State<MessageListScreen> createState() => _MessageListScreenState();
}

class _MessageListScreenState extends State<MessageListScreen> {
  List<dynamic> conversations = [];
  List<dynamic> filteredConversations = [];
  bool isLoading = true;
  int currentUserId = 0;
  Timer? _timer;
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    loadConversations();
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      loadConversations();
    });
    
    // Lắng nghe thay đổi trong search controller
    _searchController.addListener(_filterConversations);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> loadConversations() async {
    try {
      final user = await ApiService.getCurrentUser();
      currentUserId = user?['id'] ?? 0;
      print('🔄 MessageListScreen: Đang tải conversations cho user $currentUserId');
      
      final conversationsData = await ApiService.getAllConversations();
      print('📊 MessageListScreen: Nhận được ${conversationsData.length} conversations');
      
      setState(() {
        conversations = _sortConversationsByLatestMessage(conversationsData);
        // Chỉ reset filteredConversations nếu không đang tìm kiếm
        if (!_isSearching) {
          filteredConversations = conversations;
        } else {
          // Nếu đang tìm kiếm, áp dụng lại filter với data mới
          _applyFilterToNewData(conversations);
        }
        isLoading = false;
      });
      
      // Cập nhật số tin nhắn chưa đọc sau khi load conversations
      await MessageHelper.loadUnreadCount();
    } catch (e) {
      print('❌ MessageListScreen: Lỗi load conversations: $e');
      setState(() => isLoading = false);
    }
  }

  // Áp dụng filter hiện tại lên data mới
  void _applyFilterToNewData(List<dynamic> newConversations) {
    final query = _searchController.text.toLowerCase().trim();
    print('🔄 MessageListScreen: Áp dụng filter với query: "$query" lên ${newConversations.length} conversations mới');
    
    if (query.isEmpty) {
      setState(() {
        filteredConversations = newConversations;
        _isSearching = false;
      });
      print('🔄 MessageListScreen: Reset filter với data mới');
    } else {
      final filtered = newConversations.where((conv) {
        final otherName = conv['otherName']?.toString().toLowerCase() ?? '';
        final matches = otherName.contains(query);
        print('🔍 MessageListScreen: Kiểm tra "$otherName" với "$query" -> $matches');
        return matches;
      }).toList();
      
      // Sắp xếp kết quả tìm kiếm theo tin nhắn gần nhất
      final sortedFiltered = _sortConversationsByLatestMessage(filtered);
      
      setState(() {
        filteredConversations = sortedFiltered;
        _isSearching = true;
      });
      print('✅ MessageListScreen: Áp dụng filter thành công, tìm thấy ${sortedFiltered.length} conversations');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tin nhắn'),
        backgroundColor: Colors.white,
        elevation: 1,
        titleTextStyle: const TextStyle(
          color: Colors.black87,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      body: Column(
        children: [
          // Thanh tìm kiếm
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm theo tên...',
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.grey),
                        onPressed: _clearSearch,
                      )
                    : null,
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
          // Kết quả tìm kiếm
          if (_isSearching && filteredConversations.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.blue[50],
              child: Row(
                children: [
                  Icon(Icons.search, size: 16, color: Colors.blue[700]),
                  const SizedBox(width: 8),
                  Text(
                    'Tìm thấy ${filteredConversations.length} cuộc trò chuyện',
                    style: TextStyle(
                      color: Colors.blue[700],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          // Danh sách conversations
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredConversations.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isSearching ? Icons.search_off : Icons.chat_bubble_outline,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _isSearching 
                                  ? 'Không tìm thấy cuộc trò chuyện nào'
                                  : 'Chưa có cuộc trò chuyện nào',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: filteredConversations.length,
                        itemBuilder: (context, index) {
                          final conv = filteredConversations[index];
                final messages = conv['messages'] as List<dynamic>? ?? [];
                if (messages.isEmpty) return const SizedBox();
                final lastMessage = messages.last;
                final otherUserId = conv['conversationId'];
                final title = conv['otherName'] ?? 'Người dùng #$otherUserId';
                
                // Tính số tin nhắn chưa đọc
                int unreadCount = 0;
                for (var message in messages) {
                  if (message['senderId'] != currentUserId && !message['read']) {
                    unreadCount++;
                  }
                }
                
                return ListTile(
                  leading: FutureBuilder<Uint8List?>(
                    future: fetchAvatarBytes(otherUserId),
                    builder: (context, snapshot) {
                      if (snapshot.hasData && snapshot.data != null) {
                        return CircleAvatar(backgroundImage: MemoryImage(snapshot.data!));
                      }
                      return const CircleAvatar(child: Icon(Icons.person, color: Colors.deepOrange));
                    },
                  ),
                  title: Row(
                    children: [
                      Expanded(child: Text(title)),
                      if (unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            unreadCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                  subtitle: Text(
                    lastMessage['content'] ?? '',
                    style: TextStyle(
                      fontWeight: lastMessage['senderId'] != currentUserId && !lastMessage['read'] 
                        ? FontWeight.bold 
                        : FontWeight.normal,
                    ),
                  ),
                  trailing: Text(_formatTime(lastMessage['timestamp'])),
                  onTap: () async {
                    final user = { 'id': otherUserId, 'username': title };
                    final player = { 'user': user };
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChatScreen(player: player, user: user),
                      ),
                    );
                    await loadConversations();
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // Filter conversations theo tên
  void _filterConversations() {
    final query = _searchController.text.toLowerCase().trim();
    print('🔍 MessageListScreen: Đang filter với query: "$query"');
    print('📊 MessageListScreen: Tổng conversations: ${conversations.length}');
    
    if (query.isEmpty) {
      setState(() {
        filteredConversations = conversations;
        _isSearching = false;
      });
      print('🔄 MessageListScreen: Reset về tất cả conversations');
    } else {
      final filtered = conversations.where((conv) {
        final otherName = conv['otherName']?.toString().toLowerCase() ?? '';
        final matches = otherName.contains(query);
        print('🔍 MessageListScreen: Kiểm tra "$otherName" với "$query" -> $matches');
        return matches;
      }).toList();
      
      // Sắp xếp kết quả tìm kiếm theo tin nhắn gần nhất
      final sortedFiltered = _sortConversationsByLatestMessage(filtered);
      
      setState(() {
        filteredConversations = sortedFiltered;
        _isSearching = true;
      });
      print('✅ MessageListScreen: Tìm thấy ${sortedFiltered.length} conversations phù hợp');
    }
  }

  // Sắp xếp conversations theo tin nhắn gần nhất
  List<dynamic> _sortConversationsByLatestMessage(List<dynamic> conversations) {
    return List.from(conversations)..sort((a, b) {
      final messagesA = a['messages'] as List<dynamic>? ?? [];
      final messagesB = b['messages'] as List<dynamic>? ?? [];
      
      if (messagesA.isEmpty && messagesB.isEmpty) return 0;
      if (messagesA.isEmpty) return 1; // A lên cuối
      if (messagesB.isEmpty) return -1; // B lên cuối
      
      final lastMessageA = messagesA.last;
      final lastMessageB = messagesB.last;
      
      final timestampA = lastMessageA['timestamp']?.toString() ?? '';
      final timestampB = lastMessageB['timestamp']?.toString() ?? '';
      
      if (timestampA.isEmpty && timestampB.isEmpty) return 0;
      if (timestampA.isEmpty) return 1;
      if (timestampB.isEmpty) return -1;
      
      final dateTimeA = DateTime.tryParse(timestampA);
      final dateTimeB = DateTime.tryParse(timestampB);
      
      if (dateTimeA == null && dateTimeB == null) return 0;
      if (dateTimeA == null) return 1;
      if (dateTimeB == null) return -1;
      
      // Sắp xếp giảm dần (mới nhất lên đầu)
      return dateTimeB.compareTo(dateTimeA);
    });
  }

  // Clear search
  void _clearSearch() {
    _searchController.clear();
    setState(() {
      filteredConversations = conversations;
      _isSearching = false;
    });
  }

  String _formatTime(String? isoTime) {
    if (isoTime == null) return '';
    final dt = DateTime.tryParse(isoTime);
    if (dt == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inDays > 0) return '${diff.inDays} ngày trước';
    if (diff.inHours > 0) return '${diff.inHours} giờ trước';
    if (diff.inMinutes > 0) return '${diff.inMinutes} phút trước';
    return 'Vừa xong';
  }
}

Future<Uint8List?> fetchAvatarBytes(int userId) async {
  try {
    final response = await Dio().get(
      'http://10.0.2.2:8080/api/auth/avatar/$userId',
      options: Options(responseType: ResponseType.bytes),
    );
    if (response.statusCode == 200) {
      return Uint8List.fromList(response.data);
    }
  } catch (_) {}
  return null;
} 