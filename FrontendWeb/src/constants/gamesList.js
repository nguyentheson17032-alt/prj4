export const GAME_TOPICS_20 = [
  { id: 1, name: 'Liên Minh Huyền Thoại', category: 'MOBA', icon: '⚔️' },
  { id: 2, name: 'VALORANT', category: 'FPS', icon: '🎯' },
  { id: 3, name: 'Liên Quân Mobile', category: 'MOBA', icon: '🛡️' },
  { id: 4, name: 'Mobile Legends: Bang Bang', category: 'MOBA', icon: '⚔️' },
  { id: 5, name: 'Dota 2', category: 'MOBA', icon: '🏹' },
  { id: 6, name: 'Wild Rift', category: 'MOBA', icon: '⚡' },
  { id: 7, name: 'Counter-Strike 2', category: 'FPS', icon: '💣' },
  { id: 8, name: 'Overwatch 2', category: 'FPS', icon: '🚀' },
  { id: 9, name: 'Call of Duty: Mobile', category: 'FPS', icon: '🔫' },
  { id: 10, name: 'PUBG Mobile', category: 'BATTLE_ROYALE', icon: '🪂' },
  { id: 11, name: 'Free Fire', category: 'BATTLE_ROYALE', icon: '🔥' },
  { id: 12, name: 'Apex Legends', category: 'BATTLE_ROYALE', icon: '💨' },
  { id: 13, name: 'Genshin Impact', category: 'RPG', icon: '✨' },
  { id: 14, name: 'Honkai: Star Rail', category: 'RPG', icon: '🚂' },
  { id: 15, name: 'Đấu Trường Chân Lý', category: 'STRATEGY', icon: '♟️' },
  { id: 16, name: 'Clash Royale', category: 'STRATEGY', icon: '👑' },
  { id: 17, name: 'Clash of Clans', category: 'STRATEGY', icon: '🏰' },
  { id: 18, name: 'FIFA Online 4', category: 'SPORT', icon: '⚽' },
  { id: 19, name: 'Brawl Stars', category: 'OTHER', icon: '⭐' },
  { id: 20, name: 'Minecraft', category: 'OTHER', icon: '🧱' }
];


export const getLocalizedGameName = (name, lang = 'vi') => {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lang === 'vi') {
    if (lower === 'league of legends' || lower === 'lol' || lower === 'lmht') return 'Liên Minh Huyền Thoại';
    if (lower === 'teamfight tactics' || lower === 'tft' || lower === 'dtcl') return 'Đấu Trường Chân Lý';
    if (lower === 'arena of valor' || lower === 'aov') return 'Liên Quân Mobile';
    return trimmed;
  }

  // lang === 'en'
  if (lower === 'liên minh huyền thoại' || lower === 'lien minh huyen thoai' || lower === 'lmht' || lower === 'liên minh') {
    return 'League of Legends';
  }
  if (lower === 'đấu trường chân lý' || lower === 'dau truong chan ly' || lower === 'dtcl' || lower === 'đấu trường') {
    return 'Teamfight Tactics';
  }
  if (lower === 'liên quân mobile' || lower === 'lien quan mobile' || lower === 'liên quân' || lower === 'lien quan') {
    return 'Arena of Valor';
  }
  if (lower === 'tốc chiến' || lower === 'toc chien' || lower === 'liên minh: tốc chiến') {
    return 'Wild Rift';
  }
  return trimmed;
};

export const getCanonicalGameName = (name) => {
  if (!name || typeof name !== 'string') return name || '';
  const lower = name.trim().toLowerCase();
  if (lower === 'liên minh huyền thoại' || lower === 'lien minh huyen thoai' || lower === 'lmht' || lower === 'liên minh' || lower === 'lol') {
    return 'League of Legends';
  }
  if (lower === 'đấu trường chân lý' || lower === 'dau truong chan ly' || lower === 'dtcl' || lower === 'tft') {
    return 'Teamfight Tactics';
  }
  if (lower === 'arena of valor' || lower === 'aov') {
    return 'Liên Quân Mobile';
  }
  if (lower === 'tốc chiến' || lower === 'toc chien' || lower === 'liên minh: tốc chiến') {
    return 'Wild Rift';
  }
  return name.trim();
};


export default GAME_TOPICS_20;
