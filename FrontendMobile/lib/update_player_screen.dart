import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'api_service.dart';

class UpdatePlayerScreen extends StatefulWidget {
  const UpdatePlayerScreen({super.key});

  @override
  State<UpdatePlayerScreen> createState() => _UpdatePlayerScreenState();
}

class _UpdatePlayerScreenState extends State<UpdatePlayerScreen> {
  final _formKey = GlobalKey<FormState>();
  final usernameController = TextEditingController();
  final rankController = TextEditingController();
  final roleController = TextEditingController();
  final serverController = TextEditingController();
  final priceController = TextEditingController();
  final descriptionController = TextEditingController();
  bool isLoading = true;
  bool isSaving = false;
  String? errorMessage;
  int? playerId;
  int? userId;
  int? selectedGameId;
  String? selectedGameName;
  List<dynamic> games = [];
  List<String> availableRoles = [];
  List<String> availableRanks = [];
  bool hasRoles = false;
  final List<String> serverList = [
    'Asia', 'VN', 'KR', 'NA', 'EU',
  ];

  @override
  void initState() {
    super.initState();
    _loadPlayerInfo();
  }

  Future<void> _loadPlayerInfo() async {
    final user = await ApiService.getCurrentUser();
    if (user == null || user['id'] == null) {
      setState(() {
        errorMessage = 'Không tìm thấy thông tin người dùng.';
        isLoading = false;
      });
      return;
    }
    final gameList = await ApiService.fetchGames();
    final userPlayers = await ApiService.fetchPlayersByUser(user['id']);
    if (userPlayers.isNotEmpty && userPlayers[0] != null) {
      final player = userPlayers[0];
      final game = gameList.firstWhere((g) => g['id'] == player['game']?['id'], orElse: () => null);
      final roles = (game != null ? (game['availableRoles'] as List?) : null)?.map((e) => e.toString()).toList() ?? [];
      final ranks = (game != null ? (game['availableRanks'] as List?) : null)?.map((e) => e.toString()).toList() ?? [];
      setState(() {
        playerId = player['id'];
        userId = user['id'];
        selectedGameId = player['game']?['id'];
        selectedGameName = player['game']?['name'];
        games = gameList;
        hasRoles = game != null && game['hasRoles'] == true;
        availableRoles = roles;
        availableRanks = ranks;
        usernameController.text = player['username'] ?? '';
        // Normalize rank to uppercase and match availableRanks
        String backendRank = player['rank'] ?? '';
        String normalizedRank = backendRank.toUpperCase();
        rankController.text = availableRanks.contains(normalizedRank) ? normalizedRank : '';
        // Normalize role to uppercase and match availableRoles
        String backendRole = player['role'] ?? '';
        String normalizedRole = backendRole.toUpperCase();
        roleController.text = availableRoles.contains(normalizedRole) ? normalizedRole : '';
        // Normalize server to uppercase and match serverList
        String backendServer = player['server'] ?? '';
        String normalizedServer = backendServer.toUpperCase();
        serverController.text = serverList.contains(normalizedServer) ? normalizedServer : '';
        priceController.text = (player['pricePerHour']?.toString() ?? '').replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
        descriptionController.text = player['description'] ?? '';
        isLoading = false;
      });
    } else {
      setState(() {
        errorMessage = 'Bạn chưa đăng ký làm player.';
        isLoading = false;
      });
    }
  }

