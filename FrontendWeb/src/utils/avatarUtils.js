// Bộ sưu tập avatar vui nhộn, biểu cảm gaming ngộ nghĩnh
export const FUN_AVATAR_STYLES = [
  'adventurer',
  'fun-emoji',
  'bottts',
  'big-smile',
  'lorelei',
  'avataaars',
  'micah'
];

/**
 * Sinh avatar ngẫu nhiên hoặc theo seed (username / id)
 * @param {string|number} seed
 * @param {string} style - adventurer, fun-emoji, bottts, big-smile, etc.
 * @returns {string} URL của avatar vui nhộn
 */
export const getFunAvatar = (seed = 'gamer', style = 'adventurer') => {
  if (!seed) seed = Math.random().toString(36).substring(7);
  const cleanSeed = encodeURIComponent(String(seed).trim());
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${cleanSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,c1f4c5`;
};

/**
 * Danh sách 12 avatar vui nhộn chọn sẵn cực nét
 */
export const PRESET_FUN_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=HappyGamer&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolNinja&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CuteCat&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=PlayZone&backgroundColor=c1f4c5',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=ProPlayer&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=AnimeHero&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=SuperStar&backgroundColor=b6e3f4'
];

/**
 * Lấy avatar của người dùng, nếu rỗng thì tự động tạo avatar vui nhộn theo username
 */
export const getUserAvatar = (user) => {
  if (user?.avatar && user.avatar.trim() !== '') return user.avatar;
  if (user?.avatarUrl && user.avatarUrl.trim() !== '') return user.avatarUrl;
  if (user?.profileImageUrl && user.profileImageUrl.trim() !== '') return user.profileImageUrl;
  return getFunAvatar(user?.username || user?.fullName || 'playzone_user');
};

export default {
  getFunAvatar,
  getUserAvatar,
  PRESET_FUN_AVATARS
};
