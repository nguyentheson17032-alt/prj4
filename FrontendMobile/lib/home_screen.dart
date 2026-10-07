import 'package:flutter/material.dart';
import 'hire_player_screen.dart';
import 'player_detail_screen.dart';
import 'api_service.dart';
import 'deposit_screen.dart';
import 'dart:async';
import 'hired_players_screen.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'config/api_config.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> players = [];
  bool isLoading = true;
  bool isSearching = false;
  TextEditingController searchController = TextEditingController();
  List<dynamic> searchResults = [];
  Timer? _debounce;

  // Biến trạng thái cho bộ lọc
  String? filterGame;
  String? filterRank;
  String? filterRole;
  String? filterServer;
  String? filterStatus;
  double? filterMinPrice;
  double? filterMaxPrice;
  List<dynamic> filterResults = [];
  bool isFiltering = false;

  // Thêm các giá trị mẫu cho dropdown
  final List<String> gameList = [
    'PUBG Mobile',
    'PUBG PC',
    'Liên Quân Mobile',
  ];
  final List<String> rankList = [
    'Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Kim Cương', 'Cao Thủ', 'Thách Đấu',
  ];
  final List<String> roleList = [
    'Tank', 'Support', 'AD', 'Mid', 'Top', 'Jungle',
  ];
  final List<String> serverList = [
    'Asia', 'VN', 'KR', 'NA', 'EU',
  ];

  List<dynamic> games = [];
  bool isLoadingGames = true;
  List<String> availableRanks = [];
  final ScrollController _vipScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    loadPlayers();
    loadGames();
  }

  Future<void> loadPlayers() async {
    if (!mounted) return;
    
    try {
      setState(() {
        isLoading = true;
      });
      
      final data = await ApiService.fetchAllPlayers();
      
      if (!mounted) return;
      
      setState(() {
        players = data;
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      
      setState(() {
        isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading players: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> loadGames() async {
    if (!mounted) return;
    
    try {
      setState(() {
        isLoadingGames = true;
      });
      
      final data = await ApiService.fetchGames();
      
      if (!mounted) return;
      
      setState(() {
        games = data;
        isLoadingGames = false;
      });
    } catch (e) {
      if (!mounted) return;
      
      setState(() {
        isLoadingGames = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading games: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (query.isEmpty) {
        setState(() {
          searchResults = [];
        });
        return;
      }
      setState(() {
        searchResults = players.where((player) {
          final username = (player['username'] ?? '').toLowerCase();
          final description = (player['description'] ?? '').toLowerCase();
          return username.contains(query.toLowerCase()) || description.contains(query.toLowerCase());
        }).toList();
      });
    });
  }

  void stopSearching() {
    setState(() {
      isSearching = false;
      searchController.clear();
      searchResults = [];
    });
  }

  void applyFilter() {
    if (!mounted) return;
    
    // Create a copy of the players list to avoid modifying the original
    final filteredPlayers = List<dynamic>.from(players);
    
    // Apply filters in a single pass
    final results = filteredPlayers.where((player) {
      if (filterGame != null && filterGame!.isNotEmpty && 
          (player['game']?['name'] ?? '').toLowerCase() != filterGame!.toLowerCase()) {
        return false;
      }
      if (filterRank != null && filterRank!.isNotEmpty && 
          (player['rank'] ?? '').toLowerCase() != filterRank!.toLowerCase()) {
        return false;
      }
      if (filterRole != null && filterRole!.isNotEmpty && 
          (player['role'] ?? '').toLowerCase() != filterRole!.toLowerCase()) {
        return false;
      }
      if (filterServer != null && filterServer!.isNotEmpty && 
          (player['server'] ?? '').toLowerCase() != filterServer!.toLowerCase()) {
        return false;
      }
      if (filterStatus != null && filterStatus!.isNotEmpty && 
          (player['status'] ?? '').toLowerCase() != filterStatus!.toLowerCase()) {
        return false;
      }
      if (filterMinPrice != null && (player['pricePerHour'] ?? 0) < filterMinPrice!) {
        return false;
      }
      if (filterMaxPrice != null && (player['pricePerHour'] ?? 0) > filterMaxPrice!) {
        return false;
      }
      return true;
    }).toList();

    setState(() {
      filterResults = results;
      isFiltering = true;
    });
  }

  void clearFilter() {
    setState(() {
      filterGame = null;
      filterRank = null;
      filterRole = null;
      filterServer = null;
      filterStatus = null;
      filterMinPrice = null;
      filterMaxPrice = null;
      filterResults = [];
      isFiltering = false;
    });
  }

  void showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        double minPrice = 0;
        double maxPrice = 100000;
        double rangeStart = filterMinPrice ?? minPrice;
        double rangeEnd = filterMaxPrice ?? maxPrice;
        int? selectedGameId = games.firstWhere((g) => g['name'] == filterGame, orElse: () => null)?['id'];
        List<String> modalAvailableRanks = availableRanks;
        return DraggableScrollableSheet(
          initialChildSize: 0.65,
          minChildSize: 0.4,
          maxChildSize: 0.95,
          builder: (context, scrollController) {
            return StatefulBuilder(
              builder: (context, setModalState) {
                return Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 16,
                        offset: Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    controller: scrollController,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 40,
                            height: 5,
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          const Text('Bộ lọc chi tiết', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                          const SizedBox(height: 20),
                          // Game
                          DropdownButtonFormField<int>(
                            value: selectedGameId,
                            decoration: InputDecoration(
                              labelText: 'Tên game',
                              prefixIcon: const Icon(Icons.sports_esports, color: Colors.deepOrange),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                              filled: true,
                              fillColor: Colors.orange[50],
                            ),
                            items: games.map<DropdownMenuItem<int>>((game) {
                              return DropdownMenuItem(
                                value: game['id'],
                                child: Text(game['name'] ?? ''),
                              );
                            }).toList(),
                            onChanged: (int? value) {
                              final game = games.firstWhere((g) => g['id'] == value, orElse: () => null);
                              setModalState(() {
                                filterGame = game != null ? game['name'] : null;
                                filterRank = null;
                                modalAvailableRanks = (game != null && game['availableRanks'] != null)
                                  ? (game['availableRanks'] as List).map((e) => e.toString()).toList()
                                  : [];
                              });
                              setState(() {
                                availableRanks = modalAvailableRanks;
                              });
                            },
                            isExpanded: true,
                          ),
                          const SizedBox(height: 14),
                          // Rank
                          DropdownButtonFormField<String>(
                            value: filterRank,
                            decoration: InputDecoration(
                              labelText: 'Rank',
                              prefixIcon: const Icon(Icons.emoji_events, color: Colors.amber),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                              filled: true,
                              fillColor: Colors.orange[50],
                            ),
                            items: modalAvailableRanks.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                            onChanged: (v) => setModalState(() => filterRank = v),
                            isExpanded: true,
                          ),
                          const SizedBox(height: 14),
                          // Role
                          DropdownButtonFormField<String>(
                            value: filterRole,
                            decoration: InputDecoration(
                              labelText: 'Role',
                              prefixIcon: const Icon(Icons.group, color: Colors.blue),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                              filled: true,
                              fillColor: Colors.orange[50],
                            ),
                            items: roleList.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                            onChanged: (v) => setState(() => filterRole = v),
                            isExpanded: true,
                          ),
                          const SizedBox(height: 14),
                          // Server
                          DropdownButtonFormField<String>(
                            value: filterServer,
                            decoration: InputDecoration(
                              labelText: 'Server',
                              prefixIcon: const Icon(Icons.cloud, color: Colors.green),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                              filled: true,
                              fillColor: Colors.orange[50],
                            ),
                            items: serverList.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                            onChanged: (v) => setState(() => filterServer = v),
                            isExpanded: true,
                          ),
                          const SizedBox(height: 14),
                          // Trạng thái
                          DropdownButtonFormField<String>(
                            value: filterStatus,
                            decoration: InputDecoration(
                              labelText: 'Trạng thái',
                              prefixIcon: const Icon(Icons.circle, color: Colors.teal),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                              filled: true,
                              fillColor: Colors.orange[50],
                            ),
                            items: const [
                              DropdownMenuItem(value: null, child: Text('Tất cả')),
                              DropdownMenuItem(value: 'AVAILABLE', child: Text('Online')),
                              DropdownMenuItem(value: 'UNAVAILABLE', child: Text('Offline')),
                            ],
                            onChanged: (v) => setState(() => filterStatus = v),
                            isExpanded: true,
                          ),
                          const SizedBox(height: 18),
                          // Giá
                          Row(
                            children: [
                              const Icon(Icons.attach_money, color: Colors.deepOrange),
                              const SizedBox(width: 8),
                              Expanded(
                                child: RangeSlider(
                                  values: RangeValues(rangeStart, rangeEnd),
                                  min: minPrice,
                                  max: maxPrice,
                                  divisions: 20,
                                  labels: RangeLabels(
                                    '${rangeStart.toInt()}xu',
                                    '${rangeEnd.toInt()}xu',
                                  ),
                                  onChanged: (values) {
                                    setModalState(() {
                                      rangeStart = values.start;
                                      rangeEnd = values.end;
                                    });
                                  },
                                ),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${rangeStart.toInt()} xu', style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text('${rangeEnd.toInt()} xu', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 24),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    clearFilter();
                                    Navigator.pop(context);
                                  },
                                  icon: const Icon(Icons.clear, color: Colors.black),
                                  label: const Text('Xóa lọc', style: TextStyle(color: Colors.black)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.grey[200],
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      filterMinPrice = rangeStart;
                                      filterMaxPrice = rangeEnd;
                                    });
                                    applyFilter();
                                    Navigator.pop(context);
                                  },
                                  icon: const Icon(Icons.check_circle, color: Colors.white),
                                  label: const Text('Áp dụng', style: TextStyle(color: Colors.white)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.deepOrange,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                    child: isSearching
                        ? Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: searchController,
                            autofocus: true,
                            decoration: InputDecoration(
                              hintText: 'Tìm kiếm player...',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: stopSearching,
                              ),
                            ),
                            onChanged: onSearchChanged,
                          ),
                        ),
                      ],
                    )
                        : Row(
                      children: [
                        Icon(Icons.sports_esports, color: Colors.deepOrange, size: 36),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'PLAYERDUO',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, letterSpacing: 1),
                            ),
                            Text(
                              'GAME COMMUNITY',
                              style: TextStyle(fontSize: 12, color: Colors.black54, letterSpacing: 1),
                            ),
                          ],
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.search, color: Colors.black54),
                          onPressed: () {
                            setState(() {
                              isSearching = true;
                            });
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.filter_alt_outlined, color: Colors.black54),
                          onPressed: showFilterSheet,
                        ),
                        IconButton(
                          icon: const Icon(Icons.account_balance_wallet, color: Colors.deepOrange),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const DepositScreen()),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  // Kết nối
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                    child: Row(
                      children: const [
                        Icon(Icons.movie_filter, color: Colors.deepOrange, size: 22),
                        SizedBox(width: 8),
                        Text('Kết nối', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.deepOrange)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 100,
                    child: isLoadingGames
                        ? Center(child: CircularProgressIndicator())
                        : ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: games.map<Widget>((game) {
                        return _GameIcon(
                          title: game['name'] ?? '',
                          imageUrl: game['imageUrl'] ?? '',
                        );
                      }).toList(),
                    ),
                  ),
                  // Tất cả player
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                    child: Row(
                      children: [
                        const Icon(Icons.movie_filter, color: Colors.deepOrange, size: 22),
                        const SizedBox(width: 8),
                        Text(
                          isSearching && searchController.text.isNotEmpty ? 'Kết quả tìm kiếm' : 'Tất cả player',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.deepOrange),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Stack(
                    children: [
                      SizedBox(
                        height: 360,
                        child: () {
                          if (isLoading) {
                            return const Center(child: CircularProgressIndicator());
                          } else if (isSearching && searchController.text.isNotEmpty) {
                            if (searchResults.isEmpty) {
                              return const Center(child: Text('Không tìm thấy player nào'));
                            } else {
                              return ListView(
                                controller: _vipScrollController,
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                children: searchResults.map<Widget>((player) {
                                  return GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => PlayerDetailScreen(player: player),
                                        ),
                                      );
                                    },
                                    child: _VipPlayerCard(
                                      name: player['username'] ?? '',
                                      gameName: player['game']?['name'] ?? '',
                                      price: _formatXuPerHour(player['pricePerHour']),
                                      description: player['description'] ?? '',
                                      tags: 'Rank: ${player['rank'] ?? ''}\nRole: ${player['role'] ?? ''}\nServer: ${player['server'] ?? ''}',
                                      isOnline: player['status'] == 'AVAILABLE',
                                      isGray: false,
                                      userId: player['user']?['id']?.toString() ?? '',
                                    ),
                                  );
                                }).toList(),
                              );
                            }
                          } else if (isFiltering) {
                            if (filterResults.isEmpty) {
                              return const Center(child: Text('Không tìm thấy player nào'));
                            } else {
                              return ListView(
                                controller: _vipScrollController,
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                children: filterResults.map<Widget>((player) {
                                  return GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => PlayerDetailScreen(player: player),
                                        ),
                                      );
                                    },
                                    child: _VipPlayerCard(
                                      name: player['username'] ?? '',
                                      gameName: player['game']?['name'] ?? '',
                                      price: _formatXuPerHour(player['pricePerHour']),
                                      description: player['description'] ?? '',
                                      tags: 'Rank: ${player['rank'] ?? ''}\nRole: ${player['role'] ?? ''}\nServer: ${player['server'] ?? ''}',
                                      isOnline: player['status'] == 'AVAILABLE',
                                      isGray: false,
                                      userId: player['user']?['id']?.toString() ?? '',
                                    ),
                                  );
                                }).toList(),
                              );
                            }
                          } else {
                            if (players.isEmpty) {
                              return const Center(child: Text('Chưa có player nào'));
                            } else {
                              return ListView(
                                controller: _vipScrollController,
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                children: players.map<Widget>((player) {
                                  return GestureDetector(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => PlayerDetailScreen(player: player),
                                        ),
                                      );
                                    },
                                    child: _VipPlayerCard(
                                      name: player['username'] ?? '',
                                      gameName: player['game']?['name'] ?? '',
                                      price: _formatXuPerHour(player['pricePerHour']),
                                      description: player['description'] ?? '',
                                      tags: 'Rank: ${player['rank'] ?? ''}\nRole: ${player['role'] ?? ''}\nServer: ${player['server'] ?? ''}',
                                      isOnline: player['status'] == 'AVAILABLE',
                                      isGray: false,
                                      userId: player['user']?['id']?.toString() ?? '',
                                    ),
                                  );
                                }).toList(),
                              );
                            }
                          }
                        }(),
                      ),
                      Positioned(
                        right: 0,
                        top: 0,
                        bottom: 0,
                        child: Container(
                          width: 36,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                              colors: [
                                Colors.white.withOpacity(0.0),
                                Colors.white.withOpacity(0.8),
                              ],
                            ),
                          ),
                          child: IconButton(
                            icon: Icon(Icons.arrow_forward_ios, color: Colors.deepOrange, size: 28),
                            onPressed: () {
                              _vipScrollController.animateTo(
                                _vipScrollController.offset + 220 + 12, // width card + margin
                                duration: Duration(milliseconds: 400),
                                curve: Curves.ease,
                              );
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
// Thêm section cho từng game
                  for (final game in games) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                      child: Row(
                        children: [
                          const Icon(Icons.sports_esports, color: Colors.deepOrange, size: 22),
                          const SizedBox(width: 8),
                          Text(
                            'Player game ${game['name']}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.deepOrange),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 360,
                      child: Builder(
                        builder: (context) {
                          final gamePlayers = players.where((player) => player['game']?['id'] == game['id']).toList();
                          if (gamePlayers.isEmpty) {
                            return const Center(child: Text('Chưa có player nào cho game này'));
                          }
                          return ListView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            children: gamePlayers.map<Widget>((player) {
                              return GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => PlayerDetailScreen(player: player),
                                    ),
                                  );
                                },
                                child: _VipPlayerCard(
                                  name: player['username'] ?? '',
                                  gameName: player['game']?['name'] ?? '',
                                  price: _formatXuPerHour(player['pricePerHour']),
                                  description: player['description'] ?? '',
                                  tags: 'Rank: ${player['rank'] ?? ''}\nRole: ${player['role'] ?? ''}\nServer: ${player['server'] ?? ''}',
                                  isOnline: player['status'] == 'AVAILABLE',
                                  isGray: false,
                                  userId: player['user']?['id']?.toString() ?? '',
                                ),
                              );
                            }).toList(),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ],
              ),
            ),
            if (isLoading)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: const Center(
                  child: CircularProgressIndicator(
                    color: Colors.deepOrange,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _debounce?.cancel();
    searchController.dispose();
    super.dispose();
  }

  String _formatXuPerHour(dynamic price) {
    if (price == null) return '';
    final intPrice = price is double ? price.toInt() : int.tryParse(price.toString()) ?? 0;
    final formatted = intPrice.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
    return '$formatted xu/h';
  }
}