  Future<void> handleUpdate() async {
    if (!_formKey.currentState!.validate()) {
      _showErrorSnackBar('Vui lòng kiểm tra lại thông tin');
      return;
    }
    setState(() { isSaving = true; errorMessage = null; });
    final data = {
      "userId": userId,
      "gameId": selectedGameId,
      "username": usernameController.text.trim(),
      "rank": rankController.text.trim(),
      "role": hasRoles ? roleController.text.trim() : null,
      "server": serverController.text.trim(),
      "pricePerHour": double.tryParse(priceController.text.replaceAll('.', '')) ?? 0,
      "description": descriptionController.text.trim(),
    };
    final error = await ApiService.updatePlayer(playerId!, data);
    setState(() { isSaving = false; });
    if (error == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.check_circle_outline, color: Colors.white),
              SizedBox(width: 12),
              Text('Cập nhật player thành công!'),
            ],
          ),
          backgroundColor: Colors.green[700],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          margin: const EdgeInsets.all(8),
        ),
      );
      Navigator.pop(context);
    } else {
      _showErrorSnackBar(error);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        margin: const EdgeInsets.all(8),
        duration: const Duration(seconds: 5),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : errorMessage != null
              ? Center(child: Text(errorMessage!, style: const TextStyle(color: Colors.red)))
              : Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.deepOrange.withOpacity(0.1),
                        Colors.white,
                      ],
                    ),
                  ),
                  child: SafeArea(
                    child: SingleChildScrollView(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  IconButton(
                                    onPressed: () => Navigator.pop(context),
                                    icon: const Icon(Icons.arrow_back_ios_new),
                                    color: Colors.deepOrange,
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Cập nhật Player',
                                    style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.deepOrange,
                                    ),
                                  ),
                                ],
                              ),
                              if (errorMessage != null) ...[
                                const SizedBox(height: 16),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.red[50],
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red[200]!),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(Icons.error_outline, color: Colors.red[700]),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          errorMessage!,
                                          style: TextStyle(color: Colors.red[700]),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 32),
                              Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.deepOrange.withOpacity(0.1),
                                      blurRadius: 20,
                                      offset: const Offset(0, 10),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    // Game dropdown (dynamic)
                                    DropdownButtonFormField<int>(
                                      value: selectedGameId,
                                      decoration: InputDecoration(
                                        labelText: 'Chọn game',
                                        prefixIcon: const Icon(Icons.sports_esports),
                                        filled: true,
                                        fillColor: Colors.grey[50],
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide.none,
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.grey[200]!),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Colors.deepOrange),
                                        ),
                                      ),
                                      items: games.map<DropdownMenuItem<int>>((game) {
                                        return DropdownMenuItem<int>(
                                          value: game['id'],
                                          child: Text(game['name'] ?? ''),
                                        );
                                      }).toList(),
                                      onChanged: (value) {
                                        setState(() {
                                          selectedGameId = value;
                                          final game = games.firstWhere((g) => g['id'] == value);
                                          selectedGameName = game['name'];
                                          hasRoles = game['hasRoles'] == true;
                                          availableRoles = (game['availableRoles'] as List?)?.map((e) => e.toString()).toList() ?? [];
                                          availableRanks = (game['availableRanks'] as List?)?.map((e) => e.toString()).toList() ?? [];
                                          roleController.clear();
                                          rankController.clear();
                                        });
                                      },
                                      validator: (v) => v == null ? 'Vui lòng chọn game' : null,
                                    ),
                                    const SizedBox(height: 16),
                                    // Username field
                                    TextFormField(
                                      controller: usernameController,
                                      maxLength: 50,
                                      decoration: InputDecoration(
                                        labelText: 'Tên tài khoản',
                                        hintText: 'Nhập tên tài khoản của bạn',
                                        prefixIcon: const Icon(Icons.person_outline),
                                        filled: true,
                                        fillColor: Colors.grey[50],
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide.none,
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.grey[200]!),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Colors.deepOrange),
                                        ),
                                      ),
                                      validator: (v) {
                                        if (v!.isEmpty) return 'Vui lòng nhập tên tài khoản';
                                        if (v.length < 3) return 'Tên tài khoản phải có ít nhất 3 ký tự';
                                        return null;
                                      },
                                    ),
                                    const SizedBox(height: 16),
                                    // Rank dropdown (dynamic)
                                    DropdownButtonFormField<String>(
                                      value: availableRanks.contains(rankController.text) ? rankController.text : null,
                                      decoration: InputDecoration(
                                        labelText: 'Rank',
                                        hintText: 'Chọn rank của bạn',
                                        prefixIcon: const Icon(Icons.emoji_events),
                                        filled: true,
                                        fillColor: Colors.grey[50],
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide.none,
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.grey[200]!),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Colors.deepOrange),
                                        ),
                                      ),
                                      items: availableRanks.map((rank) => DropdownMenuItem(
                                        value: rank,
                                        child: Text(rank),
                                      )).toList(),
                                      onChanged: (value) {
                                        if (value != null) {
                                          rankController.text = value;
                                        }
                                      },
                                      validator: (v) => v == null ? 'Vui lòng chọn rank' : null,
                                    ),
                                    const SizedBox(height: 16),
                                    // Role dropdown (dynamic)
                                    if (hasRoles)
                                      DropdownButtonFormField<String>(
                                        value: availableRoles.contains(roleController.text) ? roleController.text : null,
                                        decoration: InputDecoration(
                                          labelText: 'Role',
                                          hintText: 'Chọn role bạn chơi',
                                          prefixIcon: const Icon(Icons.person),
                                          filled: true,
                                          fillColor: Colors.grey[50],
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(12),
                                            borderSide: BorderSide.none,
                                          ),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(12),
                                            borderSide: BorderSide(color: Colors.grey[200]!),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(12),
                                            borderSide: const BorderSide(color: Colors.deepOrange),
                                          ),
                                        ),
                                        items: availableRoles.map((role) => DropdownMenuItem(
                                          value: role,
                                          child: Text(role),
                                        )).toList(),
                                        onChanged: (value) {
                                          if (value != null) {
                                            roleController.text = value;
                                          }
                                        },
                                        validator: (v) => v == null ? 'Vui lòng chọn role' : null,
                                      ),
                                    if (hasRoles) const SizedBox(height: 16),
                                    // Server dropdown
                                    DropdownButtonFormField<String>(
                                      value: serverList.contains(serverController.text) ? serverController.text : null,
                                      decoration: InputDecoration(
                                        labelText: 'Server',
                                        hintText: 'Chọn server bạn chơi',
                                        prefixIcon: const Icon(Icons.language),
                                        filled: true,
                                        fillColor: Colors.grey[50],
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide.none,
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.grey[200]!),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Colors.deepOrange),
                                        ),
                                      ),
                                      items: serverList.map((server) => DropdownMenuItem(
                                        value: server,
                                        child: Text(server),
                                      )).toList(),
                                      onChanged: (value) {
                                        if (value != null) {
                                          serverController.text = value;
                                        }
                                      },
                                      validator: (v) => v == null ? 'Vui lòng chọn server' : null,
                                    ),
                                    const SizedBox(height: 16),
                                    // Price field
                                    TextFormField(
                                      controller: priceController,
                                      keyboardType: TextInputType.number,
                                      inputFormatters: [
                                        FilteringTextInputFormatter.digitsOnly,
                                        ThousandsSeparatorInputFormatter(),
                                      ],
                                      decoration: InputDecoration(
                                        labelText: 'Giá/giờ (xu)',
                                        hintText: 'Nhập số xu bạn muốn nhận',
                                        prefixIcon: const Icon(Icons.monetization_on, color: Colors.amber),
                                        filled: true,
                                        fillColor: Colors.grey[50],
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide.none,
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.grey[200]!),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Colors.deepOrange),
                                        ),
                                      ),
                                      validator: (v) {
                                        if (v!.isEmpty) return 'Vui lòng nhập giá';
                                        final price = int.tryParse(v.replaceAll('.', ''));
                                        if (price == null) return 'Giá không hợp lệ';
                                        if (price < 1000) return 'Giá tối thiểu là 1.000 xu/giờ';
                                        if (price > 1000000) return 'Giá tối đa là 1.000.000 xu/giờ';
                                        return null;
                                      },
                                    ),
                                    const SizedBox(height: 16),
                                    // Description field
                                    TextFormField(
                                      controller: descriptionController,
                                      maxLines: 3,
                                      maxLength: 500,
                                      decoration: InputDecoration(
                                        labelText: 'Mô tả',
                                        hintText: 'Mô tả về kỹ năng và kinh nghiệm của bạn',
                                        prefixIcon: const Icon(Icons.description),
                                        filled: true,
                                        fillColor: Colors.grey[50],
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide.none,
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: BorderSide(color: Colors.grey[200]!),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(12),
                                          borderSide: const BorderSide(color: Colors.deepOrange),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 32),
                              SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: ElevatedButton(
                                  onPressed: isSaving ? null : handleUpdate,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.deepOrange,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    elevation: 0,
                                  ),
                                  child: isSaving
                                      ? const SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(
                                            color: Colors.white,
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Text(
                                          'Cập nhật',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
    );
  }
}

class ThousandsSeparatorInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    if (newValue.text.isEmpty) {
      return newValue;
    }
    final value = newValue.text.replaceAll('.', '');
    final number = int.tryParse(value);
    if (number == null) {
      return oldValue;
    }
    final formatted = number.toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (match) => '.',
    );
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
} 