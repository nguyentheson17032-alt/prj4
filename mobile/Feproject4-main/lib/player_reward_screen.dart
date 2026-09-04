import 'package:flutter/material.dart';
import 'api_service.dart';

class PlayerRewardScreen extends StatefulWidget {
  final String playerId;
  const PlayerRewardScreen({Key? key, required this.playerId}) : super(key: key);

  @override
  State<PlayerRewardScreen> createState() => _PlayerRewardScreenState();
}

class _PlayerRewardScreenState extends State<PlayerRewardScreen> {
  Map<String, dynamic>? rewardStatus;
  List<dynamic> rewardHistory = [];
  bool isLoading = true;

  final List<Map<String, dynamic>> milestones = [
    {'minutes': 1000, 'reward': 20000},
    {'minutes': 1500, 'reward': 30000},
    {'minutes': 2500, 'reward': 50000},
    {'minutes': 5000, 'reward': 100000},
    {'minutes': 10000, 'reward': 1000000},
  ];

  @override
  void initState() {
    super.initState();
    fetchRewardData();
  }

  Future<void> fetchRewardData() async {
    setState(() { isLoading = true; });
    final status = await ApiService.fetchPlayerRewardStatus(widget.playerId);
    final history = await ApiService.fetchPlayerRewardHistory(widget.playerId);
    setState(() {
      rewardStatus = status;
      rewardHistory = history ?? [];
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final totalMinutes = rewardStatus?['totalMinutes'] ?? 0;
    final nextMilestone = rewardStatus?['nextMilestone'] ?? 1000;
    final percent = (totalMinutes / nextMilestone).clamp(0.0, 1.0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thưởng cho Player', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.deepOrange),
        centerTitle: true,
        elevation: 0,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: fetchRewardData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Card tiến độ
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Tiến độ thưởng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Icon(Icons.timer, color: Colors.deepOrange[400]),
                              const SizedBox(width: 8),
                              Text('Tổng phút đã thuê: ', style: TextStyle(fontSize: 16, color: Colors.black87)),
                              Text('$totalMinutes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.deepOrange)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(Icons.flag, color: Colors.amber[700]),
                              const SizedBox(width: 8),
                              Text('Mốc tiếp theo: ', style: TextStyle(fontSize: 16, color: Colors.black87)),
                              Text('$nextMilestone phút', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.amber[800])),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Stack(
                            alignment: Alignment.centerLeft,
                            children: [
                              Container(
                                height: 16,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  gradient: LinearGradient(
                                    colors: [Colors.deepOrange, Colors.amber],
                                  ),
                                ),
                                width: double.infinity,
                              ),
                              Container(
                                height: 16,
                                width: ((MediaQuery.of(context).size.width - 64) * percent).clamp(0.0, double.infinity),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  color: Colors.white.withOpacity(0.7),
                                ),
                              ),
                              Positioned.fill(
                                child: Align(
                                  alignment: Alignment.center,
                                  child: Text('${(percent * 100).toStringAsFixed(0)}%', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  // Các mốc thưởng
                  const Text('Các mốc thưởng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  const SizedBox(height: 8),
                  ...milestones.map((m) {
                    final reached = totalMinutes >= m['minutes'];
                    final received = rewardHistory.any((h) => h['milestone'] == m['minutes']);
                    return Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      color: reached ? (received ? Colors.green[50] : Colors.amber[50]) : Colors.grey[100],
                      elevation: 1,
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      child: ListTile(
                        leading: Icon(
                          received ? Icons.card_giftcard : Icons.card_giftcard_outlined,
                          color: received ? Colors.green : (reached ? Colors.amber : Colors.grey),
                          size: 32,
                        ),
                        title: Text('Mốc ${m['minutes']} phút', style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Thưởng: ${m['reward']} xu', style: TextStyle(color: Colors.deepOrange)),
                        trailing: received
                            ? Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_circle, color: Colors.green, size: 20),
                                  Text('Đã nhận', style: TextStyle(color: Colors.green, fontSize: 12)),
                                ],
                              )
                            : (reached
                                ? ElevatedButton(
                                    onPressed: () {
                                      // TODO: Thêm chức năng nhận thưởng nếu cần
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.deepOrange,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text('Nhận thưởng', style: TextStyle(color: Colors.white, fontSize: 13)),
                                  )
                                : null),
                      ),
                    );
                  }),
                  const SizedBox(height: 18),
                  // Lịch sử nhận thưởng
                  const Text('Lịch sử nhận thưởng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  const SizedBox(height: 8),
                  if (rewardHistory.isEmpty)
                    Center(
                      child: Text('Chưa có lịch sử nhận thưởng.', style: TextStyle(color: Colors.black54)),
                    )
                  else
                    ...rewardHistory.map((item) => Card(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 1,
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          child: ListTile(
                            leading: Icon(Icons.redeem, color: Colors.amber[700]),
                            title: Text('Mốc ${item['milestone']} phút', style: TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('Nhận: ${item['reward']} xu', style: TextStyle(color: Colors.deepOrange)),
                            trailing: Text(item['receivedAt'] ?? '', style: TextStyle(color: Colors.grey[700], fontSize: 13)),
                          ),
                        )),
                ],
              ),
            ),
    );
  }
} 