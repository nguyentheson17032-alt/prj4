import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/message_list_screen.dart';
import 'screens/hired_players_screen.dart' as hired_players;
import 'screens/hired_players_screen.dart' show NotificationScreen;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'firebase_options.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'screens/explore_screen.dart';
import 'utils/firebase_helper.dart';
import 'utils/notification_helper.dart';
import 'utils/message_helper.dart';
import 'utils/moment_helper.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling a background message: ${message.messageId}');
  
  RemoteNotification? notification = message.notification;
  AndroidNotification? android = message.notification?.android;
  
  if (notification != null && android != null) {
    flutterLocalNotificationsPlugin.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          'high_importance_channel',
          'Thông báo',
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  }
}

void main() async {
  try {
    WidgetsFlutterBinding.ensureInitialized();
    
    // Khởi tạo Firebase
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    
    // Thiết lập xử lý tin nhắn nền
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    // Khởi tạo thông báo cục bộ
    const AndroidInitializationSettings initializationSettingsAndroid = 
        AndroidInitializationSettings('@mipmap/ic_launcher');
    final InitializationSettings initializationSettings = 
        InitializationSettings(android: initializationSettingsAndroid);
    await flutterLocalNotificationsPlugin.initialize(initializationSettings);
    
    runApp(const PlayerDuoApp());
  } catch (e) {
    print('Lỗi khi khởi tạo ứng dụng: $e');
  }
}

class PlayerDuoApp extends StatelessWidget {
  const PlayerDuoApp({super.key});

