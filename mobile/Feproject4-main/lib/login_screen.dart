import 'package:flutter/material.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';
import 'main.dart';
import 'api_service.dart';
import 'utils/firebase_helper.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  bool isLoading = false;
  String? usernameError;
  String? passwordError;
  String? errorMessage;
  bool showErrorBanner = false;
  bool _isHovered = false;
  bool _obscurePassword = true;

  void validateInputs() {
    setState(() {
      usernameError = usernameController.text.trim().isEmpty ? 'Vui lòng nhập tên đăng nhập' : null;
      passwordError = passwordController.text.trim().isEmpty ? 'Vui lòng nhập mật khẩu' : null;
    });
  }

  void showErrorSnackBar(String message) {
    setState(() {
      errorMessage = message;
      showErrorBanner = true;
    });
    
    // Tự động ẩn error banner sau 5 giây
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        setState(() {
          showErrorBanner = false;
        });
      }
    });
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

  Future<void> handleLogin() async {
    validateInputs();
    if (usernameError != null || passwordError != null) return;

    setState(() => isLoading = true);
    try {
      final username = usernameController.text.trim();
      final password = passwordController.text.trim();
      
      // Kiểm tra kết nối internet
      if (!await ApiService.checkConnection()) {
        if (!mounted) return;
        showErrorSnackBar('Không có kết nối internet');
        return;
      }

      final error = await ApiService.login(username, password);
      if (!mounted) return;

      if (error == null) {
        // Sau khi login thành công, lấy thông tin user
        final user = await ApiService.getCurrentUser();
        if (user != null) {
          // Cập nhật device token nếu cần - sử dụng FirebaseHelper
          try {
            String? deviceToken = await FirebaseHelper.getDeviceToken();
            if (deviceToken != null) {
              await ApiService.updateDeviceToken(deviceToken);
            }
          } catch (firebaseError) {
            // Không crash app khi có lỗi Firebase
          }
          
          showSuccessSnackBar('Đăng nhập thành công!');
          await Future.delayed(const Duration(milliseconds: 500));
          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const MainNavigation()),
          );
        } else {
          showErrorSnackBar('Không lấy được thông tin người dùng!');
        }
      } else {
        // Xử lý thông báo lỗi thân thiện hơn
        String friendlyMessage = error;
        
        // Kiểm tra nếu user bị ban
        if (error.contains('User account is locked') || 
            error.contains('account is locked') ||
            error.contains('banned') ||
            error.contains('locked')) {
          friendlyMessage = 'Chúng tôi đã xác thực bạn có hành vi vi phạm chính sách. Bạn đã bị ban.';
        }
        // Kiểm tra các lỗi khác
        else if (error.contains('Invalid username or password') ||
                 error.contains('Bad credentials')) {
          friendlyMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
        }
        else if (error.contains('User not found')) {
          friendlyMessage = 'Tài khoản không tồn tại';
        }
        else if (error.contains('FormatException')) {
          friendlyMessage = 'Lỗi kết nối server. Vui lòng thử lại sau.';
        }
        
        showErrorSnackBar(friendlyMessage);
      }
    } catch (e) {
      if (!mounted) return;
      
      // Xử lý lỗi kết nối thân thiện hơn
      String friendlyError = 'Đã xảy ra lỗi: $e';
      
      if (e.toString().contains('FormatException')) {
        friendlyError = 'Lỗi kết nối server. Vui lòng kiểm tra kết nối internet và thử lại.';
      } else if (e.toString().contains('SocketException')) {
        friendlyError = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.';
      } else if (e.toString().contains('TimeoutException')) {
        friendlyError = 'Kết nối bị timeout. Vui lòng thử lại sau.';
      }
      
      showErrorSnackBar(friendlyError);
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFFFB74D), // Light orange/yellow
              Color(0xFFFF9800), // Deeper orange
            ],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Background decorative elements - more scattered like in the image
              Positioned(
                top: 80,
                left: 25,
                child: Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    color: Colors.yellow.withValues(alpha: 0.4),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                top: 150,
                right: 40,
                child: Container(
                  width: 45,
                  height: 45,
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                top: 220,
                left: 60,
                child: Container(
                  width: 35,
                  height: 35,
                  decoration: BoxDecoration(
                    color: Colors.yellow.withValues(alpha: 0.25),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                top: 280,
                right: 20,
                child: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              
              // Main content
              Column(
                children: [
                  Expanded(
        child: SingleChildScrollView(
          child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                            const SizedBox(height: 50),
                            
                            // Ultra HD 3D Emoji and Game Controller - Full HD Quality
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                // Triple layer halo effect (sun/halo) - Ultra HD - 2x Size
                                Container(
                                  width: 320,
                                  height: 320,
                                  decoration: BoxDecoration(
                                    gradient: RadialGradient(
                                      colors: [
                                        Colors.yellow.withValues(alpha: 0.95),
                                        Colors.yellow.withValues(alpha: 0.7),
                                        Colors.yellow.withValues(alpha: 0.4),
                                      ],
                                      stops: const [0.0, 0.6, 1.0],
                                    ),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.yellow.withValues(alpha: 0.4),
                                        blurRadius: 30,
                                        spreadRadius: 8,
                                      ),
                                      BoxShadow(
                                        color: Colors.orange.withValues(alpha: 0.3),
                                        blurRadius: 20,
                                        spreadRadius: 5,
                                      ),
                                    ],
                                  ),
                                ),
                                
                                // Ultra HD 3D Emoji with enhanced rosy cheeks - 2x Size
                                Positioned(
                                  top: 40,
                                  child: Container(
                                    width: 240,
                                    height: 240,
                                    decoration: BoxDecoration(
                                      gradient: RadialGradient(
                                        colors: [
                                          Colors.yellow,
                                          Colors.yellow.shade300,
                                        ],
                                        stops: const [0.0, 1.0],
                                      ),
                                                                              borderRadius: BorderRadius.circular(120),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.2),
                                          blurRadius: 12,
                                          offset: const Offset(0, 4),
                                        ),
                                        BoxShadow(
                                          color: Colors.yellow.withValues(alpha: 0.3),
                                          blurRadius: 8,
                                          offset: const Offset(0, -2),
                                        ),
                                      ],
                                    ),
                                    child: Stack(
                                      children: [
                                        // Enhanced emoji face with better positioning - 2x Size
                                        const Center(
                                          child: Text(
                                            '😊',
                                            style: TextStyle(fontSize: 160),
                                          ),
                                        ),
                                        // Enhanced rosy cheeks - larger and more visible - 2x Size
                                        Positioned(
                                          left: 36,
                                          top: 60,
                                          child: Container(
                                            width: 32,
                                            height: 32,
                                            decoration: BoxDecoration(
                                              gradient: RadialGradient(
                                                colors: [
                                                  Colors.pink.shade300,
                                                  Colors.pink.withValues(alpha: 0.8),
                                                ],
                                              ),
                                              shape: BoxShape.circle,
                                              boxShadow: [
                                                BoxShadow(
                                                  color: Colors.pink.withValues(alpha: 0.3),
                                                  blurRadius: 4,
                                                  offset: const Offset(0, 1),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                        Positioned(
                                          right: 36,
                                          top: 60,
                                          child: Container(
                                            width: 32,
                                            height: 32,
                                            decoration: BoxDecoration(
                                              gradient: RadialGradient(
                                                colors: [
                                                  Colors.pink.shade300,
                                                  Colors.pink.withValues(alpha: 0.8),
                                                ],
                                              ),
                                              shape: BoxShape.circle,
                                              boxShadow: [
                                                BoxShadow(
                                                  color: Colors.pink.withValues(alpha: 0.3),
                                                  blurRadius: 4,
                                                  offset: const Offset(0, 1),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                        // Top pink dots (hair/ears) - enhanced - 2x Size
                                        Positioned(
                                          left: 50,
                                          top: 30,
                                          child: Container(
                                            width: 24,
                                            height: 24,
                                            decoration: BoxDecoration(
                                              gradient: RadialGradient(
                                                colors: [
                                                  Colors.pink.shade300,
                                                  Colors.pink.withValues(alpha: 0.7),
                                                ],
                                              ),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ),
                                        Positioned(
                                          right: 50,
                                          top: 30,
                                          child: Container(
                                            width: 24,
                                            height: 24,
                                            decoration: BoxDecoration(
                                              gradient: RadialGradient(
                                                colors: [
                                                  Colors.pink.shade300,
                                                  Colors.pink.withValues(alpha: 0.7),
                                                ],
                                              ),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                
                                // Ultra HD 3D Game Controller - enhanced quality - 2x Size
                                Positioned(
                                  bottom: -40,
                                  child: Container(
                                    width: 240,
                                    height: 140,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          Colors.orange.shade600,
                                          Colors.orange.shade500,
                                        ],
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                      ),
                                      borderRadius: BorderRadius.circular(60),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.3),
                                          blurRadius: 15,
                                          offset: const Offset(0, 6),
                                        ),
                                        BoxShadow(
                                          color: Colors.orange.withValues(alpha: 0.2),
                                          blurRadius: 8,
                                          offset: const Offset(0, -2),
                                        ),
                                      ],
                                    ),
                                    child: Stack(
                                      children: [
                                        // Enhanced D-pad (left side) - larger and clearer - 2x Size
                                        Positioned(
                                          left: 40,
                                          top: 40,
                                          child: Container(
                                            width: 72,
                                            height: 72,
                                            decoration: BoxDecoration(
                                              gradient: RadialGradient(
                                                colors: [
                                                  Colors.grey.shade700,
                                                  Colors.grey.shade800,
                                                ],
                                              ),
                                              borderRadius: BorderRadius.circular(36),
                                              boxShadow: [
                                                BoxShadow(
                                                  color: Colors.black.withValues(alpha: 0.4),
                                                  blurRadius: 4,
                                                  offset: const Offset(0, 2),
                                                ),
                                                BoxShadow(
                                                  color: Colors.grey.withValues(alpha: 0.3),
                                                  blurRadius: 2,
                                                  offset: const Offset(0, -1),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                        // Enhanced Action buttons (right side) - 4 buttons with better spacing - 2x Size
                                        Positioned(
                                          right: 40,
                                          top: 30,
                                          child: Column(
                                            children: [
                                              Row(
                                                children: [
                                                  Container(
                                                    width: 40,
                                                    height: 40,
                                                    decoration: BoxDecoration(
                                                      gradient: RadialGradient(
                                                        colors: [
                                                          Colors.grey.shade700,
                                                          Colors.grey.shade800,
                                                        ],
                                                      ),
                                                      shape: BoxShape.circle,
                                                      boxShadow: [
                                                        BoxShadow(
                                                          color: Colors.black.withValues(alpha: 0.4),
                                                          blurRadius: 3,
                                                          offset: const Offset(0, 1),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  const SizedBox(width: 20),
                                                  Container(
                                                    width: 40,
                                                    height: 40,
                                                    decoration: BoxDecoration(
                                                      gradient: RadialGradient(
                                                        colors: [
                                                          Colors.grey.shade700,
                                                          Colors.grey.shade800,
                                                        ],
                                                      ),
                                                      shape: BoxShape.circle,
                                                      boxShadow: [
                                                        BoxShadow(
                                                          color: Colors.black.withValues(alpha: 0.4),
                                                          blurRadius: 3,
                                                          offset: const Offset(0, 1),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 16),
                                              Row(
                                                children: [
                                                  Container(
                                                    width: 40,
                                                    height: 40,
                                                    decoration: BoxDecoration(
                                                      gradient: RadialGradient(
                                                        colors: [
                                                          Colors.grey.shade700,
                                                          Colors.grey.shade800,
                                                        ],
                                                      ),
                                                      shape: BoxShape.circle,
                                                      boxShadow: [
                                                        BoxShadow(
                                                          color: Colors.black.withValues(alpha: 0.4),
                                                          blurRadius: 3,
                                                          offset: const Offset(0, 1),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  const SizedBox(width: 20),
                                                  Container(
                                                    width: 40,
                                                    height: 40,
                                                    decoration: BoxDecoration(
                                                      gradient: RadialGradient(
                                                        colors: [
                                                          Colors.grey.shade700,
                                                          Colors.grey.shade800,
                                                        ],
                                                      ),
                                                      shape: BoxShape.circle,
                                                      boxShadow: [
                                                        BoxShadow(
                                                          color: Colors.black.withValues(alpha: 0.4),
                                                          blurRadius: 3,
                                                          offset: const Offset(0, 1),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 40),
                            
                            // Title - exact match with image
                            const Text(
                              'ĐĂNG NHẬP',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFE65100), // Dark orange
                                letterSpacing: 1.2,
                              ),
                            ),
                            
                            const SizedBox(height: 30),
                            
                            // Username field - exact match with image
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC), // Creamy beige
                                borderRadius: BorderRadius.circular(28),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.08),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: TextField(
                  controller: usernameController,
                  decoration: InputDecoration(
                                  prefixIcon: Icon(Icons.person_outline_rounded, color: Colors.grey[700], size: 32),
                    hintText: 'Tên đăng nhập',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 16),
                    border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                      borderSide: BorderSide.none,
                    ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                    errorText: usernameError,
                  ),
                ),
                            ),
                            
                            const SizedBox(height: 24),
                            
                            // Password field - exact match with image
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC), // Creamy beige
                                borderRadius: BorderRadius.circular(28),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.08),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: TextField(
                                controller: passwordController,
                                obscureText: _obscurePassword,
                                decoration: InputDecoration(
                                  prefixIcon: Icon(Icons.vpn_key_rounded, color: Colors.grey[700], size: 32),
                                  hintText: 'Mật khẩu',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 16),
                                  suffixIcon: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _obscurePassword = !_obscurePassword;
                                      });
                                    },
                                    child: Icon(
                                      _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                      color: Colors.grey[700],
                                      size: 28,
                                    ),
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                                  errorText: passwordError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // Enhanced Login button with hover effect
                            StatefulBuilder(
                              builder: (context, setState) {
                                return MouseRegion(
                                  onEnter: (_) => setState(() => _isHovered = true),
                                  onExit: (_) => setState(() => _isHovered = false),
                                  child: Container(
                                    width: double.infinity,
                                    height: 55,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: _isHovered 
                                          ? [Colors.deepOrange.shade600, Colors.deepOrange.shade500]
                                          : [Colors.deepOrange.shade500, Colors.deepOrange.shade400],
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                      ),
                                      borderRadius: BorderRadius.circular(28),
                                      boxShadow: [
                                        BoxShadow(
                                          color: _isHovered 
                                            ? Colors.deepOrange.withValues(alpha: 0.6)
                                            : Colors.deepOrange.withValues(alpha: 0.5),
                                          blurRadius: _isHovered ? 15 : 12,
                                          offset: Offset(0, _isHovered ? 8 : 6),
                                        ),
                                      ],
                                    ),
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.transparent,
                                        shadowColor: Colors.transparent,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(28),
                                        ),
                                      ),
                                      onPressed: isLoading ? null : handleLogin,
                                      child: isLoading
                                          ? const SizedBox(
                                              width: 26,
                                              height: 26,
                                              child: CircularProgressIndicator(
                                                color: Colors.white,
                                                strokeWidth: 2.5,
                                              ),
                                            )
                                          : const Text(
                                              'ĐĂNG NHẬP',
                                              style: TextStyle(
                                                fontSize: 20,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white,
                                                letterSpacing: 1.0,
                                              ),
                                            ),
                                    ),
                                  ),
                                );
                              },
                            ),
                            
                                                        const SizedBox(height: 15),
                            
                            // Forgot password - exact match with image
                            GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()),
                                );
                              },
                              child: const Text(
                                'Quên mật khẩu',
                                style: TextStyle(
                                  color: Color(0xFFE65100), // Darker orange
                                  fontWeight: FontWeight.w500,
                                  fontSize: 17,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 8),
                            
                            // Register link - right below forgot password
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Bạn chưa có tài khoản? ',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (context) => const RegisterScreen()),
                                    );
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.white.withValues(alpha: 0.3),
                                        width: 1,
                                      ),
                                    ),
                                    child: const Text(
                                      'Đăng ký ngay!',
                                      style: TextStyle(
                                        color: Color(0xFFE65100),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // Error Banner
                            if (showErrorBanner && errorMessage != null)
                              Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 20),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.red[600],
                                  borderRadius: BorderRadius.circular(15),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.red.withValues(alpha: 0.4),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        Icons.warning_amber_rounded,
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Lỗi đăng nhập',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            errorMessage!,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          showErrorBanner = false;
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Icon(
                                          Icons.close,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  

              ],
            ),
            ],
          ),
        ),
      ),
    );
  }
} 