class _GameIcon extends StatelessWidget {
  final String title;
  final String imageUrl;
  const _GameIcon({required this.title, required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.deepOrange.withOpacity(0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: CircleAvatar(
              backgroundColor: Colors.white,
              radius: 28,
              child: ClipOval(
                child: imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Icon(Icons.sports_esports, size: 32, color: Colors.deepOrange),
                    )
                  : Icon(Icons.sports_esports, size: 32, color: Colors.deepOrange),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _VipPlayerCard extends StatelessWidget {
  final String name;
  final String gameName;
  final String price;
  final String description;
  final String tags;
  final bool isOnline;
  final bool isGray;
  final String userId;
  const _VipPlayerCard({
    required this.name,
    required this.gameName,
    required this.price,
    required this.description,
    required this.tags,
    required this.isOnline,
    required this.isGray,
    required this.userId,
  });

  Future<Uint8List?> fetchAvatarBytes(String userId) async {
    try {
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/auth/avatar/$userId',
        options: Options(responseType: ResponseType.bytes),
      );
      if (response.statusCode == 200) {
        return Uint8List.fromList(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Uint8List?> fetchCoverImageBytes(String userId) async {
    try {
      final response = await Dio().get(
        '${ApiConfig.baseUrl}/api/users/$userId/cover-image-bytes',
        options: Options(responseType: ResponseType.bytes),
      );
      if (response.statusCode == 200) {
        return Uint8List.fromList(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      height: 300,
      margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Cover image (ảnh bìa)
          FutureBuilder<Uint8List?>(
            future: fetchCoverImageBytes(userId),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return Container(
                  height: 100,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isGray ? Colors.grey[300] : Colors.orange[100],
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(24),
                      topRight: Radius.circular(24),
                    ),
                  ),
                  child: const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Colors.deepOrange)),
                );
              }
              if (snapshot.hasData && snapshot.data != null) {
                return ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                  child: Image.memory(
                    snapshot.data!,
                    height: 100,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                );
              }
              return Container(
                height: 100,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isGray ? Colors.grey[300] : Colors.orange[100],
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: const Center(child: Icon(Icons.image, size: 48, color: Colors.grey)),
              );
            },
          ),
          // Avatar (giữ nguyên)
          Positioned(
            left: 0,
            right: 0,
            top: 70,
            child: Center(
              child: FutureBuilder<Uint8List?>(
                future: fetchAvatarBytes(userId),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const CircleAvatar(
                      radius: 36,
                      backgroundColor: Colors.white,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.deepOrange),
                    );
                  }
                  ImageProvider<Object> avatarProvider;
                  if (snapshot.hasData && snapshot.data != null && snapshot.data!.isNotEmpty) {
                    avatarProvider = MemoryImage(snapshot.data!);
                  } else {
                    avatarProvider = const AssetImage('assets/default_avatar.png') as ImageProvider<Object>;
                  }
                  return CircleAvatar(
                    radius: 36,
                    backgroundColor: Colors.deepOrange.withOpacity(0.08),
                    backgroundImage: avatarProvider,
                  );
                },
              ),
            ),
          ),
          // Nội dung card (giữ nguyên)
          Positioned.fill(
            top: 130,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.deepOrange),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isOnline)
                            const Padding(
                              padding: EdgeInsets.only(left: 6),
                              child: Icon(Icons.circle, color: Colors.green, size: 16),
                            ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                      child: Text(
                        gameName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                      child: Text(
                        description,
                        style: const TextStyle(fontSize: 15),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (tags.contains('Rank:'))
                            Text(tags.split('\n').firstWhere((e) => e.contains('Rank:'), orElse: () => ''), style: const TextStyle(fontSize: 13, color: Colors.grey)),
                          if (tags.contains('Role:'))
                            Text(tags.split('\n').firstWhere((e) => e.contains('Role:'), orElse: () => ''), style: const TextStyle(fontSize: 13, color: Colors.grey)),
                          if (tags.contains('Server:'))
                            Text(tags.split('\n').firstWhere((e) => e.contains('Server:'), orElse: () => ''), style: const TextStyle(fontSize: 13, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.orange,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          price,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}