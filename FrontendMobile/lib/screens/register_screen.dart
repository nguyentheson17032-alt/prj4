import 'package:flutter/material.dart';
import '../services/api_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final usernameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  final fullNameController = TextEditingController();
  bool isLoading = false;
  String? usernameError;
  String? emailError;
  String? passwordError;
  String? confirmPasswordError;
  String? fullNameError;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isHovered = false;

  bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  bool isStrongPassword(String password) {
    return password.length >= 8 &&
        RegExp(r'[A-Z]').hasMatch(password) &&
        RegExp(r'[a-z]').hasMatch(password) &&
        RegExp(r'[0-9]').hasMatch(password);
  }

  void validateInputs() {
    setState(() {
      usernameError = usernameController.text.trim().isEmpty ? 'Vui lòng nhập tên đăng nhập' : null;
      emailError = !isValidEmail(emailController.text.trim()) ? 'Email không hợp lệ' : null;
      fullNameError = fullNameController.text.trim().isEmpty ? 'Vui lòng nhập họ và tên' : null;
      passwordError = !isStrongPassword(passwordController.text.trim())
          ? 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số'
          : null;
      confirmPasswordError = passwordController.text.trim() != confirmPasswordController.text.trim()
          ? 'Mật khẩu không khớp'
          : null;
    });
  }

  Future<void> handleRegister() async {
    validateInputs();
    if (usernameError != null || emailError != null || passwordError != null || 
        confirmPasswordError != null || fullNameError != null) return;

    setState(() => isLoading = true);
    try {
      // Kiểm tra kết nối internet
      if (!await ApiService.checkConnection()) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không có kết nối internet')),
        );
        return;
      }

      final userData = {
        'username': usernameController.text.trim(),
        'password': passwordController.text.trim(),
        'email': emailController.text.trim(),
        'fullName': fullNameController.text.trim(),
        'dateOfBirth': null,
        'phoneNumber': null,
        'address': null,
        'gender': null,
      };

      final error = await ApiService.register(userData);
      if (!mounted) return;

      if (error == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đăng ký thành công!')),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error)),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã xảy ra lỗi: $e')),
      );
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
              // Background decorative elements
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
                            const SizedBox(height: 30),
                            
                            // Back button
                            Align(
                              alignment: Alignment.centerLeft,
                              child: GestureDetector(
                                onTap: () => Navigator.pop(context),
                                child: Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.1),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.arrow_back_ios_new,
                                    color: Color(0xFFE65100),
                                    size: 24,
                                  ),
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 10),
                            
                            // Emoji and decoration
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                // Halo effect
                                Container(
                                  width: 120,
                                  height: 120,
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
                                        blurRadius: 15,
                                        spreadRadius: 3,
                                      ),
                                    ],
                                  ),
                                ),
                                
                                // Emoji
                                const Text(
                                  '🎮',
                                  style: TextStyle(fontSize: 70),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 15),
                            
                            // Title
                            const Text(
                              'ĐĂNG KÝ',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFE65100),
                                letterSpacing: 1.2,
                              ),
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // Username field
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC),
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
                                  prefixIcon: Icon(Icons.person_outline_rounded, color: Colors.grey[700], size: 28),
                                  hintText: 'Tên đăng nhập',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 15),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                  errorText: usernameError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 12),
                            
                            // Email field
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC),
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
                                controller: emailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: InputDecoration(
                                  prefixIcon: Icon(Icons.email_outlined, color: Colors.grey[700], size: 28),
                                  hintText: 'Email',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 15),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                  errorText: emailError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 12),
                            
                            // Full name field
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC),
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
                                controller: fullNameController,
                                decoration: InputDecoration(
                                  prefixIcon: Icon(Icons.person, color: Colors.grey[700], size: 28),
                                  hintText: 'Họ và tên',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 15),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                  errorText: fullNameError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 12),
                            
                            // Password field
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC),
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
                                  prefixIcon: Icon(Icons.vpn_key_rounded, color: Colors.grey[700], size: 28),
                                  hintText: 'Mật khẩu',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 15),
                                  suffixIcon: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _obscurePassword = !_obscurePassword;
                                      });
                                    },
                                    child: Icon(
                                      _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                      color: Colors.grey[700],
                                      size: 24,
                                    ),
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                  errorText: passwordError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 12),
                            
                            // Confirm password field
                            Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF5F5DC),
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
                                controller: confirmPasswordController,
                                obscureText: _obscureConfirmPassword,
                                decoration: InputDecoration(
                                  prefixIcon: Icon(Icons.vpn_key_rounded, color: Colors.grey[700], size: 28),
                                  hintText: 'Xác nhận mật khẩu',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 15),
                                  suffixIcon: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _obscureConfirmPassword = !_obscureConfirmPassword;
                                      });
                                    },
                                    child: Icon(
                                      _obscureConfirmPassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                      color: Colors.grey[700],
                                      size: 24,
                                    ),
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                                  errorText: confirmPasswordError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 15),
                            
                            // Register button
                            StatefulBuilder(
                              builder: (context, setState) {
                                return MouseRegion(
                                  onEnter: (_) => setState(() => _isHovered = true),
                                  onExit: (_) => setState(() => _isHovered = false),
                                  child: Container(
                                    width: double.infinity,
                                    height: 50,
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
                                      onPressed: isLoading ? null : handleRegister,
                                      child: isLoading
                                          ? const SizedBox(
                                              width: 24,
                                              height: 24,
                                              child: CircularProgressIndicator(
                                                color: Colors.white,
                                                strokeWidth: 2.5,
                                              ),
                                            )
                                          : const Text(
                                              'ĐĂNG KÝ',
                                              style: TextStyle(
                                                fontSize: 18,
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
                            
                            const SizedBox(height: 12),
                            
                            // Back to login
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: const Text(
                                'Đã có tài khoản? Đăng nhập',
                                style: TextStyle(
                                  color: Color(0xFFE65100),
                                  fontWeight: FontWeight.w500,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 15),
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