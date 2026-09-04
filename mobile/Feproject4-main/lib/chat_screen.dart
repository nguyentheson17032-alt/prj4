import 'dart:async';
import 'package:flutter/material.dart';
import 'api_service.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'config/api_config.dart';
import 'utils/message_helper.dart';

class ChatScreen extends StatefulWidget {
  final Map<String, dynamic> player; // Thông tin người chơi
  final Map<String, dynamic> user;   // Thông tin người dùng hiện tại
  const ChatScreen({super.key, required this.player, required this.user});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController messageController = TextEditingController();
  List<dynamic> messages = [];
  bool isLoading = false;
  Uint8List? avatarBytes;
  Timer? _refreshTimer;
  int _lastMessageCount = 0; // Để track số tin nhắn cuối cùng

  @override
  void initState() {
    super.initState();
    loadConversation();
    _loadAvatar();
    
    // Chỉ refresh khi có tin nhắn mới - kiểm tra mỗi 5 giây
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted && !isLoading) {
        _checkForNewMessages();
      }
    });
  }

  Future<void> loadConversation() async {
    setState(() => isLoading = true);
    try {
      // Lấy ID người dùng từ thông tin người chơi
      final receiverUserId = widget.player['user']['id'];
      print('🔄 ChatScreen: Đang tải conversation với user $receiverUserId');
      
      messages = await ApiService.getConversation(receiverUserId);
      _lastMessageCount = messages.length; // Cập nhật số tin nhắn ban đầu
      print('📊 ChatScreen: Nhận được ${messages.length} messages');
      
      // Mark tất cả tin nhắn từ người khác là đã đọc (chỉ khi lần đầu load)
      await _markAllMessagesAsRead(receiverUserId);
      
      setState(() => isLoading = false);
    } catch (e) {
      print('❌ ChatScreen: Lỗi load conversation: $e');
      setState(() => isLoading = false);
    }
  }

  Future<void> _markAllMessagesAsRead(int userId) async {
    try {
      await ApiService.markAllMessagesAsRead(userId);
      print('✅ ChatScreen: Đã mark all messages as read với user $userId');
      // Cập nhật số tin nhắn chưa đọc
      await MessageHelper.loadUnreadCount();
    } catch (e) {
      print('❌ ChatScreen: Lỗi mark messages as read: $e');
    }
  }

  // Kiểm tra tin nhắn mới một cách thông minh
  Future<void> _checkForNewMessages() async {
    try {
      final receiverUserId = widget.player['user']['id'];
      
      // Chỉ kiểm tra số tin nhắn chưa đọc thay vì load toàn bộ conversation
      final unreadCount = await ApiService.getUnreadMessagesCount();
      
      // Nếu có tin nhắn mới (số tin nhắn tăng lên)
      if (unreadCount > _lastMessageCount) {
        print('🆕 ChatScreen: Phát hiện tin nhắn mới!');
        await _loadNewMessages();
        _lastMessageCount = unreadCount;
      }
    } catch (e) {
      print('❌ ChatScreen: Lỗi kiểm tra tin nhắn mới: $e');
    }
  }

  // Load tin nhắn mới khi phát hiện có tin nhắn mới
  Future<void> _loadNewMessages() async {
    try {
      final receiverUserId = widget.player['user']['id'];
      final newMessages = await ApiService.getConversation(receiverUserId);
      
      // Chỉ cập nhật nếu thực sự có tin nhắn mới
      if (newMessages.length > messages.length) {
        setState(() {
          messages = newMessages;
        });
        print('✅ ChatScreen: Đã load ${newMessages.length - messages.length} tin nhắn mới');
        
        // Mark as read sau khi load tin nhắn mới
        await ApiService.markAllMessagesAsRead(receiverUserId);
        await MessageHelper.loadUnreadCount();
      }
    } catch (e) {
      print('❌ ChatScreen: Lỗi load tin nhắn mới: $e');
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> sendMessage() async {
    final text = messageController.text.trim();
    if (text.isEmpty) return;
    
    try {
      // Lấy ID người dùng từ thông tin người chơi
      final receiverUserId = widget.player['user']['id'];
      print('🔄 ChatScreen: Đang gửi tin nhắn đến user $receiverUserId');
      
      final sent = await ApiService.sendMessage(receiverUserId, text);
      if (sent != null) {
        print('✅ ChatScreen: Đã gửi tin nhắn thành công');
        messageController.clear();
        await loadConversation();
      } else {
        print('❌ ChatScreen: Gửi tin nhắn thất bại');
      }
    } catch (e) {
      print('❌ ChatScreen: Lỗi gửi tin nhắn: $e');
    }
  }

  Future<void> _loadAvatar() async {
    final userId = widget.player['user']['id'];
    try {
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/auth/avatar/$userId',
        options: Options(responseType: ResponseType.bytes),
      );
      if (response.statusCode == 200) {
        setState(() {
          avatarBytes = Uint8List.fromList(response.data);
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final player = widget.player;
    final user = widget.user;
    return Scaffold(
      appBar: AppBar(
        // backgroundColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.deepOrange),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundImage: avatarBytes != null ? MemoryImage(avatarBytes!) : null,
              child: avatarBytes == null ? const Icon(Icons.person, color: Colors.deepOrange) : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                player['user']['username'] ?? '',
                style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),

      ),
      backgroundColor: const Color(0xFFF7F7F9),
      body: Column(
        children: [
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                    reverse: true,
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[messages.length - 1 - index];
                      final isMe = msg['senderId'].toString() == widget.user['id'].toString();
                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isMe ? Colors.deepOrange : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: Radius.circular(isMe ? 16 : 4),
                              bottomRight: Radius.circular(isMe ? 4 : 16),
                            ),
                            boxShadow: [
                              if (!isMe)
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.03),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                            ],
                          ),
                          child: Text(
                            msg['content'] ?? '',
                            style: TextStyle(
                              color: isMe ? Colors.white : Colors.black87,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Container(
            color: Colors.white,
            padding: EdgeInsets.only(
              left: 12,
              right: 8,
              bottom: MediaQuery.of(context).padding.bottom + 8,
              top: 8,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: messageController,
                    decoration: InputDecoration(
                      hintText: 'Nhập tin nhắn...',
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                    ),
                    onSubmitted: (_) => sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Colors.deepOrange,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
} 