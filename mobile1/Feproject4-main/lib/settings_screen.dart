import 'package:flutter/material.dart';
import 'register_player_screen.dart';
import 'login_screen.dart';
import 'api_service.dart';
import 'utils/notification_helper.dart';
import 'utils/message_helper.dart';
import 'update_profile_screen.dart';
import 'update_player_screen.dart';
import 'policy_screen.dart';
import 'change_password_screen.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:dio/dio.dart';
import 'orders_screen.dart';
import 'user_given_reviews_screen.dart';
import 'package:http_parser/http_parser.dart';
import 'dart:typed_data';
import 'player_reward_screen.dart';
import 'dart:io' as io;
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'create_moment_screen.dart';
import 'config/api_config.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'balance_history_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String userId = '';
  bool isLoading = true;
  double? coinBalance;
  bool isLoadingBalance = true;
  bool _showUpdateOptions = false;
  bool isPlayer = false;
  bool _didCheckPlayer = false;
  bool _isCheckingPlayer = false;
  String? playerId;
  File? _selectedImage;
  File? _selectedCoverImage;
  final ImagePicker _picker = ImagePicker();
  Uint8List? avatarBytes;
  Uint8List? coverImageBytes;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
    _loadWalletBalance();
    _checkIsPlayer();
    // Luôn load lại cover image từ server khi vào trang
    _loadCoverImage();
    _selectedCoverImage = null;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didCheckPlayer) {
      _checkIsPlayer();
      _didCheckPlayer = true;
    }
    // Lắng nghe khi quay lại từ màn xác nhận đơn để reload số dư xu
    Future.microtask(() async {
      final result = ModalRoute.of(context)?.settings.arguments;
      if (result == true) {
        await _loadWalletBalance();
      }
    });
  }

  @override
  void deactivate() {
    _didCheckPlayer = false;
    super.deactivate();
  }

  Future<void> _loadUserInfo() async {
    final userInfo = await ApiService.getCurrentUser();
    String id = userInfo?['id']?.toString() ?? '';
    Uint8List? bytes;
    if (id.isNotEmpty) {
      try {
        final response = await Dio().get(
          '${ApiConfig.baseUrl}/api/auth/avatar/$id',
          options: Options(responseType: ResponseType.bytes),
        );
        if (response.statusCode == 200) {
          bytes = Uint8List.fromList(response.data);
        }
      } catch (_) {
        bytes = null;
      }
    }
    if (mounted) {
      setState(() {
        userId = id;
        avatarBytes = bytes;
        isLoading = false;
      });
      _loadCoverImage(); // Gọi lại sau khi đã có userId
    }
  }

  Future<void> _loadWalletBalance() async {
    final balance = await ApiService.fetchWalletBalance();
    if (mounted) {
      setState(() {
        coinBalance = balance?.toDouble();
        isLoadingBalance = false;
      });
    }
  }

  Future<void> _checkIsPlayer() async {
    if (userId.isEmpty) return;
    final players = await ApiService.fetchPlayersByUser(int.tryParse(userId) ?? 0);
    if (mounted) {
      setState(() {
        isPlayer = players.isNotEmpty;
        if (isPlayer) {
          playerId = players[0]['id'].toString();
        } else {
          playerId = null;
        }
      });
    }
  }

  Future<Uint8List?> fetchCoverImageBytes(String userId) async {
    try {
      final token = await ApiService.storage.read(key: 'jwt');
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/users/$userId/cover-image-bytes',
        options: Options(
          responseType: ResponseType.bytes,
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
      if (response.statusCode == 200) {
        return Uint8List.fromList(response.data);
      }
      return null;
    } catch (e) {
      // Lỗi 404 hoặc lỗi network - không hiển thị thông báo vì đây là ảnh bìa
      print('Lỗi tải ảnh bìa: $e');
      return null;
    }
  }

  Future<void> _loadCoverImage() async {
    if (userId.isEmpty) return;
    final bytes = await fetchCoverImageBytes(userId);
    if (mounted) {
      setState(() {
        coverImageBytes = bytes;
      });
    }
  }

  Future<void> _pickAndUploadCover() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile == null) return;
    setState(() {
      _selectedCoverImage = File(pickedFile.path);
    });
    final url = await ApiService.uploadCoverImage(pickedFile.path);
    if (url != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cập nhật ảnh bìa thành công!')),
      );
      // Reload lại ảnh bìa từ server nếu muốn đồng bộ
      await _loadCoverImage();
      setState(() {
        _selectedCoverImage = null; // Xóa file tạm sau khi đã đồng bộ
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lỗi khi cập nhật ảnh bìa!')),
      );
    }
  }

  void showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        margin: const EdgeInsets.all(8),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> handleLogout() async {
    final shouldLogout = await NotificationHelper.showConfirmDialog(
      context,
      title: 'Xác nhận đăng xuất',
      content: 'Bạn có chắc chắn muốn đăng xuất?',
      confirmText: 'Đăng xuất',
    );

    if (shouldLogout != true) return;

    await ApiService.logout();
    if (!mounted) return;

    NotificationHelper.showSuccess(context, 'Đăng xuất thành công!');
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
          (route) => false,
    );
  }

  Future<File> resizeImage(File file, {int maxWidth = 512, int maxHeight = 512}) async {
    final bytes = await file.readAsBytes();
    final image = img.decodeImage(bytes);
    if (image == null) return file;
    final resized = img.copyResize(image, width: maxWidth, height: maxHeight);
    final resizedBytes = img.encodeJpg(resized, quality: 85);
    final tempDir = await getTemporaryDirectory();
    final resizedFile = File('${tempDir.path}/resized_avatar.jpg');
    await resizedFile.writeAsBytes(resizedBytes);
    return resizedFile;
  }

  Future<void> _pickAndUploadAvatar() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile == null) return;
    File file = File(pickedFile.path);
    file = await resizeImage(file, maxWidth: 512, maxHeight: 512);
    final token = await ApiService.storage.read(key: 'jwt');
    final dio = Dio();
    dio.options.headers['Authorization'] = 'Bearer $token';
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: file.path.split('/').last),
    });
    try {
      final response = await dio.post(
        '${ApiConfig.baseUrl}/api/auth/update/avatar',
        data: formData,
      );
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật avatar thành công!')),
        );
        await _loadUserInfo(); // Reload lại avatar sau khi upload thành công
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi:  ̷  [${response.statusMessage}]')),
        );
      }
    } on DioError catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi upload avatar:   [${e.response?.data ?? e.toString()}]')),
      );
    }
  }

  Future<void> _pickAndUploadPlayerGalleryImage() async {
    if (playerId == null) return;
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile == null) return;
    final file = pickedFile.path;
    final success = await ApiService.uploadPlayerGalleryImage(playerId!, file);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tải ảnh lên kho thành công!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lỗi khi tải ảnh lên kho!')),
      );
    }
  }

  Future<void> _pickAndUploadMultipleImages() async {
    if (playerId == null) return;
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      allowMultiple: true,
    );
    if (result == null || result.paths.isEmpty) return;
    int successCount = 0;
    for (final filePath in result.paths.whereType<String>()) {
      final success = await ApiService.uploadPlayerGalleryImage(playerId!, filePath);
      if (success) successCount++;
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã tải lên $successCount/${result.paths.length} ảnh!')),
      );
    }
  }

  String? getFullUrl(String? path) {
    if (path == null) return null;
    if (path.startsWith('http')) return path;
    return 'http://10.0.2.2:8080/$path';
  }

  void _showWithdrawDialog(BuildContext context) {
    final coinController = TextEditingController();
    final bankAccountController = TextEditingController();
    final bankNameController = TextEditingController();
    final accountNameController = TextEditingController();
    
    // Lưu context từ widget chính để sử dụng sau này
    final mainContext = context;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rút tiền', style: TextStyle(fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: coinController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Số xu muốn rút',
                  hintText: 'Nhập số xu muốn rút',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: bankAccountController,
                keyboardType: TextInputType.text,
                decoration: const InputDecoration(
                  labelText: 'Số tài khoản ngân hàng',
                  hintText: 'VD: 1234567890',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: accountNameController,
                keyboardType: TextInputType.text,
                decoration: const InputDecoration(
                  labelText: 'Tên chủ tài khoản',
                  hintText: 'VD: NGUYEN VAN A',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: bankNameController,
                keyboardType: TextInputType.text,
                decoration: const InputDecoration(
                  labelText: 'Tên ngân hàng',
                  hintText: 'VD: Vietcombank',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              final coin = int.tryParse(coinController.text) ?? 0;
              final bankAccount = bankAccountController.text.trim();
              final accountName = accountNameController.text.trim();
              final bankName = bankNameController.text.trim();
              
              // Validation với thông báo đẹp hơn
              if (coin < 1) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.warning_amber, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        const Text('Số xu phải lớn hơn 0'),
                      ],
                    ),
                    backgroundColor: Colors.orange,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
                return;
              }
              
              if (bankAccount.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.warning_amber, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        const Text('Vui lòng nhập số tài khoản ngân hàng'),
                      ],
                    ),
                    backgroundColor: Colors.orange,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
                return;
              }
              
              if (accountName.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.warning_amber, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        const Text('Vui lòng nhập tên chủ tài khoản'),
                      ],
                    ),
                    backgroundColor: Colors.orange,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
                return;
              }
              
              if (bankName.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.warning_amber, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        const Text('Vui lòng nhập tên ngân hàng'),
                      ],
                    ),
                    backgroundColor: Colors.orange,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
                return;
              }
              
              Navigator.pop(context); // Đóng dialog
              
              // Show loading
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (context) => const Center(
                  child: CircularProgressIndicator(),
                ),
              );
              
              try {
                print('🔄 Bắt đầu gọi API withdraw...');
                print('📊 Dữ liệu gửi: coin=$coin, bankAccount=$bankAccount, accountName=$accountName, bankName=$bankName');
                
                final error = await ApiService.withdraw(
                  coin: coin,
                  bankAccountNumber: bankAccount,
                  bankAccountName: accountName,
                  bankName: bankName,
                );
                
                print('✅ API withdraw hoàn thành. Error: $error');
                
                // Hide loading - sử dụng mainContext thay vì context từ dialog
                if (mounted && Navigator.canPop(mainContext)) {
                  Navigator.pop(mainContext);
                }
                
                // Kiểm tra mounted trước khi hiển thị thông báo
                if (!mounted) return;
              
              if (error == null) {
                // Thông báo thành công chi tiết
                ScaffoldMessenger.of(mainContext).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Rút tiền thành công!',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Đã rút $coin xu vào tài khoản $bankAccount',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    backgroundColor: Colors.green,
                    duration: const Duration(seconds: 4),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
                _loadWalletBalance();
              } else {
                // Thông báo lỗi chi tiết
                ScaffoldMessenger.of(mainContext).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Rút tiền thất bại!',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                error,
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    backgroundColor: Colors.red,
                    duration: const Duration(seconds: 5),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    action: SnackBarAction(
                      label: 'Đóng',
                      textColor: Colors.white,
                      onPressed: () {
                        ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      },
                    ),
                  ),
                );
              }
            } catch (e) {
              // Xử lý lỗi network hoặc lỗi khác
              if (mounted && Navigator.canPop(mainContext)) {
                Navigator.pop(mainContext); // Đóng loading dialog
              }
              
              if (mounted) {
                ScaffoldMessenger.of(mainContext).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Lỗi kết nối! Vui lòng thử lại.',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    backgroundColor: Colors.red,
                    duration: const Duration(seconds: 4),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
              }
            }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepOrange,
            ),
            child: const Text('Rút tiền', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Kiểm tra trạng thái player mỗi lần build nếu cần
    if (!_isCheckingPlayer && userId.isNotEmpty && !isPlayer) {
      _isCheckingPlayer = true;
      _checkIsPlayer().then((_) {
        _isCheckingPlayer = false;
      });
    }
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Cover photo + avatar
              Stack(
                clipBehavior: Clip.none,
                children: [
                  // Ảnh bìa
                  Container(
                    width: double.infinity,
                    height: 160,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(0),
                        topRight: Radius.circular(0),
                        bottomLeft: Radius.circular(24),
                        bottomRight: Radius.circular(24),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: coverImageBytes != null
                        ? Image.memory(coverImageBytes!, fit: BoxFit.cover, width: double.infinity, height: 160)
                        : Center(child: Icon(Icons.image, size: 64, color: Colors.grey[400])),
                  ),
                  // Nút đổi ảnh bìa
                  Positioned(
                    top: 16,
                    right: 20,
                    child: GestureDetector(
                      onTap: _pickAndUploadCover,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.deepOrange,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.08),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(8),
                        child: const Icon(Icons.camera_alt, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                  // Avatar giữ nguyên như trước
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: -44,
                    child: Center(
                      child: GestureDetector(
                        onTap: _pickAndUploadAvatar,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 5),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.08),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 44,
                            backgroundColor: Colors.white,
                            backgroundImage: avatarBytes != null ? MemoryImage(avatarBytes!) : null,
                            child: avatarBytes == null
                                ? Icon(Icons.person, size: 44, color: Colors.deepOrange)
                                : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 56),
              // Thông tin
              Padding(
                padding: EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Thông tin", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black54)),
                    const SizedBox(height: 16),
                    _InfoRow(
                      icon: Icons.monetization_on,
                      label: "Số dư xu",
                      value: isLoadingBalance
                        ? null
                        : (coinBalance != null ? '${coinBalance!.toStringAsFixed(0)} xu' : 'Lỗi'),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const BalanceHistoryScreen()),
                        );
                      },
                      child: _InfoRow(icon: Icons.balance, label: "Biến động số dư"),
                    ),
                    const SizedBox(height: 8),
                    isLoading 
                      ? const Center(child: CircularProgressIndicator())
                      : _InfoRow(
                          icon: Icons.info, 
                          label: "ID", 
                          value: userId,
                          isLink: true
                        ),
                    const SizedBox(height: 8),
                    const SizedBox(height: 24),
                    const Text("Cài đặt", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black54)),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const OrdersScreen()),
                        );
                      },
                      child: _SettingRow(
                        icon: Icons.shopping_bag,
                        label: 'Đơn hàng',
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const UserGivenReviewsScreen()),
                        );
                      },
                      child: _SettingRow(
                        icon: Icons.star,
                        label: 'Đánh giá',
                        color: Colors.amber,
                      ),
                    ),
                    const SizedBox(height: 8),

                    const SizedBox(height: 8),
                    if (isPlayer)
                    GestureDetector(
                      onTap: () {
                        if (playerId != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => PlayerRewardScreen(playerId: playerId!),
                            ),
                          );
                        }
                      },
                      child: _SettingRow(
                        icon: Icons.card_giftcard,
                        label: 'Thưởng',
                        color: Colors.pinkAccent,
                      ),
                      ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        if (playerId != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => CreateMomentScreen(playerId: playerId!),
                            ),
                          );
                        }
                      },
                      child: isPlayer
                          ? _SettingRow(
                              icon: Icons.camera_alt,
                              label: 'Đăng khoảnh khắc',
                              color: Colors.deepOrange,
                            )
                          : const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _showUpdateOptions = !_showUpdateOptions;
                        });
                      },
                      child: _SettingRow(
                        icon: Icons.settings,
                        label: 'Cập nhật thông tin',
                      ),
                    ),
                    if (_showUpdateOptions) ...[
                      Padding(
                        padding: const EdgeInsets.only(left: 48, top: 4, bottom: 4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.person, color: Colors.deepOrange, size: 22),
                              title: const Text('Cập nhật thông tin', style: TextStyle(fontSize: 15)),
                              subtitle: const Text('Thay đổi avatar, tên, url...', style: TextStyle(fontSize: 12)),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const UpdateProfileScreen()),
                                );
                              },
                            ),
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: Icon(Icons.sports_esports, color: Colors.amber[800], size: 22),
                              title: const Text('Cập nhật player', style: TextStyle(fontSize: 15)),
                              subtitle: const Text('Chỉnh sửa thông tin player, giá thuê...', style: TextStyle(fontSize: 12)),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const UpdatePlayerScreen()),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const ChangePasswordScreen()),
                        );
                      },
                      child: _SettingRow(icon: Icons.lock, label: "Đổi mật khẩu", color: Colors.purple),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const PolicyScreen()),
                        );
                      },
                      child: _SettingRow(icon: Icons.policy, label: "Chính sách", color: Colors.red),
                    ),
                    const SizedBox(height: 8),
                    if (isPlayer)
                      GestureDetector(
                        onTap: _pickAndUploadMultipleImages,
                        child: _SettingRow(
                          icon: Icons.cloud_upload,
                          label: 'Tải ảnh lên',
                          color: Colors.blue,
                        ),
                      ),
                    if (_selectedImage != null)
                      Padding(
                        padding: const EdgeInsets.only(left: 48, top: 4, bottom: 4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.image, color: Colors.blue, size: 20),
                                const SizedBox(width: 8),
                                Expanded(child: Text(_selectedImage!.path.split('/').last)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: _pickAndUploadAvatar,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.deepOrange,
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 24),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Tải lên', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () => _showWithdrawDialog(context),
                      child: _SettingRow(
                        icon: Icons.money_outlined,
                        label: 'Rút tiền',
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isPlayer)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    tileColor: Colors.deepOrange.withOpacity(0.08),
                    leading: const Icon(Icons.sports_esports, color: Colors.deepOrange),
                    title: const Text('Đăng ký làm player', style: TextStyle(fontWeight: FontWeight.w500)),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RegisterPlayerScreen()),
                      ).then((_) => _checkIsPlayer());
                    },
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: handleLogout,
                  child: const Text('Đăng xuất', style: TextStyle(fontSize: 18, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;
  final bool isLink;
  const _InfoRow({
    required this.icon,
    required this.label,
    this.value,
    this.isLink = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: Colors.deepOrange[100],
          child: Icon(icon, color: Colors.deepOrange, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
              if (value != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    value!,
                    style: TextStyle(
                      fontSize: 15,
                      color: isLink ? Colors.deepOrange : Colors.black87,
                      decoration: isLink ? TextDecoration.underline : null,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SettingSwitch extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool value;
  final Color? color;
  const _SettingSwitch({
    required this.icon,
    required this.label,
    required this.value,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: (color is MaterialColor)
              ? (color as MaterialColor).shade100
              : (color ?? Colors.blue).withOpacity(0.15),
          child: Icon(icon, color: color ?? Colors.blue, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        ),
        Switch(
          value: value,
          onChanged: (v) {},
          activeColor: Colors.deepOrange,
        ),
      ],
    );
  }
}

class _SettingRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  const _SettingRow({
    required this.icon,
    required this.label,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: (color is MaterialColor)
              ? (color as MaterialColor).shade100
              : (color ?? Colors.yellow).withOpacity(0.15),
          child: Icon(icon, color: color ?? Colors.yellow[800], size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        ),
      ],
    );
  }
} 