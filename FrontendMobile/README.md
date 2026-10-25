# PlayZone Mobile App (FrontendMobile)

Ứng dụng di động PlayZone xây dựng trên nền tảng **Flutter**, đồng bộ kiến trúc phân tầng (Layered Architecture) với hệ thống **Backend** (Spring Boot).

## 📁 Cấu Trúc Thư Mục (`lib/`)

```
lib/
├── config/              # Cấu hình hệ thống & API endpoints
│   └── api_config.dart
├── models/              # Thực thể dữ liệu tương ứng Entity & DTO Backend
│   ├── game_model.dart
│   ├── message_model.dart
│   ├── moment_model.dart
│   ├── notification_model.dart
│   ├── order_model.dart
│   ├── payment_model.dart
│   ├── player_model.dart
│   ├── report_model.dart
│   ├── review_model.dart
│   ├── user_model.dart
│   └── models.dart      # Barrel export
├── screens/             # Màn hình giao diện người dùng (tương ứng Controllers)
│   ├── balance_history_screen.dart
│   ├── change_password_screen.dart
│   ├── chat_screen.dart
│   ├── create_moment_screen.dart
│   ├── deposit_screen.dart
│   ├── donate_player_screen.dart
│   ├── explore_screen.dart
│   ├── forgot_password_screen.dart
│   ├── hire_confirmation_screen.dart
│   ├── hire_player_screen.dart
│   ├── hired_players_screen.dart
│   ├── home_screen.dart
│   ├── login_screen.dart
│   ├── main_screen.dart
│   ├── message_list_screen.dart
│   ├── moment_detail_screen.dart
│   ├── orders_screen.dart
│   ├── player_detail_screen.dart
│   ├── player_profile_screen.dart
│   ├── player_reward_screen.dart
│   ├── policy_screen.dart
│   ├── profile_screen.dart
│   ├── rate_player_screen.dart
│   ├── register_player_screen.dart
│   ├── register_screen.dart
│   ├── settings_screen.dart
│   ├── update_player_screen.dart
│   ├── update_profile_screen.dart
│   ├── user_given_reviews_screen.dart
│   └── webview_screen.dart
├── services/            # Tầng dịch vụ kết nối API tương ứng Backend Services
│   ├── api_service.dart # Central facade (giữ 100% tương thích ngược)
│   ├── auth_service.dart
│   ├── user_service.dart
│   ├── player_service.dart
│   ├── game_service.dart
│   ├── order_service.dart
│   ├── payment_service.dart
│   ├── message_service.dart
│   ├── notification_service.dart
│   ├── moment_service.dart
│   ├── report_service.dart
│   ├── review_service.dart
│   └── services.dart    # Barrel export
├── utils/               # Tiện ích bổ trợ (Firebase, Notifications, Chat, Moment)
│   ├── firebase_helper.dart
│   ├── message_helper.dart
│   ├── moment_helper.dart
│   └── notification_helper.dart
├── firebase_options.dart
└── main.dart
```

## 🚀 Hướng Dẫn Chạy

```bash
flutter pub get
flutter run
```
