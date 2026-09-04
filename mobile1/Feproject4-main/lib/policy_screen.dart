import 'package:flutter/material.dart';

class PolicyScreen extends StatefulWidget {
  const PolicyScreen({Key? key}) : super(key: key);

  @override
  State<PolicyScreen> createState() => _PolicyScreenState();
}

class _PolicyScreenState extends State<PolicyScreen> {
  final ScrollController _scrollController = ScrollController();
  String activeSection = 'gioi-thieu';
  bool scrolled = false;

  final List<Map<String, String>> sections = [
    {'id': 'gioi-thieu', 'title': 'Giới Thiệu'},
    {'id': 'dieu-khoan-su-dung', 'title': 'Điều Khoản Sử Dụng'},
    {'id': 'chinh-sach-bao-mat', 'title': 'Chính Sách Bảo Mật'},
    {'id': 'thanh-toan', 'title': 'Chính Sách Thanh Toán'},
    {'id': 'hoan-tien', 'title': 'Chính Sách Hoàn Tiền'},
    {'id': 'giai-quyet-tranh-chap', 'title': 'Giải Quyết Tranh Chấp'},
  ];

  final Map<String, GlobalKey> sectionKeys = {
    'gioi-thieu': GlobalKey(),
    'dieu-khoan-su-dung': GlobalKey(),
    'chinh-sach-bao-mat': GlobalKey(),
    'thanh-toan': GlobalKey(),
    'hoan-tien': GlobalKey(),
    'giai-quyet-tranh-chap': GlobalKey(),
  };

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      setState(() {
        scrolled = _scrollController.offset > 50;
      });
    });
  }

  void handleSectionClick(String sectionId) {
    setState(() {
      activeSection = sectionId;
    });
    final keyContext = sectionKeys[sectionId]?.currentContext;
    if (keyContext != null) {
      Scrollable.ensureVisible(
        keyContext,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    }
  }

  void scrollToTop() {
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: scrolled ? 4 : 0,
        title: const Text('Chính Sách', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.deepOrange),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: Stack(
        children: [
          ListView(
            controller: _scrollController,
            padding: const EdgeInsets.only(top: 60, bottom: 100),
            children: [
              // Quick Navigation
              Container(
                color: Colors.deepOrange[50],
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: sections.map((section) {
                      final isActive = activeSection == section['id'];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(section['title']!),
                          selected: isActive,
                          onSelected: (_) => handleSectionClick(section['id']!),
                          selectedColor: Colors.deepOrange,
                          labelStyle: TextStyle(
                            color: isActive ? Colors.white : Colors.deepOrange,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                          ),
                          backgroundColor: Colors.deepOrange[100],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              // Main Content
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Column(
                  children: [
                    // Giới Thiệu
                    _SectionCard(
                      key: sectionKeys['gioi-thieu'],
                      title: 'Giới Thiệu',
                      children: [
                        const Text(
                          'Chào mừng bạn đến với PlayerDou - nền tảng kết nối người chơi game chuyên nghiệp và người dùng. '
                          'Chúng tôi cung cấp dịch vụ thuê người chơi game với mục tiêu mang đến trải nghiệm giải trí tuyệt vời và an toàn cho tất cả người dùng.',
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Tài liệu này quy định các điều khoản và chính sách áp dụng cho việc sử dụng dịch vụ của chúng tôi. '
                          'Vui lòng đọc kỹ các điều khoản và chính sách này trước khi sử dụng dịch vụ của GameHire.',
                        ),
                        const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.indigo[50],
                            border: Border(left: BorderSide( width: 4)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            'Bằng việc sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ tất cả các điều khoản và chính sách được nêu trong tài liệu này.',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        _BackToTopButton(onTap: scrollToTop),
                      ],
                    ),
                    // Điều Khoản Sử Dụng
                    _SectionCard(
                      key: sectionKeys['dieu-khoan-su-dung'],
                      title: 'Điều Khoản Sử Dụng',
                      children: [
                        _SectionSubTitle('1. Tài khoản người dùng'),
                        const Text(
                          'Để sử dụng đầy đủ các tính năng của GameHire, bạn cần đăng ký tài khoản với thông tin chính xác và cập nhật. '
                          'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra trên tài khoản của mình.',
                        ),
                        _SectionSubTitle('2. Quy tắc ứng xử'),
                        const Text(
                          'Người dùng phải tuân thủ các quy tắc ứng xử khi sử dụng dịch vụ. Nghiêm cấm các hành vi quấy rối, '
                          'phân biệt đối xử, lăng mạ, đe dọa hoặc bất kỳ hành vi nào vi phạm pháp luật Việt Nam.',
                        ),
                        _SectionSubTitle('3. Nội dung bị cấm'),
                        const Text(
                          'Người dùng không được đăng tải, chia sẻ hoặc truyền tải nội dung bất hợp pháp, khiêu dâm, '
                          'bạo lực, phỉ báng, xúc phạm hoặc vi phạm quyền sở hữu trí tuệ của người khác.',
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.yellow[50],
                            border: Border(left: BorderSide(color: Colors.orange, width: 4)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            'Chúng tôi có quyền đình chỉ hoặc chấm dứt tài khoản của bạn nếu vi phạm bất kỳ điều khoản nào được nêu ở đây.',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange),
                          ),
                        ),
                        _BackToTopButton(onTap: scrollToTop),
                      ],
                    ),
                    // Chính Sách Bảo Mật
                    _SectionCard(
                      key: sectionKeys['chinh-sach-bao-mat'],
                      title: 'Chính Sách Bảo Mật',
                      children: [
                        _SectionSubTitle('1. Thông tin chúng tôi thu thập'),
                        const Text(
                          'Chúng tôi thu thập thông tin cá nhân như tên, email, số điện thoại, và thông tin thanh toán khi bạn đăng ký '
                          'và sử dụng dịch vụ. Chúng tôi cũng có thể thu thập thông tin về thiết bị và hoạt động sử dụng dịch vụ.',
                        ),
                        _SectionSubTitle('2. Cách chúng tôi sử dụng thông tin'),
                        const Text(
                          'Thông tin của bạn được sử dụng để cung cấp và cải thiện dịch vụ, xử lý thanh toán, liên lạc với bạn, '
                          'và đảm bảo an toàn cho nền tảng. Chúng tôi không bán thông tin cá nhân của bạn cho bên thứ ba.',
                        ),
                        _SectionSubTitle('3. Bảo mật thông tin'),
                        const Text(
                          'Chúng tôi áp dụng các biện pháp bảo mật hợp lý để bảo vệ thông tin cá nhân của bạn khỏi truy cập '
                          'trái phép, mất mát, sử dụng sai mục đích hoặc tiết lộ.',
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.green[50],
                            border: Border(left: BorderSide(color: Colors.green, width: 4)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            'Bạn có quyền yêu cầu truy cập, sửa đổi hoặc xóa thông tin cá nhân của mình bất kỳ lúc nào bằng cách liên hệ với chúng tôi.',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
                          ),
                        ),
                        _BackToTopButton(onTap: scrollToTop),
                      ],
                    ),
                    // Chính Sách Thanh Toán
                    _SectionCard(
                      key: sectionKeys['thanh-toan'],
                      title: 'Chính Sách Thanh Toán',
                      children: [
                        _SectionSubTitle('1. Phương thức thanh toán'),
                        const Text(
                          'GameHire chấp nhận nhiều phương thức thanh toán khác nhau bao gồm thẻ tín dụng/ghi nợ, ví điện tử '
                          '(MoMo, ZaloPay, VNPay), và chuyển khoản ngân hàng.',
                        ),
                        _SectionSubTitle('2. Quy trình thanh toán'),
                        const Text(
                          'Khi thuê người chơi, số tiền sẽ được giữ lại cho đến khi dịch vụ hoàn thành. Sau khi xác nhận dịch vụ '
                          'đã hoàn thành, tiền sẽ được chuyển cho người chơi sau khi trừ phí dịch vụ của nền tảng.',
                        ),
                        _SectionSubTitle('3. Phí dịch vụ'),
                        const Text(
                          'GameHire thu phí dịch vụ 10% trên mỗi giao dịch thành công. Phí này được tính vào giá dịch vụ và '
                          'được hiển thị rõ ràng trước khi bạn xác nhận thanh toán.',
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.blue[50],
                            border: Border(left: BorderSide( width: 4)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            'Tất cả các giao dịch được bảo mật và mã hóa. Chúng tôi không lưu trữ thông tin thẻ tín dụng của bạn.',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        _BackToTopButton(onTap: scrollToTop),
                      ],
                    ),
                    // Chính Sách Hoàn Tiền
                    _SectionCard(
                      key: sectionKeys['hoan-tien'],
                      title: 'Chính Sách Hoàn Tiền',
                      children: [
                        _SectionSubTitle('1. Điều kiện hoàn tiền'),
                        const Text('Bạn có thể yêu cầu hoàn tiền trong các trường hợp sau:'),
                        const Padding(
                          padding: EdgeInsets.only(left: 16, bottom: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('• Người chơi không tham gia hoặc hủy phiên chơi mà không thông báo trước'),
                              Text('• Chất lượng dịch vụ không đáp ứng mô tả'),
                              Text('• Gặp sự cố kỹ thuật nghiêm trọng từ phía nền tảng'),
                            ],
                          ),
                        ),
                        _SectionSubTitle('2. Thời hạn yêu cầu hoàn tiền'),
                        const Text(
                          'Yêu cầu hoàn tiền phải được gửi trong vòng 24 giờ sau khi kết thúc phiên chơi hoặc sau khi phát hiện vấn đề.',
                        ),
                        _SectionSubTitle('3. Quy trình hoàn tiền'),
                        const Text(
                          'Để yêu cầu hoàn tiền, vui lòng liên hệ với bộ phận hỗ trợ khách hàng qua email hoặc chat trực tuyến. '
                          'Chúng tôi sẽ xem xét yêu cầu của bạn trong vòng 48 giờ làm việc.',
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.red[50],
                            border: Border(left: BorderSide(color: Colors.red, width: 4)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            'Lưu ý: Chúng tôi có quyền từ chối yêu cầu hoàn tiền nếu phát hiện dấu hiệu gian lận hoặc lạm dụng chính sách.',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrangeAccent),
                          ),
                        ),
                        _BackToTopButton(onTap: scrollToTop),
                      ],
                    ),
                    // Giải Quyết Tranh Chấp
                    _SectionCard(
                      key: sectionKeys['giai-quyet-tranh-chap'],
                      title: 'Giải Quyết Tranh Chấp',
                      children: [
                        _SectionSubTitle('1. Quy trình giải quyết tranh chấp'),
                        const Text(
                          'Khi phát sinh tranh chấp giữa người thuê và người chơi, vui lòng thực hiện các bước sau:',
                        ),
                        const Padding(
                          padding: EdgeInsets.only(left: 16, bottom: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('1. Liên hệ trực tiếp với đối tác để thảo luận và giải quyết vấn đề'),
                              Text('2. Nếu không thể giải quyết, hãy gửi yêu cầu hỗ trợ đến bộ phận dịch vụ khách hàng'),
                              Text('3. Cung cấp đầy đủ thông tin và bằng chứng liên quan đến tranh chấp'),
                            ],
                          ),
                        ),
                        _SectionSubTitle('2. Vai trò của GameHire'),
                        const Text(
                          'GameHire đóng vai trò trung gian trong việc giải quyết tranh chấp. Chúng tôi sẽ xem xét tất cả các '
                          'bằng chứng được cung cấp và đưa ra quyết định công bằng dựa trên các điều khoản dịch vụ.',
                        ),
                        _SectionSubTitle('3. Thời gian giải quyết'),
                        const Text(
                          'Chúng tôi cam kết giải quyết các tranh chấp trong vòng 7 ngày làm việc kể từ khi nhận được đầy đủ thông tin.',
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.purple[50],
                            border: Border(left: BorderSide(color: Colors.purple, width: 4)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            'Quyết định cuối cùng của GameHire là quyết định ràng buộc đối với cả hai bên tham gia tranh chấp.',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.purple),
                          ),
                        ),
                        _BackToTopButton(onTap: scrollToTop),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 80),
            ],
          ),
        ],
      ),
      floatingActionButton: AnimatedOpacity(
        opacity: scrolled ? 1 : 0,
        duration: const Duration(milliseconds: 300),
        child: FloatingActionButton(
          backgroundColor: Colors.deepOrange,
          onPressed: scrollToTop,
          child: const Icon(Icons.arrow_upward, color: Colors.white),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({Key? key, required this.title, required this.children}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 10),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.deepOrange.withOpacity(0.2), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.deepOrange)),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _SectionSubTitle extends StatelessWidget {
  final String text;
  const _SectionSubTitle(this.text, {Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 4),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.deepOrange)),
    );
  }
}

class _BackToTopButton extends StatelessWidget {
  final VoidCallback onTap;
  const _BackToTopButton({Key? key, required this.onTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.arrow_upward, color: Colors.deepOrange),
      label: const Text('Về đầu trang', style: TextStyle(color: Colors.deepOrange)),
    );
  }
}

class _FooterIcon extends StatelessWidget {
  final IconData icon;
  final String url;
  const _FooterIcon({Key? key, required this.icon, required this.url}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(icon, color: Colors.deepOrange),
      onPressed: () {
        // Mở url nếu cần
      },
    );
  }
} 