  @override
  Widget build(BuildContext context) {
    setupFCM();
    return MaterialApp(
      title: 'PlayerDuo Clone',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepOrange),
        useMaterial3: true,
        textTheme: ThemeData.light().textTheme.apply(
          bodyColor: Colors.black,
          displayColor: Colors.black,
        ).copyWith(
          bodyLarge: const TextStyle(fontWeight: FontWeight.w600),
          bodyMedium: const TextStyle(fontWeight: FontWeight.w600),
          bodySmall: const TextStyle(fontWeight: FontWeight.w600),
          titleLarge: const TextStyle(fontWeight: FontWeight.w700),
          titleMedium: const TextStyle(fontWeight: FontWeight.w700),
          titleSmall: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      home: const LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

bool _isFCMSetup = false;

void setupFCM() async {
  if (_isFCMSetup) return;
  _isFCMSetup = true;
  try {
    // Sử dụng FirebaseHelper để thiết lập FCM an toàn
    bool success = await FirebaseHelper.setupFCM();
    if (success) {
      print('FCM được thiết lập thành công');
      
      // Thiết lập xử lý tin nhắn khi app đang chạy
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Nhận tin nhắn khi ứng dụng đang chạy!');
        print('Dữ liệu tin nhắn: ${message.data}');

        if (message.notification != null) {
          print('Tin nhắn có chứa thông báo: ${message.notification}');
          RemoteNotification notification = message.notification!;
          AndroidNotification? android = message.notification?.android;
          
          if (android != null) {
            flutterLocalNotificationsPlugin.show(
              notification.hashCode,
              notification.title,
              notification.body,
              NotificationDetails(
                android: AndroidNotificationDetails(
                  'high_importance_channel',
                  'Thông báo',
                  importance: Importance.max,
                  priority: Priority.high,
                  icon: '@mipmap/ic_launcher',
                ),
              ),
            );
          }
        }
        
        // Cập nhật số thông báo chưa đọc
        NotificationHelper.loadUnreadCount();
      });
      
      // Xử lý khi người dùng mở app từ thông báo
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print('App được mở từ thông báo: ${message.messageId}');
        // Xử lý navigation nếu cần
      });
    } else {
      print('Không thể thiết lập FCM');
    }
  } catch (e) {
    print('Lỗi khi thiết lập FCM: $e');
    // Không crash app khi có lỗi Firebase
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0;
  int _unreadNotificationsCount = 0;
  int _unreadMessagesCount = 0;
  int _unviewedMomentsCount = 0;

  static const List<Widget> _screens = <Widget>[
    HomeScreen(),
    ExploreScreen(), // Thay thế Placeholder bằng trang khám phá
    MessageListScreen(), // Chat tab
    NotificationScreen(), // Notification tab: tất cả thông báo (trừ tin nhắn)
    SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _setupNotificationListener();
    _setupMessageListener();
    _setupMomentListener();
    // Delay một chút để đảm bảo user đã đăng nhập
    Future.delayed(const Duration(milliseconds: 500), () {
      _loadUnreadNotificationsCount();
      _loadUnreadMessagesCount();
      _loadUnviewedMomentsCount();
    });
  }

  void _setupNotificationListener() {
    NotificationHelper.addUnreadCountListener((count) {
      print('📢 Nhận được cập nhật số thông báo: $count');
      if (mounted) {
        setState(() {
          _unreadNotificationsCount = count;
        });
        print('🔄 Đã cập nhật UI với số thông báo: $_unreadNotificationsCount');
      }
    });
  }

  void _setupMessageListener() {
    MessageHelper.addUnreadCountListener((count) {
      print('📢 Nhận được cập nhật số tin nhắn: $count');
      if (mounted) {
        setState(() {
          _unreadMessagesCount = count;
        });
        print('🔄 Đã cập nhật UI với số tin nhắn: $_unreadMessagesCount');
      }
    });
  }

  void _setupMomentListener() {
    MomentHelper.addUnviewedCountListener((count) {
      print('📢 Nhận được cập nhật số khoảnh khắc: $count');
      if (mounted) {
        setState(() {
          _unviewedMomentsCount = count;
        });
        print('🔄 Đã cập nhật UI với số khoảnh khắc: $_unviewedMomentsCount');
      }
    });
  }

  Future<void> _loadUnreadNotificationsCount() async {
    print('🔄 Bắt đầu tải số thông báo chưa đọc...');
    await NotificationHelper.loadUnreadCount();
    print('✅ Đã tải xong số thông báo chưa đọc: $_unreadNotificationsCount');
  }

  Future<void> _loadUnreadMessagesCount() async {
    print('🔄 Bắt đầu tải số tin nhắn chưa đọc...');
    await MessageHelper.loadUnreadCount();
    print('✅ Đã tải xong số tin nhắn chưa đọc: $_unreadMessagesCount');
  }

  Future<void> _loadUnviewedMomentsCount() async {
    print('🔄 Bắt đầu tải số khoảnh khắc chưa xem...');
    await MomentHelper.loadUnviewedCount();
    print('✅ Đã tải xong số khoảnh khắc chưa xem: $_unviewedMomentsCount');
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    print('🏗️ MainNavigation build: _unreadNotificationsCount = $_unreadNotificationsCount');
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        items: <BottomNavigationBarItem>[
          const BottomNavigationBarItem(
            icon: Icon(Icons.sports_esports),
            label: 'PD',
          ),
          BottomNavigationBarItem(
            icon: StreamBuilder<int>(
              stream: MomentHelper.unviewedCountStream,
              initialData: _unviewedMomentsCount,
              builder: (context, snapshot) {
                final count = snapshot.data ?? 0;
                print('📸 StreamBuilder Moments: count = $count, _unviewedMomentsCount = $_unviewedMomentsCount');
                return Stack(
                  children: [
                    const Icon(Icons.explore),
                    if (count > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Text(
                            count > 99 ? '99+' : count.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            label: 'Khám Phá',
          ),
          BottomNavigationBarItem(
            icon: StreamBuilder<int>(
              stream: MessageHelper.unreadCountStream,
              initialData: _unreadMessagesCount,
              builder: (context, snapshot) {
                final count = snapshot.data ?? 0;
                print('💬 StreamBuilder Messages: count = $count, _unreadMessagesCount = $_unreadMessagesCount');
                return Stack(
                  children: [
                    const Icon(Icons.chat_bubble_outline),
                    if (count > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Text(
                            count > 99 ? '99+' : count.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            label: 'Chat',
          ),
          BottomNavigationBarItem(
            icon: StreamBuilder<int>(
              stream: NotificationHelper.unreadCountStream,
              initialData: _unreadNotificationsCount,
              builder: (context, snapshot) {
                final count = snapshot.data ?? 0;
                print('🔔 StreamBuilder: count = $count, _unreadNotificationsCount = $_unreadNotificationsCount');
                return Stack(
                  children: [
                    const Icon(Icons.notifications_none),
                    if (count > 0)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Text(
                            count > 99 ? '99+' : count.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            label: 'Thông báo',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Cài đặt',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Colors.deepOrange,
        onTap: _onItemTapped,
      ),
    );
  }
}
