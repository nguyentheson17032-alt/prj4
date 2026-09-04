import 'package:flutter/material.dart';
import 'api_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final emailController = TextEditingController();
  bool isLoading = false;
  bool isNotRobot = false;
  String? emailError;
  bool _isHovered = false;

  bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  void validateInputs() {
    setState(() {
      emailError = !isValidEmail(emailController.text.trim()) ? 'Email không hợp lệ' : null;
    });
  }

  Future<void> handleSendEmail() async {
    validateInputs();
    if (emailError != null || !isNotRobot) {
      if (!isNotRobot) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vui lòng xác nhận bạn không phải robot')),
        );
      }
      return;
    }

    setState(() => isLoading = true);
    try {
      await ApiService.forgotPassword(emailController.text.trim());
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email khôi phục mật khẩu đã được gửi')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Đã xảy ra lỗi: ${e.toString()}')),
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
                            
                            const SizedBox(height: 20),
                            
                            // Emoji and decoration
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                // Halo effect
                                Container(
                                  width: 200,
                                  height: 200,
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
                                        blurRadius: 20,
                                        spreadRadius: 5,
                                      ),
                                    ],
                                  ),
                                ),
                                
                                // Emoji
                                const Text(
                                  '🔑',
                                  style: TextStyle(fontSize: 120),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 30),
                            
                            // Title
                            const Text(
                              'QUÊN MẬT KHẨU',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFE65100),
                                letterSpacing: 1.2,
                              ),
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // Description
                            const Text(
                              'Nhập email của bạn để nhận link khôi phục mật khẩu',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            
                            const SizedBox(height: 30),
                            
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
                                  prefixIcon: Icon(Icons.email_outlined, color: Colors.grey[700], size: 32),
                                  hintText: 'Email khôi phục mật khẩu',
                                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 16),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(28),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                                  errorText: emailError,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // reCAPTCHA
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Checkbox(
                                    value: isNotRobot,
                                    onChanged: (v) => setState(() => isNotRobot = v ?? false),
                                    activeColor: const Color(0xFFE65100),
                                  ),
                                  const Text(
                                    "Tôi không phải robot",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const Spacer(),
                                  Icon(Icons.security, color: Colors.blue, size: 32),
                                ],
                              ),
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // Send email button
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
                                      onPressed: isLoading ? null : handleSendEmail,
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
                                              'GỬI EMAIL',
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
                            
                            // Back to login
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: const Text(
                                'Quay lại đăng nhập',
                                style: TextStyle(
                                  color: Color(0xFFE65100),
                                  fontWeight: FontWeight.w500,
                                  fontSize: 17,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 20),
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