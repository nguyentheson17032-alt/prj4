// PlayZone Mock Data Seed for fallback and offline-first demonstration

export const MOCK_GAMES = [
  { id: 1, name: 'Liên Minh Huyền Thoại', shortName: 'LOL', category: 'MOBA', icon: '⚔️', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60', color: '#3b82f6', playerCount: '1.2k+' },
  { id: 2, name: 'Liên Quân Mobile', shortName: 'LQM', category: 'Mobile MOBA', icon: '🛡️', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=60', color: '#8b5cf6', playerCount: '2.5k+' },
  { id: 3, name: 'Valorant', shortName: 'VAL', category: 'FPS Tactical', icon: '🎯', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60', color: '#ef4444', playerCount: '1.8k+' },
  { id: 4, name: 'PUBG Mobile & PC', shortName: 'PUBG', category: 'Battle Royale', icon: '🪂', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60', color: '#f59e0b', playerCount: '950+' },
  { id: 5, name: 'Đấu Trường Chân Lý', shortName: 'DTCL', category: 'Auto Chess', icon: '♟️', image: 'https://images.unsplash.com/photo-1612287233202-0c9f1a0d7a04?w=500&auto=format&fit=crop&q=60', color: '#10b981', playerCount: '800+' },
  { id: 6, name: 'Genshin Impact', shortName: 'GI', category: 'Open World RPG', icon: '✨', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=60', color: '#06b6d4', playerCount: '650+' },
  { id: 7, name: 'Naraka: Bladepoint', shortName: 'NARAKA', category: 'Action Melee', icon: '🗡️', image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&auto=format&fit=crop&q=60', color: '#ec4899', playerCount: '420+' },
  { id: 8, name: 'CS2 (Counter-Strike 2)', shortName: 'CS2', category: 'FPS', icon: '💣', image: 'https://images.unsplash.com/photo-1552824722-ddab1374e622?w=500&auto=format&fit=crop&q=60', color: '#6366f1', playerCount: '550+' },
  { id: 9, name: 'Tâm Sự & Hát Hò', shortName: 'CHILL', category: 'Voice Chat', icon: '🎙️', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&auto=format&fit=crop&q=60', color: '#f43f5e', playerCount: '1.5k+' }
];

export const MOCK_PLAYERS = [
  {
    id: 1,
    userId: 101,
    username: 'minhanh_cute',
    fullName: 'Minh Ánh (Miu Miu)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    bio: 'Hi anh em! Mình là Miu, thích chơi Liên Quân & Valorant. Giọng nói ngọt ngào, tâm sự đêm khuya, kéo rank nhiệt tình không cáu gắt ❤️',
    pricePerHour: 50000,
    rating: 4.95,
    reviewCount: 248,
    orderCount: 512,
    completionRate: 99.2,
    status: 'ONLINE', // ONLINE, BUSY, OFFLINE
    gender: 'FEMALE',
    isVip: true,
    isHot: true,
    voiceIntroUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: '0:15',
    rank: 'Cao Thủ 35⭐',
    server: 'VN',
    primaryGame: 'Liên Quân Mobile',
    games: [
      { name: 'Liên Quân Mobile', rank: 'Cao Thủ', role: 'Mid / Support', price: 50000 },
      { name: 'Valorant', rank: 'Kim Cương 2', role: 'Duelist / Sage', price: 60000 },
      { name: 'Tâm Sự & Hát Hò', rank: 'Chuyên Nghiệp', role: 'Voice ngọt', price: 45000 }
    ],
    album: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80'
    ],
    tags: ['Giọng ngọt ngào', 'Gánh rank cực tốt', 'Hát hay', 'Không toxic'],
    responseSpeed: '< 1 phút'
  },
  {
    id: 2,
    userId: 102,
    username: 'linh_ruby',
    fullName: 'Linh Ruby (Thỏ Ngọc)',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
    bio: 'Duo LMHT & Valorant chill cực kỳ! Nhận kéo rank hoặc chơi vui vẻ giải trí. Bao vui, hỗ trợ mic discord 100%.',
    pricePerHour: 60000,
    rating: 4.88,
    reviewCount: 186,
    orderCount: 390,
    completionRate: 98.5,
    status: 'ONLINE',
    gender: 'FEMALE',
    isVip: true,
    isHot: true,
    voiceIntroUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: '0:20',
    rank: 'Kim Cương 1',
    server: 'VN',
    primaryGame: 'Liên Minh Huyền Thoại',
    games: [
      { name: 'Liên Minh Huyền Thoại', rank: 'Kim Cương 1', role: 'Support / ADC', price: 60000 },
      { name: 'Đấu Trường Chân Lý', rank: 'Cao Thủ', role: 'Flex', price: 50000 }
    ],
    album: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
    ],
    tags: ['Duo leo rank', 'Voice ấm áp', 'Hài hước', 'Chơi tới bến'],
    responseSpeed: '< 3 phút'
  },
  {
    id: 3,
    userId: 103,
    username: 'kaitovn_pro',
    fullName: 'Kaito Gamer (Boy One Champ)',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    bio: 'Cựu tuyển thủ bán chuyên Valorant & PUBG PC. Nhận coaching kĩ năng aim, spray control, đọc map và kéo rank Radiant / Thách Đấu.',
    pricePerHour: 80000,
    rating: 5.0,
    reviewCount: 320,
    orderCount: 680,
    completionRate: 99.8,
    status: 'BUSY',
    gender: 'MALE',
    isVip: true,
    isHot: false,
    voiceIntroUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: '0:12',
    rank: 'Radiant #150',
    server: 'VN / Asia',
    primaryGame: 'Valorant',
    games: [
      { name: 'Valorant', rank: 'Radiant', role: 'Duelist / IGL', price: 80000 },
      { name: 'CS2', rank: 'Faceit Lv10', role: 'Entry Fragger', price: 80000 },
      { name: 'PUBG PC', rank: 'Master', role: 'Fragger', price: 70000 }
    ],
    album: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80'
    ],
    tags: ['Coaching chuyên sâu', 'Radiant Valorant', 'Aim thần sầu', 'Gánh team 100%'],
    responseSpeed: '< 5 phút'
  },
  {
    id: 4,
    userId: 104,
    username: 'nana_chan',
    fullName: 'Nana Bé Bỏng',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    bio: 'Bé Nana thích chơi Genshin Impact, Naraka và Liên Quân. Có thể thức khuya chơi game cùng mọi người. Giọng loli siêu dễ thương!',
    pricePerHour: 45000,
    rating: 4.92,
    reviewCount: 140,
    orderCount: 295,
    completionRate: 97.8,
    status: 'ONLINE',
    gender: 'FEMALE',
    isVip: false,
    isHot: true,
    voiceIntroUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: '0:18',
    rank: 'Bạch Kim 1',
    server: 'VN',
    primaryGame: 'Genshin Impact',
    games: [
      { name: 'Genshin Impact', rank: 'AR 60', role: 'Co-op khám phá map', price: 45000 },
      { name: 'Liên Quân Mobile', rank: 'Kim Cương', role: 'Support / Pháp Sư', price: 45000 }
    ],
    album: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80'
    ],
    tags: ['Giọng loli dễ thương', 'Hát ru ngủ', 'Thức đêm', 'Chăm sóc chu đáo'],
    responseSpeed: '< 1 phút'
  },
  {
    id: 5,
    userId: 105,
    username: 'baobao_idol',
    fullName: 'Bảo Bảo (Idol Naraka)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1200&auto=format&fit=crop&q=80',
    bio: 'Duo Naraka Bladepoint & PUBG. Kỹ năng combo parry chuẩn chỉ, đảm bảo leo rank mượt mà!',
    pricePerHour: 65000,
    rating: 4.85,
    reviewCount: 96,
    orderCount: 210,
    completionRate: 99.0,
    status: 'OFFLINE',
    gender: 'MALE',
    isVip: false,
    isHot: false,
    voiceIntroUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: '0:14',
    rank: 'Tu La',
    server: 'Asia',
    primaryGame: 'Naraka: Bladepoint',
    games: [
      { name: 'Naraka: Bladepoint', rank: 'Tu La', role: 'Viper / Kurumi', price: 65000 },
      { name: 'PUBG Mobile', rank: 'Chí Tôn', role: 'Assault', price: 50000 }
    ],
    album: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80'
    ],
    tags: ['Parry đỉnh cao', 'Nhiệt tình', 'Tấu hài vui vẻ'],
    responseSpeed: '< 10 phút'
  },
  {
    id: 6,
    userId: 106,
    username: 'thao_cherry',
    fullName: 'Thảo Cherry',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    bio: 'Tâm sự đêm muộn, lắng nghe và chia sẻ. Thích hát acoustic và chơi các game giải trí nhẹ nhàng.',
    pricePerHour: 40000,
    rating: 4.97,
    reviewCount: 310,
    orderCount: 580,
    completionRate: 99.5,
    status: 'ONLINE',
    gender: 'FEMALE',
    isVip: true,
    isHot: true,
    voiceIntroUrl: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: '0:22',
    rank: 'Tâm sự',
    server: 'VN',
    primaryGame: 'Tâm Sự & Hát Hò',
    games: [
      { name: 'Tâm Sự & Hát Hò', rank: 'Pro', role: 'Voice ngọt ấm', price: 40000 },
      { name: 'Đấu Trường Chân Lý', rank: 'Vàng', role: 'Giải trí', price: 35000 }
    ],
    album: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
    ],
    tags: ['Hát hay theo yêu cầu', 'Lắng nghe chân thành', 'Dễ thương', 'Tâm sự 24/7'],
    responseSpeed: '< 1 phút'
  }
];

export const MOCK_MOMENTS = [
  {
    id: 1,
    author: {
      id: 1,
      username: 'minhanh_cute',
      name: 'Minh Ánh (Miu Miu)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      isVip: true
    },
    gameName: 'Liên Quân Mobile',
    content: 'Hôm nay kéo rank thắng liền 7 trận với bạn khách dễ thương! Tối nay ai muốn duo tiếp với Miu không nè? Inbox ngay nhé ✨🌸',
    images: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80'
    ],
    likeCount: 89,
    commentCount: 24,
    createdAt: '10 phút trước',
    isLiked: false
  },
  {
    id: 2,
    author: {
      id: 3,
      username: 'kaitovn_pro',
      name: 'Kaito Gamer',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      isVip: true
    },
    gameName: 'Valorant',
    content: 'Pha clutch 1vs4 cứu game căng thẳng ở rank Radiant. Cảm ơn anh em đã tin tưởng book combo 5 giờ hôm nay nhé! 🎯🔥',
    images: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80'
    ],
    likeCount: 142,
    commentCount: 38,
    createdAt: '1 giờ trước',
    isLiked: true
  },
  {
    id: 3,
    author: {
      id: 2,
      username: 'linh_ruby',
      name: 'Linh Ruby',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      isVip: true
    },
    gameName: 'Liên Minh Huyền Thoại',
    content: 'Lên đồ Support siêu gánh team! Cuối tuần nhiều khuyến mãi giảm 20% khi thuê từ 3 giờ trở lên nha cả nhà 💖',
    images: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80'
    ],
    likeCount: 76,
    commentCount: 15,
    createdAt: '3 giờ trước',
    isLiked: false
  }
];

