import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'api_service.dart';
import 'webview_screen.dart';
import 'balance_history_screen.dart';
import 'utils/notification_helper.dart';

class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  final TextEditingController _amountController = TextEditingController();
  String selectedMethod = 'MOMO';
  int? coinBalance;
  bool isLoadingBalance = true;
  int calculatedCoin = 0;
  
  final List<Map<String, dynamic>> paymentMethods = [
    {'name': 'MOMO', 'icon': Icons.phone_android, 'color': Colors.pink},
    {'name': 'VNPAY', 'icon': Icons.account_balance, 'color': Colors.blue},
    {'name': 'ZALOPAY', 'icon': Icons.payment, 'color': Colors.blue[700]},
    {'name': 'BANK_TRANSFER', 'icon': Icons.account_balance_wallet, 'color': Colors.green},
  ];

  @override
  void initState() {
    super.initState();
    _loadWalletBalance();
    _amountController.addListener(_updateCalculatedCoin);
  }

  void _updateCalculatedCoin() {
    final amount = int.tryParse(_amountController.text) ?? 0;
    setState(() {
      calculatedCoin = amount;
    });
  }

  Future<void> _loadWalletBalance() async {
    final balance = await ApiService.fetchWalletBalance();
    setState(() {
      coinBalance = balance;
      isLoadingBalance = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Nạp xu',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: Colors.deepOrange),
            tooltip: 'Lịch sử giao dịch',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => BalanceHistoryScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Số dư hiện tại
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Số dư xu',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.black54,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.monetization_on, color: Colors.amber),
                        const SizedBox(width: 8),
                        isLoadingBalance
                          ? const SizedBox(
                              width: 24, height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.deepOrange),
                            )
                          : Text(
                              coinBalance != null
                                ? '${formatXu(coinBalance)} xu'
                                : 'Lỗi',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.amber[800],
                              ),
                            ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // Nhập số tiền
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Nhập số tiền (VNĐ)',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Nhập số tiền (VNĐ)',
                        prefixIcon: const Icon(Icons.attach_money, color: Colors.deepOrange),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: Colors.grey[100],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Bạn nhận được: ${formatXu(calculatedCoin)} xu',
                      style: const TextStyle(fontSize: 15, color: Colors.amber, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      children: [
                        _buildAmountChip('10000'),
                        _buildAmountChip('20000'),
                        _buildAmountChip('50000'),
                        _buildAmountChip('100000'),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // Phương thức thanh toán
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Phương thức thanh toán',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...paymentMethods.map((method) => _buildPaymentMethod(method)),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // Nút nạp tiền
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      final amount = int.tryParse(_amountController.text) ?? 0;
                      final coin = amount;
                      print('DEBUG: Số tiền nhập: $amount, số coin gửi lên API: $coin');
                      if (coin < 1) {
                        showPrettyError(context, 'Số tiền nạp tối thiểu là 1 VNĐ (tương đương 1 xu)', '');
                        return;
                      }
                      if (selectedMethod == 'VNPAY') {
                        final user = await ApiService.getCurrentUser();
                        if (user == null || user['id'] == null) {
                          showPrettyError(context, 'Không lấy được thông tin người dùng', '');
                          return;
                        }
                        final result = await ApiService.createVnPayPayment(
                          amount: amount,
                          orderInfo: 'Nap xu qua VNPAY',
                          userId: user['id'],
                        );
                        if (result != null && result['paymentUrl'] != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => WebViewScreen(
                                url: result['paymentUrl'],
                                title: 'Thanh toán VNPAY',
                              ),
                            ),
                          ).then((_) {
                            _loadWalletBalance();
                          });
                        } else {
                          showPrettyError(context, 'Không tạo được link thanh toán VNPAY', '');
                        }
                        return;
                      }
                      if (selectedMethod == 'MOMO' || selectedMethod == 'ZALOPAY') {
                        final error = await ApiService.topUp(coin);
                        if (error == null) {
                          _loadWalletBalance();
                          showPrettyError(context, 'Nạp xu thành công', '');
                        } else {
                          showPrettyError(context, 'Lỗi', error);
                        }
                        return;
                      }
                      // Nếu là BANK_TRANSFER hoặc phương thức khác cần webview, vẫn gọi deposit
                      final result = await ApiService.deposit(amount.toDouble(), selectedMethod);
                      print('Deposit API response:');
                      print(result);
                      if (result == null) {
                        showPrettyError(context, 'Lỗi không xác định!', '');
                        return;
                      }
                      if (result['paymentUrl'] != null) {
                        print('Payment URL: ${result['paymentUrl']}');
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => WebViewScreen(url: result['paymentUrl'], title: 'Thanh toán'),
                          ),
                        );
                      } else if (result['qrCode'] != null) {
                        _showQRCodeDialog(result);
                      } else if (selectedMethod == 'BANK_TRANSFER') {
                        _showBankTransferDialog(result);
                      }
                      showPrettyError(context, 'Nạp xu thành công', result['message'] ?? '');
                    } catch (e) {
                      showPrettyError(context, 'Lỗi', e.toString());
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Nạp xu ngay',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAmountChip(String amount) {
    return ActionChip(
      label: Text(amount),
      onPressed: () {
        setState(() {
          _amountController.text = amount.replaceAll('.', '');
        });
      },
      backgroundColor: Colors.orange[50],
      labelStyle: const TextStyle(color: Colors.amber),
    );
  }

  Widget _buildPaymentMethod(Map<String, dynamic> method) {
    final isSelected = selectedMethod == method['name'];
    return InkWell(
      onTap: () {
        setState(() {
          selectedMethod = method['name'];
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.orange[50] : Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? Colors.deepOrange : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(method['icon'], color: method['color']),
            const SizedBox(width: 12),
            Text(
              method['name'],
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Colors.deepOrange : Colors.black87,
              ),
            ),
            const Spacer(),
            if (isSelected)
              const Icon(Icons.check_circle, color: Colors.deepOrange),
          ],
        ),
      ),
    );
  }

  void _showQRCodeDialog(Map<String, dynamic> result) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Quét mã QR để nạp xu',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: QrImageView(
                  data: result['qrCode'] ?? '',
                  version: QrVersions.auto,
                  size: 200.0,
                  backgroundColor: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Số tiền: ${_amountController.text} VNĐ',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.deepOrange,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Bạn nhận được: ${formatXu(calculatedCoin)} xu',
                style: const TextStyle(
                  fontSize: 15,
                  color: Colors.amber,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Đóng'),
                  ),
                  ElevatedButton(
                    onPressed: () async {
                      try {
                        print('DEBUG: Số coin gửi lên API (QR): $calculatedCoin');
                        if (calculatedCoin < 1) {
                          showPrettyError(context, 'Số tiền nạp tối thiểu là 1 VNĐ (tương đương 1 xu)', '');
                          return;
                        }
                        // Hiển thị loading
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => const Center(
                            child: CircularProgressIndicator(),
                          ),
                        );

                        // Gọi API topup
                        final error = await ApiService.topUp(calculatedCoin);
                        
                        // Đóng loading
                        Navigator.pop(context);
                        
                        if (error == null) {
                          // Đóng dialog QR code
                          Navigator.pop(context);
                          // Cập nhật số dư
                          _loadWalletBalance();
                          // Hiển thị thông báo thành công
                          showPrettyError(context, 'Nạp xu thành công', '');
                        } else {
                          showPrettyError(context, 'Lỗi', error);
                        }
                      } catch (e) {
                        // Đóng loading nếu có lỗi
                        if (Navigator.canPop(context)) {
                          Navigator.pop(context);
                        }
                        showPrettyError(context, 'Lỗi', e.toString());
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepOrange,
                    ),
                    child: const Text('Đã thanh toán'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBankTransferDialog(Map<String, dynamic> result) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thông tin chuyển khoản'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ngân hàng: ${result['bankName'] ?? ''}'),
            Text('Số tài khoản: ${result['bankAccount'] ?? ''}'),
            Text('Chủ tài khoản: ${result['bankOwner'] ?? ''}'),
            Text('Nội dung: ${result['transferContent'] ?? ''}'),
            const SizedBox(height: 16),
            Text(
              'Số tiền: ${_amountController.text} VNĐ',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.deepOrange,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn nhận được: ${formatXu(calculatedCoin)} xu',
              style: const TextStyle(
                fontSize: 15,
                color: Colors.amber,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                print('DEBUG: Số coin gửi lên API (Bank): $calculatedCoin');
                if (calculatedCoin < 1) {
                  showPrettyError(context, 'Số tiền nạp tối thiểu là 1 VNĐ (tương đương 1 xu)', '');
                  return;
                }
                // Hiển thị loading
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (context) => const Center(
                    child: CircularProgressIndicator(),
                  ),
                );

                // Gọi API topup
                final error = await ApiService.topUp(calculatedCoin);
                
                // Đóng loading
                Navigator.pop(context);
                
                if (error == null) {
                  // Đóng dialog chuyển khoản
                  Navigator.pop(context);
                  // Cập nhật số dư
                  _loadWalletBalance();
                  // Hiển thị thông báo thành công
                  showPrettyError(context, 'Nạp xu thành công', '');
                } else {
                  showPrettyError(context, 'Lỗi', error);
                }
              } catch (e) {
                // Đóng loading nếu có lỗi
                if (Navigator.canPop(context)) {
                  Navigator.pop(context);
                }
                showPrettyError(context, 'Lỗi', e.toString());
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepOrange,
            ),
            child: const Text('Đã chuyển khoản'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }
} 