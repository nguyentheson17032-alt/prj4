import 'package:flutter/material.dart';
import 'api_service.dart';
import 'moment_detail_screen.dart';
import 'player_profile_screen.dart';
import 'package:intl/intl.dart';
import 'config/api_config.dart';
import 'utils/moment_helper.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({Key? key}) : super(key: key);

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  List<dynamic> moments = [];
  List<dynamic> filteredMoments = [];
  bool isLoading = true;
  String? error;

  // Filter state
  String nameFilter = '';
  DateTime? dateFilter;
  TimeOfDay? timeFilter;
  String? gameFilter;
  List<String> allGames = [];

  @override
  void initState() {
    super.initState();
    _fetchMoments();
  }

  Future<void> _fetchMoments() async {
    setState(() { isLoading = true; error = null; });
    try {
      print('🔄 ExploreScreen: Đang tải moments...');
      final fetched = await ApiService.getAllMoments();
      print('📊 ExploreScreen: Nhận được ${fetched.length} moments');
      
      // Debug: Print first moment structure
      if (fetched.isNotEmpty) {
        print('🔍 ExploreScreen: First moment structure:');
        print('   - id: ${fetched[0]['id']}');
        print('   - content: ${fetched[0]['content']}');
        print('   - imageUrls: ${fetched[0]['imageUrls']} (type: ${fetched[0]['imageUrls'].runtimeType})');
        print('   - gamePlayerUsername: ${fetched[0]['gamePlayerUsername']}');
        print('   - gameName: ${fetched[0]['gameName']}');
        print('   - createdAt: ${fetched[0]['createdAt']}');
        print('   - playerUserId: ${fetched[0]['playerUserId']}');
      }
      
      // Lấy danh sách game duy nhất từ moments
      final games = <String>{};
      for (var m in fetched) {
        if (m['gameName'] != null && m['gameName'].toString().isNotEmpty) {
          games.add(m['gameName']);
        }
      }
      
      setState(() {
        moments = fetched;
        allGames = games.toList();
        isLoading = false;
      });
      _applyFilter();
      
      // Cập nhật số khoảnh khắc chưa xem sau khi load
      await MomentHelper.loadUnviewedCount();
    } catch (e) {
      print('❌ ExploreScreen: Lỗi tải moments: $e');
      setState(() {
        error = 'Lỗi khi tải khoảnh khắc: $e';
        isLoading = false;
      });
    }
  }

  void _applyFilter() {
    setState(() {
      filteredMoments = moments.where((m) {
        final nameOk = nameFilter.isEmpty || (m['gamePlayerUsername']?.toLowerCase().contains(nameFilter.toLowerCase()) ?? false);
        final gameOk = gameFilter == null || gameFilter!.isEmpty || m['gameName'] == gameFilter;
        bool dateOk = true;
        if (dateFilter != null) {
          final createdAt = m['createdAt'];
          if (createdAt != null && createdAt.length >= 10) {
            final momentDate = DateTime.tryParse(createdAt.substring(0, 10));
            dateOk = momentDate != null && momentDate.year == dateFilter!.year && momentDate.month == dateFilter!.month && momentDate.day == dateFilter!.day;
          }
        }
        bool timeOk = true;
        if (timeFilter != null) {
          final createdAt = m['createdAt'];
          if (createdAt != null && createdAt.length >= 16) {
            final momentTime = DateTime.tryParse(createdAt);
            timeOk = momentTime != null && momentTime.hour == timeFilter!.hour && momentTime.minute == timeFilter!.minute;
          }
        }
        return nameOk && gameOk && dateOk && timeOk;
      }).toList();
    });
  }

  IconButton? _buildFilterIcon() {
    return IconButton(
      icon: const Icon(Icons.filter_alt, color: Colors.deepOrange),
      onPressed: () async {
        await showDialog(
          context: context,
          builder: (context) {
            String tempName = nameFilter;
            DateTime? tempDate = dateFilter;
            TimeOfDay? tempTime = timeFilter;
            String? tempGame = gameFilter;
            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              backgroundColor: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Bộ lọc khoảnh khắc', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.deepOrange)),
                      const SizedBox(height: 18),
                      TextField(
                        decoration: InputDecoration(
                          labelText: 'Tên player',
                          prefixIcon: const Icon(Icons.person, color: Colors.deepOrange),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                        ),
                        controller: TextEditingController(text: tempName),
                        onChanged: (v) => tempName = v,
                      ),
                      const SizedBox(height: 14),
                      DropdownButtonFormField<String>(
                        value: tempGame,
                        items: [
                          const DropdownMenuItem(value: null, child: Text('Tất cả game')),
                          ...allGames.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                        ],
                        onChanged: (v) => tempGame = v,
                        decoration: InputDecoration(
                          labelText: 'Game',
                          prefixIcon: const Icon(Icons.sports_esports, color: Colors.deepOrange),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                        ),
                      ),
                      const SizedBox(height: 14),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: tempDate ?? DateTime.now(),
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2100),
                          );
                          if (picked != null) {
                            setState(() => tempDate = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: 'Ngày',
                            prefixIcon: const Icon(Icons.calendar_today, color: Colors.deepOrange),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                          ),
                          child: Text(tempDate != null ? DateFormat('yyyy-MM-dd').format(tempDate!) : 'Chọn ngày', style: const TextStyle(fontSize: 15)),
                        ),
                      ),
                      const SizedBox(height: 14),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () async {
                          final picked = await showTimePicker(
                            context: context,
                            initialTime: tempTime ?? TimeOfDay.now(),
                          );
                          if (picked != null) {
                            setState(() => tempTime = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: 'Giờ',
                            prefixIcon: const Icon(Icons.access_time, color: Colors.deepOrange),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                          ),
                          child: Text(tempTime != null ? tempTime!.format(context) : 'Chọn giờ', style: const TextStyle(fontSize: 15)),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          TextButton.icon(
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.white,
                              backgroundColor: Colors.deepOrange,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            ),
                            icon: const Icon(Icons.clear, size: 18),
                            label: const Text('Xóa lọc', style: TextStyle(fontWeight: FontWeight.bold)),
                            onPressed: () {
                              setState(() {
                                tempName = '';
                                tempDate = null;
                                tempTime = null;
                                tempGame = null;
                              });
                            },
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.deepOrange,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                            ),
                            onPressed: () {
                              setState(() {
                                nameFilter = tempName;
                                dateFilter = tempDate;
                                timeFilter = tempTime;
                                gameFilter = tempGame;
                              });
                              _applyFilter();
                              Navigator.of(context).pop();
                            },
                            child: const Text('Áp dụng', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Khám Phá Khoảnh Khắc', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        centerTitle: true,
        elevation: 0,
        actions: [_buildFilterIcon()!],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : Column(
                  children: [
                    // Danh sách moments
                    Expanded(
                      child: filteredMoments.isEmpty
                          ? const Center(child: Text('Không có khoảnh khắc nào phù hợp.'))
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 0),
                              itemCount: filteredMoments.length,
                              itemBuilder: (context, index) {
                                final moment = filteredMoments[index];
                                final imageUrl = (moment['imageUrls'] as List).isNotEmpty
                                    ? '${ApiConfig.baseUrl}/api/moments/moment-images/' + (moment['imageUrls'][0] as String).split('/').last
                                    : null;
                                final userId = moment['playerUserId']?.toString();
                                
                                // Debug: Print moment data for first few items
                                if (index < 3) {
                                  print('🖼️ ExploreScreen: Moment $index - imageUrls: ${moment['imageUrls']}');
                                  print('🖼️ ExploreScreen: Moment $index - imageUrl: $imageUrl');
                                }
                                
                                return GestureDetector(
                                  onTap: () async {
                                    // Mark moment as viewed khi user tap vào
                                    final momentId = moment['id'];
                                    if (momentId != null) {
                                      print('👁️ ExploreScreen: Marking moment $momentId as viewed');
                                      await MomentHelper.markMomentAsViewed(momentId);
                                    }
                                    
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => MomentDetailScreen(moment: moment),
                                      ),
                                    );
                                  },
                                  child: Card(
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                    elevation: 3,
                                    color: Colors.white,
                                    margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 0),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          ClipRRect(
                                            borderRadius: BorderRadius.circular(14),
                                            child: imageUrl != null
                                                ? Image.network(
                                                    imageUrl,
                                                    width: double.infinity,
                                                    height: 180,
                                                    fit: BoxFit.cover,
                                                    errorBuilder: (context, error, stack) => Container(
                                                      height: 180,
                                                      color: Colors.grey[200],
                                                      child: const Center(child: Icon(Icons.broken_image, size: 60, color: Colors.grey)),
                                                    ),
                                                  )
                                                : Container(
                                                    height: 180,
                                                    color: Colors.grey[200],
                                                    child: const Center(child: Icon(Icons.image, size: 60, color: Colors.grey)),
                                                  ),
                                          ),
                                          const SizedBox(height: 10),
                                          Row(
                                            children: [
                                              GestureDetector(
                                                onTap: () {
                                                  if (userId != null) {
                                                    Navigator.push(
                                                      context,
                                                      MaterialPageRoute(
                                                        builder: (_) => PlayerProfileScreen(playerUserId: userId),
                                                      ),
                                                    );
                                                  }
                                                },
                                                child: CircleAvatar(
                                                  radius: 18,
                                                  backgroundColor: Colors.deepOrange.withOpacity(0.1),
                                                  backgroundImage: userId != null
                                                      ? NetworkImage('${ApiConfig.baseUrl}/api/auth/avatar/$userId')
                                                      : null,
                                                  onBackgroundImageError: (_, __) {},
                                                  child: userId == null
                                                      ? const Icon(Icons.person, color: Colors.deepOrange)
                                                      : null,
                                                ),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      moment['gamePlayerUsername'] ?? '',
                                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.deepOrange),
                                                    ),
                                                    if ((moment['gameName'] ?? '').toString().isNotEmpty)
                                                      Text(
                                                        'Game: ${moment['gameName']}',
                                                        style: const TextStyle(fontSize: 13, color: Colors.grey),
                                                      ),
                                                  ],
                                                ),
                                              ),
                                              Text(
                                                moment['createdAt'] ?? '',
                                                style: const TextStyle(fontSize: 13, color: Colors.grey),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),
                                          Text(
                                            moment['content'] ?? '',
                                            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Colors.black87, height: 1.4),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
    );
  }
} 