export const MOCK_REVIEWS = [
  {
    id: 1,
    user: { name: 'Hoàng Nam', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' },
    rating: 5,
    comment: 'Bạn nữ nói chuyện cực kỳ dễ thương và nhiệt tình. Chơi game rất tập trung, kéo mình lên Cao Thủ nhanh chóng! Sẽ book dài dài.',
    gameName: 'Liên Quân Mobile',
    hours: 3,
    createdAt: '2 ngày trước'
  },
  {
    id: 2,
    user: { name: 'Đức Anh', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80' },
    rating: 5,
    comment: 'Giọng ngọt lịm, hát tặng bài nghe mê luôn. 10/10 điểm cho sự chu đáo!',
    gameName: 'Tâm Sự & Hát Hò',
    hours: 2,
    createdAt: '4 ngày trước'
  },
  {
    id: 3,
    user: { name: 'Thanh Tùng', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80' },
    rating: 5,
    comment: 'Cực kỳ hài lòng. Hỗ trợ mic tốt, không delay, hướng dẫn nhiệt tình.',
    gameName: 'Valorant',
    hours: 4,
    createdAt: '1 tuần trước'
  }
];

export const MOCK_ORDERS = [
  {
    id: 'ORD-8921',
    player: MOCK_PLAYERS[0],
    game: 'Liên Quân Mobile',
    hours: 2,
    pricePerHour: 50000,
    totalPrice: 100000,
    discount: 10000,
    finalPrice: 90000,
    status: 'IN_PROGRESS', // PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
    note: 'Đánh xếp hạng rank Tinh Anh lên Cao Thủ',
    createdAt: '2026-10-06 20:30',
    startTime: '2026-10-06 21:00'
  },
  {
    id: 'ORD-8854',
    player: MOCK_PLAYERS[1],
    game: 'Liên Minh Huyền Thoại',
    hours: 3,
    pricePerHour: 60000,
    totalPrice: 180000,
    discount: 0,
    finalPrice: 180000,
    status: 'COMPLETED',
    note: 'Duo vui vẻ chill bot lane',
    createdAt: '2026-10-05 14:15',
    isReviewed: true,
    reviewRating: 5
  },
  {
    id: 'ORD-8712',
    player: MOCK_PLAYERS[2],
    game: 'Valorant',
    hours: 2,
    pricePerHour: 80000,
    totalPrice: 160000,
    discount: 20000,
    finalPrice: 140000,
    status: 'COMPLETED',
    note: 'Hướng dẫn góc bắn và smoke Ascent',
    createdAt: '2026-10-03 19:00',
    isReviewed: false
  }
];

export const MOCK_CONVERSATIONS = [
  {
    id: 1,
    partner: MOCK_PLAYERS[0],
    lastMessage: 'Dạ anh ơi, 15 phút nữa mình bắt đầu trận nhé!',
    lastMessageTime: '21:05',
    unreadCount: 1,
    messages: [
      { id: 1, sender: 'them', text: 'Chào anh! Rất vui được chơi game cùng anh nè 🥰', time: '20:45' },
      { id: 2, sender: 'me', text: 'Chào em, lát mình đánh Liên Quân nhé, anh muốn lên Cao Thủ', time: '20:50' },
      { id: 3, sender: 'them', text: 'Dạ vâng anh, anh chơi tướng gì quen nhất ạ?', time: '20:52' },
      { id: 4, sender: 'me', text: 'Anh hay đi Rừng Nakroth hoặc Triệu Vân', time: '20:55' },
      { id: 5, sender: 'them', text: 'Dạ anh ơi, 15 phút nữa mình bắt đầu trận nhé!', time: '21:05' }
    ]
  },
  {
    id: 2,
    partner: MOCK_PLAYERS[1],
    lastMessage: 'Cảm ơn anh đã đánh giá 5 sao cho em ạ ❤️',
    lastMessageTime: 'Hôm qua',
    unreadCount: 0,
    messages: [
      { id: 1, sender: 'me', text: 'Hôm nay duo vui quá em ơi!', time: 'Hôm qua' },
      { id: 2, sender: 'them', text: 'Cảm ơn anh đã đánh giá 5 sao cho em ạ ❤️', time: 'Hôm qua' }
    ]
  },
  {
    id: 3,
    partner: MOCK_PLAYERS[2],
    lastMessage: 'Ok bạn, nhớ luyện tập crosshair placement nha!',
    lastMessageTime: '3 ngày trước',
    unreadCount: 0,
    messages: [
      { id: 1, sender: 'them', text: 'Ok bạn, nhớ luyện tập crosshair placement nha!', time: '3 ngày trước' }
    ]
  }
];

export const MOCK_GIFTS = [
  { id: 'rose', name: 'Bông Hồng', price: 10000, icon: '🌹', exp: '+50 Exp' },
  { id: 'boba', name: 'Trà Sữa', price: 30000, icon: '🧋', exp: '+150 Exp' },
  { id: 'heart', name: 'Trái Tim VIP', price: 50000, icon: '💖', exp: '+300 Exp' },
  { id: 'car', name: 'Siêu Xe', price: 200000, icon: '🏎️', exp: '+1500 Exp' },
  { id: 'rocket', name: 'Tên Lửa Siêu Cấp', price: 500000, icon: '🚀', exp: '+4000 Exp' }
];

export const MOCK_VOUCHERS = [
  { code: 'PLAYZONE10', discountPercent: 10, maxDiscount: 20000, description: 'Giảm 10% cho đơn thuê đầu tiên' },
  { code: 'WEEKENDVIP', discountPercent: 20, maxDiscount: 50000, description: 'Giảm 20% cho đơn thuê từ 3 giờ' },
  { code: 'FREESHIP50', discountPercent: 15, maxDiscount: 30000, description: 'Ưu đãi thành viên mới' }
];
