import 'package:flutter/material.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Thông tin cá nhân'),
          backgroundColor: Colors.deepOrange,
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Thông tin cá nhân'),
              Tab(text: 'Lịch sử giao dịch'),
              Tab(text: 'Đơn thuê đang chờ'),
            ],
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.white,
          ),
        ),
        body: TabBarView(
          children: [
            _buildProfileInfo(),
            _buildTransactionHistory(),
            _buildPendingHires(),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileInfo() {
    // Implementation of _buildProfileInfo
    return Container();
  }

  Widget _buildTransactionHistory() {
    // Implementation of _buildTransactionHistory
    return Container();
  }

  Widget _buildPendingHires() {
    return const PendingHiresScreen();
  }
}

class PendingHiresScreen extends StatelessWidget {
  const PendingHiresScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Implementation of build method
    return Container();
  }
} 