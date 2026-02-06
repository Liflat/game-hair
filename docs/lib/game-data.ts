export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "cosmic"

export type Element = "fire" | "water" | "wind" | "light" | "dark" | "divine"

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: "炎",
  water: "水",
  wind: "風",
  light: "光",
  dark: "闇",
  divine: "神",
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: "#EF4444",
  water: "#3B82F6",
  wind: "#22C55E",
  light: "#FBBF24",
  dark: "#6B21A8",
  divine: "#F472B6",
}

export const ELEMENT_EMOJIS: Record<Element, string> = {
  fire: "fire",
  water: "water",
  wind: "wind",
  light: "sun",
  dark: "moon",
  divine: "star",
}

// Element matchup: returns multiplier (1.3 = strong, 0.7 = weak, 1.0 = neutral)
export function getElementMatchup(attacker: Element, defender: Element): number {
  // Fire > Wind, Water > Fire, Wind > Water
  if (attacker === "fire" && defender === "wind") return 1.3
  if (attacker === "water" && defender === "fire") return 1.3
  if (attacker === "wind" && defender === "water") return 1.3
  
  // Reverse - weak against
  if (attacker === "fire" && defender === "water") return 0.7
  if (attacker === "water" && defender === "wind") return 0.7
  if (attacker === "wind" && defender === "fire") return 0.7
  
  // Light <-> Dark (strong against each other, weak against each other)
  if (attacker === "light" && defender === "dark") return 1.3
  if (attacker === "dark" && defender === "light") return 1.3
  
  // Divine > Fire, Water, Wind
  if (attacker === "divine" && (defender === "fire" || defender === "water" || defender === "wind")) return 1.3
  
  // Divine < Light, Dark
  if (attacker === "divine" && (defender === "light" || defender === "dark")) return 0.7
  
  // Light/Dark > Divine
  if ((attacker === "light" || attacker === "dark") && defender === "divine") return 1.3
  
  return 1.0
}

export function getElementCombatModifiers(attackerElement: Element, defenderElement: Element): { attackMod: number; defenseMod: number } {
  // Get attack modifier (advantage when attacking)
  const attackMod = getElementMatchup(attackerElement, defenderElement)
  
  // Get defense modifier (advantage when defending)
  const defenseMod = getElementMatchup(defenderElement, attackerElement)
  
  return {
    attackMod,
    defenseMod,
  }
}

export interface Skill {
  id: string
  name: string
  description: string
  damage: number
  cooldown: number
  type: "attack" | "defense" | "special" | "aoe" | "team_heal" | "dot" | "dodge"
  maxTargets?: number // For aoe skills - max number of targets to select
  dotEffect?: { name: string; damage: number; duration: number } // For dot skills
}

export interface DefenseSkillEffect {
  reduction: number
  duration: number
  log?: string
}

const COMMON_DEFENSE_SKILLS = new Set([
  "fluffy-shield",
  "spiral-defense",
  "rigid-stance",
  "slip-away",
  "mini-barrier",
  "bushy-cover",
  "glossy-reflect",
  "stone-wall",
  "flow-dodge",
  "gum-shield",
  "spike-armor",
  "jelly-absorb",
  "elastic-guard",
  "shine-barrier",
])

const UNCOMMON_DEFENSE_SKILLS = new Set([
  "mirror-coat",
  "immovable",
  "coil-dodge",
  "heat-aura",
  "freeze-guard",
  "magma-armor",
  "wind-barrier",
  "zero-gravity",
  "speed-blur",
])

const RARE_DEFENSE_SKILLS = new Set([
  "treasure-guard",
  "scale-armor",
  "prism-barrier",
  "dark-veil",
  "iron-fortress",
  "northern-veil",
  "stone-skin",
  "ethereal-form",
  "deep-dive",
])

export function getDefenseSkillEffect(skillId: string): DefenseSkillEffect {
  if (skillId === "normal-defense") {
    return { reduction: 20, duration: 1 }
  }
  if (skillId === "event-horizon") {
    return { reduction: 100, duration: 1, log: "イベントホライズン発動! 全攻撃無効化!" }
  }
  if (skillId === "demon-king-shell" || skillId === "demon-king-shell-raid") {
    return { reduction: 90, duration: 1 }
  }
  if (skillId === "depth-guard") {
    return { reduction: 50, duration: 2 }
  }
  if (skillId === "cosmic-shield") {
    return { reduction: 60, duration: 2 }
  }
  if (COMMON_DEFENSE_SKILLS.has(skillId)) {
    return { reduction: 25, duration: 2 }
  }
  if (UNCOMMON_DEFENSE_SKILLS.has(skillId)) {
    return { reduction: 35, duration: 2 }
  }
  if (RARE_DEFENSE_SKILLS.has(skillId)) {
    return { reduction: 45, duration: 2 }
  }
  return { reduction: 20, duration: 1 }
}

export interface HairRoot {
  id: number
  name: string
  rarity: Rarity
  element: Element
  description: string
  power: number
  speed: number
  grip: number
  emoji: string
  color: string
  skills: Skill[]
  evolvesTo?: number
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
  cosmic: "#FF0080",
}

export const RARITY_NAMES: Record<Rarity, string> = {
  common: "ノーマル",
  uncommon: "ヘア",
  rare: "スーパーヘア",
  epic: "ウルトラヘア",
  legendary: "レジェンドヘア",
  cosmic: "コズミックヘア",
}

export const HAIR_ROOTS: HairRoot[] = [
  // Common (10) - evolves to Uncommon
  { id: 1, name: "ふわふわ毛根", rarity: "common", element: "wind", description: "やわらかい初心者向けの毛根", power: 10, speed: 15, grip: 8, emoji: "🌱", color: "#8B4513", evolvesTo: 11, skills: [
    { id: "soft-touch", name: "ソフトタッチ", description: "優しく絡みつく", damage: 15, cooldown: 2, type: "attack" },
    { id: "fluffy-shield", name: "ふわふわシールド", description: "柔らかさで衝撃を吸収", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 2, name: "ちぢれ毛根", rarity: "common", element: "wind", description: "くるくるした愛らしい毛根", power: 12, speed: 10, grip: 15, emoji: "🌀", color: "#654321", evolvesTo: 12, skills: [
    { id: "curl-grip", name: "カールグリップ", description: "くるくる巻き付いて離さない", damage: 18, cooldown: 3, type: "attack" },
    { id: "spiral-defense", name: "スパイラルガード", description: "螺旋状に防御態勢", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 3, name: "まっすぐ毛根", rarity: "common", element: "light", description: "シンプルで扱いやすい毛根", power: 11, speed: 12, grip: 11, emoji: "📍", color: "#3D2314", evolvesTo: 13, skills: [
    { id: "straight-pierce", name: "ストレートピアス", description: "まっすぐ突き刺す", damage: 20, cooldown: 2, type: "attack" },
    { id: "rigid-stance", name: "リジッドスタンス", description: "硬直して耐える", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 4, name: "ほそほそ毛根", rarity: "common", element: "wind", description: "細いけど意外としぶとい", power: 8, speed: 18, grip: 10, emoji: "🪡", color: "#4A3728", evolvesTo: 14, skills: [
    { id: "needle-strike", name: "ニードルストライク", description: "素早く突く", damage: 12, cooldown: 1, type: "attack" },
    { id: "slip-away", name: "スリップアウェイ", description: "細さを活かして回避", damage: 0, cooldown: 3, type: "dodge" }
  ]},
  { id: 5, name: "ぷちぷち毛根", rarity: "common", element: "fire", description: "小さくて可愛い毛根", power: 9, speed: 14, grip: 12, emoji: "💠", color: "#5C4033", evolvesTo: 15, skills: [
    { id: "pop-attack", name: "ポップアタック", description: "弾けて攻撃", damage: 16, cooldown: 2, type: "attack" },
    { id: "mini-barrier", name: "ミニバリア", description: "小さなバリアを展開", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 6, name: "もじゃもじゃ毛根", rarity: "common", element: "wind", description: "ワイルドな見た目の毛根", power: 13, speed: 8, grip: 14, emoji: "🌿", color: "#6B4423", evolvesTo: 18, skills: [
    { id: "wild-tangle", name: "ワイルドタングル", description: "乱暴に絡みつく", damage: 22, cooldown: 3, type: "attack" },
    { id: "bushy-cover", name: "ブッシュカバー", description: "もじゃもじゃで隠れる", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 7, name: "さらさら毛根", rarity: "common", element: "light", description: "つややかで美しい毛根", power: 10, speed: 16, grip: 9, emoji: "✨", color: "#7C5A3C", evolvesTo: 11, skills: [
    { id: "silk-whip", name: "シルクウィップ", description: "滑らかに鞭打つ", damage: 14, cooldown: 2, type: "attack" },
    { id: "glossy-reflect", name: "グロッシーリフレクト", description: "艶で反射", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 8, name: "ごわごわ毛根", rarity: "common", element: "dark", description: "硬くてしっかりした毛根", power: 15, speed: 7, grip: 13, emoji: "🪨", color: "#5D4E37", evolvesTo: 13, skills: [
    { id: "rough-slam", name: "ラフスラム", description: "荒々しく叩きつける", damage: 25, cooldown: 4, type: "attack" },
    { id: "stone-wall", name: "ストーンウォール", description: "岩のように固まる", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 9, name: "うねうね毛根", rarity: "common", element: "water", description: "波打つ独特な毛根", power: 11, speed: 11, grip: 13, emoji: "🌊", color: "#4E3B2D", evolvesTo: 16, skills: [
    { id: "wave-crash", name: "ウェーブクラッシュ", description: "波のように押し寄せる", damage: 18, cooldown: 3, type: "attack" },
    { id: "flow-dodge", name: "フロードッジ", description: "流れるように避ける", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 10, name: "ぴんぴん毛根", rarity: "common", element: "light", description: "元気いっぱいの毛根", power: 12, speed: 13, grip: 10, emoji: "⚡", color: "#5F4B3C", evolvesTo: 17, skills: [
    { id: "energy-burst", name: "エナジーバースト", description: "元気に弾ける", damage: 17, cooldown: 2, type: "attack" },
    { id: "bounce-back", name: "バウンスバック", description: "跳ね返って回復", damage: 0, cooldown: 4, type: "special" }
  ]},

// Uncommon (8) - evolves to Rare
  { id: 11, name: "銀の毛根", rarity: "uncommon", element: "light", description: "シルバーに輝く美しい毛根", power: 18, speed: 20, grip: 17, emoji: "🪙", color: "#C0C0C0", evolvesTo: 19, skills: [
    { id: "silver-slash", name: "シルバースラッシュ", description: "銀光で切り裂く", damage: 28, cooldown: 3, type: "attack" },
    { id: "mirror-coat", name: "ミラーコート", description: "銀の輝きで跳ね返す", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 12, name: "ツイスト毛根", rarity: "uncommon", element: "wind", description: "二重らせん構造の毛根", power: 20, speed: 16, grip: 22, emoji: "🧬", color: "#8B6914", evolvesTo: 21, skills: [
    { id: "dna-bind", name: "DNAバインド", description: "二重らせんで締め上げる", damage: 32, cooldown: 4, type: "attack" },
    { id: "helix-heal", name: "ヘリックスヒール", description: "らせんの力で回復", damage: 0, cooldown: 5, type: "special" }
  ]},
  { id: 13, name: "アンカー毛根", rarity: "uncommon", element: "water", description: "しっかり根付く毛根", power: 22, speed: 12, grip: 25, emoji: "⚓", color: "#4A5568", evolvesTo: 24, skills: [
    { id: "anchor-drop", name: "アンカードロップ", description: "重く落ちて固定", damage: 35, cooldown: 4, type: "attack" },
    { id: "immovable", name: "イムーバブル", description: "動かない守り", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 14, name: "スプリング毛根", rarity: "uncommon", element: "wind", description: "バネのように跳ねる毛根", power: 15, speed: 28, grip: 15, emoji: "🎯", color: "#718096", evolvesTo: 22, skills: [
    { id: "spring-shot", name: "スプリングショット", description: "跳ねて急襲", damage: 24, cooldown: 2, type: "attack" },
    { id: "coil-dodge", name: "コイルドッジ", description: "バネで飛んで回避", damage: 0, cooldown: 3, type: "dodge" }
  ]},
  { id: 15, name: "フレイム毛根", rarity: "uncommon", element: "fire", description: "燃えるような赤い毛根", power: 25, speed: 18, grip: 14, emoji: "🔥", color: "#EF4444", evolvesTo: 25, skills: [
    { id: "fire-blast", name: "ファイアブラスト", description: "炎を纏って突撃+炎上付与", damage: 28, cooldown: 4, type: "dot", dotEffect: { name: "炎上", damage: 10, duration: 3 } },
    { id: "heat-aura", name: "ヒートオーラ", description: "熱で近づけさせない", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 16, name: "フロスト毛根", rarity: "uncommon", element: "water", description: "凍てつく青い毛根", power: 16, speed: 22, grip: 20, emoji: "❄️", color: "#60A5FA", evolvesTo: 26, skills: [
    { id: "ice-spike", name: "アイススパイク", description: "氷の棘+凍傷付与", damage: 22, cooldown: 3, type: "dot", dotEffect: { name: "凍傷", damage: 8, duration: 3 } },
    { id: "freeze-guard", name: "フリーズガード", description: "凍って硬化", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 17, name: "サンダー毛根", rarity: "uncommon", element: "light", description: "電撃を纏う毛根", power: 24, speed: 24, grip: 10, emoji: "⚡", color: "#FBBF24", evolvesTo: 27, skills: [
    { id: "thunder-bolt", name: "サンダーボルト", description: "電撃を放つ", damage: 36, cooldown: 3, type: "attack" },
    { id: "static-field", name: "スタティックフィールド", description: "静電気で麻痺", damage: 0, cooldown: 4, type: "special" }
  ]},
  { id: 18, name: "バイン毛根", rarity: "uncommon", element: "wind", description: "つる状に伸びる毛根", power: 14, speed: 15, grip: 30, emoji: "🌿", color: "#10B981", evolvesTo: 23, skills: [
    { id: "vine-whip", name: "バインウィップ", description: "つるで鞭打つ", damage: 26, cooldown: 3, type: "attack" },
    { id: "entangle", name: "エンタングル", description: "絡めて動きを封じる", damage: 0, cooldown: 4, type: "special" }
  ]},

// Rare (6) - evolves to Epic
  { id: 19, name: "金の毛根", rarity: "rare", element: "light", description: "24金に輝く高貴な毛根", power: 30, speed: 28, grip: 28, emoji: "🥇", color: "#FFD700", evolvesTo: 25, skills: [
    { id: "gold-rush", name: "ゴールドラッシュ", description: "黄金の突進", damage: 45, cooldown: 4, type: "attack" },
    { id: "treasure-guard", name: "トレジャーガード", description: "黄金の防壁", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 20, name: "ドラゴン毛根", rarity: "rare", element: "fire", description: "龍のうろこを持つ毛根", power: 38, speed: 25, grip: 25, emoji: "🐉", color: "#DC2626", evolvesTo: 25, skills: [
    { id: "dragon-breath", name: "ドラゴンブレス", description: "龍の炎を吐く+炎上付与", damage: 40, cooldown: 5, type: "dot", dotEffect: { name: "炎上", damage: 15, duration: 3 } },
    { id: "scale-armor", name: "スケールアーマー", description: "うろこで守る", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 21, name: "クリスタル毛根", rarity: "rare", element: "water", description: "透き通る結晶の毛根", power: 28, speed: 32, grip: 30, emoji: "💎", color: "#06B6D4", evolvesTo: 27, skills: [
    { id: "crystal-shatter", name: "クリスタルシャッター", description: "結晶を砕いて攻撃", damage: 48, cooldown: 4, type: "attack" },
    { id: "prism-barrier", name: "プリズムバリア", description: "結晶の壁で守る", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 22, name: "シャドウ毛根", rarity: "rare", element: "dark", description: "影に溶け込む神秘的な毛根", power: 32, speed: 35, grip: 22, emoji: "🌑", color: "#1F2937", evolvesTo: 28, skills: [
    { id: "shadow-strike", name: "シャドウストライク", description: "影から奇襲", damage: 50, cooldown: 4, type: "attack" },
    { id: "dark-veil", name: "ダークヴェール", description: "闘に隠れる", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 23, name: "レインボー毛根", rarity: "rare", element: "light", description: "七色に光る希少な毛根", power: 28, speed: 28, grip: 35, emoji: "🌈", color: "#EC4899", evolvesTo: 27, skills: [
    { id: "spectrum-blast", name: "スペクトラムブラスト", description: "七色の光線(最大2体)", damage: 35, cooldown: 4, type: "aoe", maxTargets: 2 },
    { id: "rainbow-aura", name: "レインボーオーラ", description: "虹の加護", damage: 0, cooldown: 5, type: "special" }
  ]},
  { id: 24, name: "メタル毛根", rarity: "rare", element: "dark", description: "鋼鉄のように硬い毛根", power: 40, speed: 18, grip: 32, emoji: "🔩", color: "#6B7280", evolvesTo: 26, skills: [
    { id: "metal-crush", name: "メタルクラッシュ", description: "鋼鉄で押しつぶす", damage: 58, cooldown: 5, type: "attack" },
    { id: "iron-fortress", name: "アイアンフォートレス", description: "鋼鉄の要塞", damage: 0, cooldown: 6, type: "defense" }
  ]},

  // Epic (4) - evolves to Legendary
  { id: 25, name: "鳳凰毛根", rarity: "epic", element: "fire", description: "不死鳥の羽を持つ毛根", power: 48, speed: 45, grip: 42, emoji: "🦅", color: "#F97316", evolvesTo: 29, skills: [
    { id: "phoenix-flare", name: "フェニックスフレア", description: "不死鳥の炎で焼き尽くす+炎上付与", damage: 70, cooldown: 4, type: "dot", dotEffect: { name: "炎上", damage: 20, duration: 3 } },
    { id: "rebirth", name: "リバース", description: "灰から蘇り、HPを70%回復", damage: 0, cooldown: 6, type: "special" }
  ]},
  { id: 26, name: "深海毛根", rarity: "epic", element: "water", description: "深海の圧力に耐える毛根", power: 42, speed: 38, grip: 55, emoji: "🐙", color: "#1E3A8A", evolvesTo: 30, skills: [
    { id: "abyss-crush", name: "アビスクラッシュ", description: "1万メートルの水圧で粉砕", damage: 88, cooldown: 4, type: "attack" },
    { id: "depth-guard", name: "デプスガード", description: "深海の圧力を纏い50%ダメージ軽減", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 27, name: "ネビュラ毛根", rarity: "epic", element: "divine", description: "星雲の力を宿す毛根", power: 50, speed: 48, grip: 38, emoji: "🌌", color: "#7C3AED", evolvesTo: 29, skills: [
    { id: "nebula-burst", name: "ネビュラバースト", description: "超新星爆発級の一撃(最大2体)", damage: 80, cooldown: 4, type: "aoe", maxTargets: 2 },
    { id: "cosmic-shield", name: "コズミックシールド", description: "星間物質の障壁、60%ダメージ軽減", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 28, name: "タイムリープ毛根", rarity: "epic", element: "light", description: "時を超える力を持つ毛根", power: 45, speed: 55, grip: 40, emoji: "⏰", color: "#0EA5E9", evolvesTo: 30, skills: [
    { id: "time-strike", name: "タイムストライク", description: "時間停止中に連続攻撃", damage: 92, cooldown: 4, type: "attack" },
    { id: "rewind", name: "リワインド", description: "時を巻き戻しHPを2ターン前に復元", damage: 0, cooldown: 5, type: "special" }
  ]},

// Legendary (2) - max tier
  { id: 29, name: "神の毛根", rarity: "legendary", element: "divine", description: "神話に語られる究極の毛根", power: 70, speed: 65, grip: 68, emoji: "👑", color: "#FDE047", skills: [
    { id: "divine-judgment", name: "ディバインジャッジメント", description: "天罰を下し、敵を一撃で葬る", damage: 150, cooldown: 4, type: "attack" },
    { id: "holy-blessing", name: "ホーリーブレッシング", description: "神の加護で全ステータス+50、HP40%回復", damage: 0, cooldown: 5, type: "special" }
  ]},
  { id: 30, name: "ブラックホール毛根", rarity: "legendary", element: "dark", description: "全てを飲み込む最強の毛根", power: 75, speed: 60, grip: 75, emoji: "🕳️", color: "#18181B", skills: [
    { id: "singularity", name: "シンギュラリティ", description: "特異点に引き込み存在を消滅させる", damage: 140, cooldown: 4, type: "attack" },
    { id: "event-horizon", name: "イベントホライズン", description: "事象の地平線で全攻撃を無効化", damage: 0, cooldown: 5, type: "defense" }
  ]},

  // Cosmic (1) - Ultra rare tier (0.1% chance)
  { id: 31, name: "ゼウスの毛根", rarity: "cosmic", element: "divine", description: "全知全能の神ゼウスの力を宿す究極の毛根。雷と天空を支配する", power: 100, speed: 95, grip: 90, emoji: "⚡", color: "#FFD700", skills: [
    { id: "thunderbolt-supreme", name: "サンダーボルト・スプリーム", description: "オリンポスの雷霆で選択した敵を消し去る(最大3体)", damage: 200, cooldown: 3, type: "aoe", maxTargets: 3 },
    { id: "olympus-blessing", name: "オリンポスの祝福", description: "神々の加護。味方全員のHP完全回復", damage: 0, cooldown: 6, type: "team_heal" }
  ]},
  { id: 32, name: "ギャラクティカ毛根", rarity: "cosmic", element: "dark", description: "宇宙の彼方から現れた暗黒の毛根。隕石と終焉の力を操る", power: 105, speed: 90, grip: 95, emoji: "🌌", color: "#4B0082", skills: [
    { id: "thousand-meteor", name: "サウザンドメテオ", description: "1000の隕石で敵全体を襲う", damage: 150, cooldown: 5, type: "aoe", maxTargets: 99 },
    { id: "end-world", name: "エンドワールド", description: "世界の終わりで敵一体を消滅させる", damage: 9999, cooldown: 7, type: "special" }
  ]},
  { id: 53, name: "超次元毛根魔王ヘアグランド", rarity: "cosmic", element: "dark", description: "全次元を支配する究極の魔王。超次元の力で全てを従える", power: 100, speed: 100, grip: 100, emoji: "👑", color: "#FF1493", skills: [
    { id: "ancient-chaos", name: "エンシェントカオス", description: "古代の混沌を解放する必殺攻撃。威力150", damage: 150, cooldown: 4, type: "attack" },
    { id: "demon-king-shell", name: "魔王の外郭", description: "魔王の堅牢な外殻で身を守る。防御率90%", damage: 0, cooldown: 3, type: "defense" },
    { id: "absolute-zero", name: "アブソリュートゼロ", description: "全次元領域に絶対零度を撃ち込む。全体に威力100のダメージと全ステータス20%ダウン", damage: 100, cooldown: 5, type: "aoe", maxTargets: 99 }
  ]},

  // Additional Common (5)
  { id: 33, name: "ねばねば毛根", rarity: "common", element: "water", description: "粘着質で離さない毛根", power: 9, speed: 10, grip: 18, emoji: "🍯", color: "#D97706", evolvesTo: 11, skills: [
    { id: "sticky-trap", name: "スティッキートラップ", description: "粘着で絡めとる", damage: 14, cooldown: 2, type: "attack" },
    { id: "gum-shield", name: "ガムシールド", description: "粘着バリア", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 34, name: "とげとげ毛根", rarity: "common", element: "wind", description: "棘だらけの攻撃的な毛根", power: 16, speed: 9, grip: 10, emoji: "🌵", color: "#16A34A", evolvesTo: 15, skills: [
    { id: "thorn-stab", name: "ソーンスタブ", description: "棘で刺す", damage: 22, cooldown: 3, type: "attack" },
    { id: "spike-armor", name: "スパイクアーマー", description: "棘の鎧で反撃", damage: 0, cooldown: 4, type: "defense" }
  ]},
  { id: 35, name: "ふにゃふにゃ毛根", rarity: "common", element: "water", description: "柔軟で変幻自在な毛根", power: 8, speed: 17, grip: 11, emoji: "🪼", color: "#A78BFA", evolvesTo: 14, skills: [
    { id: "flex-whip", name: "フレックスウィップ", description: "しなやかに鞭打つ", damage: 13, cooldown: 2, type: "attack" },
    { id: "jelly-absorb", name: "ジェリーアブソーブ", description: "衝撃を吸収", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 36, name: "ぽよぽよ毛根", rarity: "common", element: "water", description: "弾力のある愛らしい毛根", power: 10, speed: 12, grip: 14, emoji: "🫧", color: "#38BDF8", evolvesTo: 12, skills: [
    { id: "bounce-attack", name: "バウンスアタック", description: "跳ねて攻撃", damage: 16, cooldown: 2, type: "attack" },
    { id: "elastic-guard", name: "エラスティックガード", description: "弾いて防御", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 37, name: "きらきら毛根", rarity: "common", element: "light", description: "光を反射する美しい毛根", power: 11, speed: 14, grip: 10, emoji: "💫", color: "#FCD34D", evolvesTo: 19, skills: [
    { id: "sparkle-flash", name: "スパークルフラッシュ", description: "光で目くらまし攻撃", damage: 15, cooldown: 2, type: "attack" },
    { id: "shine-barrier", name: "シャインバリア", description: "光の壁", damage: 0, cooldown: 4, type: "defense" }
  ]},

  // Additional Uncommon (5)
  { id: 38, name: "マグマ毛根", rarity: "uncommon", element: "fire", description: "溶岩のように熱い毛根", power: 28, speed: 14, grip: 16, emoji: "🌋", color: "#DC2626", evolvesTo: 25, skills: [
    { id: "lava-flow", name: "ラバフロー", description: "溶岩を流す+炎上付与", damage: 30, cooldown: 4, type: "dot", dotEffect: { name: "炎上", damage: 12, duration: 3 } },
    { id: "magma-armor", name: "マグマアーマー", description: "溶岩の鎧", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 39, name: "ウィンド毛根", rarity: "uncommon", element: "wind", description: "風を操る軽やかな毛根", power: 16, speed: 30, grip: 12, emoji: "🌬️", color: "#67E8F9", evolvesTo: 27, skills: [
    { id: "gale-slash", name: "ゲイルスラッシュ", description: "風で切り裂く", damage: 28, cooldown: 2, type: "attack" },
    { id: "wind-barrier", name: "ウィンドバリア", description: "風の壁", damage: 0, cooldown: 3, type: "defense" }
  ]},
  { id: 40, name: "グラビティ毛根", rarity: "uncommon", element: "dark", description: "重力を操る神秘的な毛根", power: 24, speed: 15, grip: 20, emoji: "🔮", color: "#8B5CF6", evolvesTo: 28, skills: [
    { id: "gravity-press", name: "グラビティプレス", description: "重力で押しつぶす", damage: 36, cooldown: 4, type: "attack" },
    { id: "zero-gravity", name: "ゼログラビティ", description: "無重力で回避", damage: 0, cooldown: 4, type: "dodge" }
  ]},
  { id: 41, name: "ポイズン毛根", rarity: "uncommon", element: "dark", description: "毒を持つ危険な毛根", power: 22, speed: 20, grip: 18, emoji: "☠️", color: "#84CC16", evolvesTo: 26, skills: [
    { id: "venom-strike", name: "ヴェノムストライク", description: "毒で攻撃+毒付与", damage: 20, cooldown: 3, type: "dot", dotEffect: { name: "毒", damage: 12, duration: 3 } },
    { id: "toxic-cloud", name: "トキシッククラウド", description: "毒霧で守る", damage: 0, cooldown: 4, type: "special" }
  ]},
  { id: 42, name: "ソニック毛根", rarity: "uncommon", element: "wind", description: "音速を超える高速毛根", power: 18, speed: 32, grip: 10, emoji: "💨", color: "#6366F1", evolvesTo: 22, skills: [
    { id: "sonic-boom", name: "ソニックブーム", description: "音速の衝撃波(最大2体)", damage: 25, cooldown: 3, type: "aoe", maxTargets: 2 },
    { id: "speed-blur", name: "スピードブラー", description: "高速移動で回避", damage: 0, cooldown: 2, type: "dodge" }
  ]},

  // Additional Rare (5)
  { id: 43, name: "オーロラ毛根", rarity: "rare", element: "light", description: "極光を纏う神秘的な毛根", power: 32, speed: 30, grip: 28, emoji: "🌌", color: "#34D399", evolvesTo: 27, skills: [
    { id: "aurora-wave", name: "オーロラウェーブ", description: "極光の波動(最大2体)", damage: 42, cooldown: 4, type: "aoe", maxTargets: 2 },
    { id: "northern-veil", name: "ノーザンヴェール", description: "極光の幕で守る", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 44, name: "ルナ毛根", rarity: "rare", element: "dark", description: "月の力を宿す毛根", power: 28, speed: 35, grip: 30, emoji: "🌙", color: "#E2E8F0", evolvesTo: 29, skills: [
    { id: "lunar-strike", name: "ルナストライク", description: "月光の一撃", damage: 48, cooldown: 4, type: "attack" },
    { id: "moon-blessing", name: "ムーンブレッシング", description: "月の加護で回復", damage: 0, cooldown: 5, type: "special" }
  ]},
  { id: 45, name: "ソーラー毛根", rarity: "rare", element: "light", description: "太陽の力を宿す毛根", power: 40, speed: 28, grip: 25, emoji: "☀️", color: "#FBBF24", evolvesTo: 25, skills: [
    { id: "solar-flare", name: "ソーラーフレア", description: "太陽フレア攻撃", damage: 56, cooldown: 4, type: "attack" },
    { id: "sunlight-heal", name: "サンライトヒール", description: "日光で回復", damage: 0, cooldown: 5, type: "special" }
  ]},
  { id: 46, name: "スピリット毛根", rarity: "rare", element: "divine", description: "精霊の力を持つ毛根", power: 30, speed: 32, grip: 32, emoji: "👻", color: "#A78BFA", evolvesTo: 28, skills: [
    { id: "spirit-lance", name: "スピリットランス", description: "精霊の槍", damage: 50, cooldown: 4, type: "attack" },
    { id: "ethereal-form", name: "エーテルフォーム", description: "霊体化で回避", damage: 0, cooldown: 4, type: "dodge" }
  ]},
  { id: 47, name: "テラ毛根", rarity: "rare", element: "dark", description: "大地の力を持つ毛根", power: 38, speed: 22, grip: 35, emoji: "🏔️", color: "#92400E", evolvesTo: 26, skills: [
    { id: "earthquake", name: "アースクエイク", description: "地震を起こす(最大2体)", damage: 54, cooldown: 5, type: "aoe", maxTargets: 2 },
    { id: "stone-skin", name: "ストーンスキン", description: "石化して防御", damage: 0, cooldown: 5, type: "defense" }
  ]},

  // Additional Epic (3)
  { id: 48, name: "ケルベロス毛根", rarity: "epic", element: "fire", description: "三つ首の地獄の番犬の力を持つ毛根", power: 52, speed: 42, grip: 45, emoji: "🐕", color: "#7C2D12", evolvesTo: 30, skills: [
    { id: "triple-fang", name: "トリプルファング", description: "三連噛みつき攻撃", damage: 98, cooldown: 4, type: "attack" },
    { id: "hellfire-breath", name: "ヘルファイアブレス", description: "地獄の炎で全てを焼く", damage: 0, cooldown: 5, type: "special" }
  ]},
  { id: 49, name: "ヴァルキリー毛根", rarity: "epic", element: "light", description: "戦乙女の力を宿す毛根", power: 48, speed: 50, grip: 42, emoji: "⚔️", color: "#F472B6", evolvesTo: 29, skills: [
    { id: "valkyrie-strike", name: "ヴァルキリーストライク", description: "戦乙女の必殺剣", damage: 95, cooldown: 4, type: "attack" },
    { id: "einherjar", name: "エインヘリャル", description: "勇者の魂で復活、HP60%回復", damage: 0, cooldown: 6, type: "special" }
  ]},
  { id: 50, name: "リヴァイアサン毛根", rarity: "epic", element: "water", description: "海の魔獣の力を持つ毛根", power: 45, speed: 40, grip: 55, emoji: "🐋", color: "#0369A1", evolvesTo: 30, skills: [
    { id: "tidal-wave", name: "タイダルウェーブ", description: "大津波で押し流す(最大3体)", damage: 90, cooldown: 4, type: "aoe", maxTargets: 3 },
    { id: "deep-dive", name: "ディープダイブ", description: "深海に潜り全攻撃回避", damage: 0, cooldown: 5, type: "dodge" }
  ]},

  // Additional Legendary (2)
  { id: 51, name: "オーディン毛根", rarity: "legendary", element: "divine", description: "北欧神話の主神の力を宿す毛根", power: 72, speed: 68, grip: 65, emoji: "🦅", color: "#1E40AF", skills: [
    { id: "gungnir", name: "グングニル", description: "必中の神槍で貫く", damage: 145, cooldown: 4, type: "attack" },
    { id: "all-father", name: "オールファーザー", description: "全知の力で次の攻撃を完全回避+反撃", damage: 0, cooldown: 5, type: "special" },
    { id: "divine-shield", name: "神盾", description: "神聖なる盾で150%防御", damage: 0, cooldown: 5, type: "defense" }
  ]},
  { id: 52, name: "アマテラス毛根", rarity: "legendary", element: "light", description: "太陽神の力を持つ神聖な毛根", power: 68, speed: 70, grip: 70, emoji: "🌸", color: "#F43F5E", skills: [
    { id: "amaterasu-flame", name: "天照の炎", description: "消えない神火で敵を焼く(最大2体)", damage: 155, cooldown: 4, type: "aoe", maxTargets: 2 },
    { id: "divine-light", name: "神光", description: "神聖な光で味方全員HP50%回復", damage: 0, cooldown: 6, type: "team_heal" }
  ]},
] 

// Gacha pool - excludes boss-only hair (id: 53 - ヘアグランド)
export const GACHA_HAIR_ROOTS = HAIR_ROOTS.filter(h => h.id !== 53)

// Evolution requirements: 10 duplicates to evolve
export const EVOLUTION_COST = 10

export const GACHA_RATES: Record<Rarity, number> = {
  common: 0.499,
  uncommon: 0.30,
  rare: 0.14,
  epic: 0.05,
  legendary: 0.01,
  cosmic: 0.001, // 0.1% - extremely rare
}

export function pullGacha(): HairRoot {
  const rand = Math.random()
  let rarity: Rarity

  if (rand < GACHA_RATES.cosmic) {
    rarity = "cosmic"
  } else if (rand < GACHA_RATES.cosmic + GACHA_RATES.legendary) {
    rarity = "legendary"
  } else if (rand < GACHA_RATES.cosmic + GACHA_RATES.legendary + GACHA_RATES.epic) {
    rarity = "epic"
  } else if (rand < GACHA_RATES.cosmic + GACHA_RATES.legendary + GACHA_RATES.epic + GACHA_RATES.rare) {
    rarity = "rare"
  } else if (rand < GACHA_RATES.cosmic + GACHA_RATES.legendary + GACHA_RATES.epic + GACHA_RATES.rare + GACHA_RATES.uncommon) {
    rarity = "uncommon"
  } else {
    rarity = "common"
  }

  const pool = GACHA_HAIR_ROOTS.filter((h) => h.rarity === rarity)
  return pool[Math.floor(Math.random() * pool.length)]
}

export interface CollectedHairRoot extends HairRoot {
  level: number
  exp: number
  count: number
}

export interface GameState {
  coins: number
  collection: CollectedHairRoot[]
  selectedHairRoot: CollectedHairRoot | null
  battleRankPoints: number
  royaleRankPoints: number
  teamRoyaleRankPoints: number
  playerName: string
  playerTitle: string
  bgmEnabled: boolean
  bgmVolume: number
  brightness: number
}

export const INITIAL_GAME_STATE: GameState = {
  coins: 100,
  collection: [],
  selectedHairRoot: null,
  battleRankPoints: 0,
  royaleRankPoints: 0,
  teamRoyaleRankPoints: 0,
  playerName: "毛根マスター",
  playerTitle: "駆け出し育毛士",
  bgmEnabled: true,
  bgmVolume: 0.3,
  brightness: 1,
}

// Boss Hair Root - only obtainable by defeating boss raids
export const BOSS_HAIR_ROOT: HairRoot = {
  id: 53,
  name: "超次元毛根魔王ヘアグランド",
  rarity: "cosmic",
  element: "dark",
  description: "全次元を支配する究極の魔王。超次元の力で全てを従える",
  power: 100,
  speed: 100,
  grip: 100,
  emoji: "👑",
  color: "#FF1493",
  skills: [
    { id: "ancient-chaos", name: "エンシェントカオス", description: "古代の混沌を解放する必殺攻撃。威力150", damage: 150, cooldown: 4, type: "attack" },
    { id: "demon-king-shell", name: "魔王の外郭", description: "魔王の堅牢な外殻で身を守る。防御率90%", damage: 0, cooldown: 3, type: "defense" },
    { id: "absolute-zero", name: "アブソリュートゼロ", description: "全次元領域に絶対零度を撃ち込む。全体に威力100のダメージと全ステータス20%ダウン", damage: 100, cooldown: 5, type: "aoe", maxTargets: 99 }
  ]
}

export const LEVEL_UP_EXP: Record<Rarity, number[]> = {
  common: [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000],
  uncommon: [0, 120, 300, 600, 960, 1440, 2040, 2760, 3600, 4800],
  rare: [0, 150, 375, 750, 1200, 1800, 2550, 3450, 4500, 6000],
  epic: [0, 180, 450, 900, 1440, 2160, 3060, 4140, 5400, 7200],
  legendary: [0, 220, 550, 1100, 1760, 2640, 3740, 5060, 6600, 8800],
  cosmic: [0, 250, 625, 1250, 2000, 3000, 4250, 5750, 7500, 10000],
}

// Rank System
export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "legend"

export interface RankInfo {
  tier: RankTier
  division: number // 1-3 (3 being lowest within tier)
  points: number
  name: string
}

export const RANK_TIERS: { tier: RankTier; name: string; minPoints: number; color: string }[] = [
  { tier: "bronze", name: "ブロンズ", minPoints: 0, color: "#CD7F32" },
  { tier: "silver", name: "シルバー", minPoints: 400, color: "#C0C0C0" },
  { tier: "gold", name: "ゴールド", minPoints: 800, color: "#FFD700" },
  { tier: "platinum", name: "プラチナ", minPoints: 1200, color: "#E5E4E2" },
  { tier: "diamond", name: "ダイヤ", minPoints: 1600, color: "#B9F2FF" },
  { tier: "master", name: "マスター", minPoints: 2000, color: "#9966CC" },
  { tier: "legend", name: "レジェンド", minPoints: 2500, color: "#FF4500" },
]

export function getRankFromPoints(points: number): RankInfo {
  let currentTier = RANK_TIERS[0]
  for (const tier of RANK_TIERS) {
    if (points >= tier.minPoints) {
      currentTier = tier
    }
  }
  
  const tierIndex = RANK_TIERS.findIndex(t => t.tier === currentTier.tier)
  const nextTier = RANK_TIERS[tierIndex + 1]
  const tierRange = nextTier ? nextTier.minPoints - currentTier.minPoints : 500
  const pointsInTier = points - currentTier.minPoints
  const division = Math.max(1, 3 - Math.floor((pointsInTier / tierRange) * 3))
  
  return {
    tier: currentTier.tier,
    division: Math.min(3, division),
    points,
    name: `${currentTier.name} ${["I", "II", "III"][division - 1]}`,
  }
}

export function getRankColor(tier: RankTier): string {
  return RANK_TIERS.find(t => t.tier === tier)?.color || "#CD7F32"
}

export function getRankCoinMultiplier(rank: RankInfo): number {
  const tierIndex = RANK_TIERS.findIndex(t => t.tier === rank.tier)
  if (tierIndex < 0) return 1
  return 1 + tierIndex * 0.1
}

// NPC strength based on rank
export function getNpcStrengthMultiplier(rank: RankInfo): number {
  const tierIndex = RANK_TIERS.findIndex(t => t.tier === rank.tier)
  return 1 + tierIndex * 0.2 + (3 - rank.division) * 0.05
}

// Points gained/lost based on result
export function calculatePointsChange(won: boolean, rank: RankInfo, placement?: number): number {
  const tierIndex = RANK_TIERS.findIndex(t => t.tier === rank.tier)
  const baseGain = Math.max(15, 30 - tierIndex * 3)
  const baseLoss = Math.max(10, 20 - tierIndex * 2)
  
  if (placement !== undefined) {
    // Battle Royale scoring
    if (placement === 1) return baseGain * 2
    if (placement === 2) return Math.floor(baseGain * 1.5)
    if (placement === 3) return baseGain
    if (placement <= 5) return Math.floor(baseGain * 0.5)
    return -baseLoss
  }
  
  return won ? baseGain : -baseLoss
}

export function calculateStats(hairRoot: CollectedHairRoot): { power: number; speed: number; grip: number } {
  const levelBonus = 1 + (hairRoot.level - 1) * 0.15
  return {
    power: Math.floor(hairRoot.power * levelBonus),
    speed: Math.floor(hairRoot.speed * levelBonus),
    grip: Math.floor(hairRoot.grip * levelBonus),
  }
}

// Boss Raid System
export interface BossRaidState {
  isActive: boolean
  bossId: number
  playerTeamHealth: number[]
  bossHealth: number
  currentTurn: number
  log: string[]
  rewards: { coins: number; exp: number; hairRoot?: HairRoot }
}

export const BOSS_HAIR_GRAND: HairRoot = HAIR_ROOTS.find(h => h.id === 53)!

// ボス戦用の独立したスキルセット
export const BOSS_RAID_SKILLS: Skill[] = [
  { id: "normal-attack", name: "通常攻撃", description: "基本的な攻撃", damage: 50, cooldown: 1, type: "attack" },
  { id: "normal-defense", name: "通常防御", description: "基本的な防御態勢", damage: 0, cooldown: 1, type: "defense" },
  { id: "ancient-chaos-raid", name: "エンシェントカオス", description: "古代の混沌を解放する必殺攻撃", damage: 150, cooldown: 4, type: "attack" },
  { id: "demon-king-shell-raid", name: "魔王の外郭", description: "魔王の堅牢な外殻で身を守る", damage: 0, cooldown: 3, type: "defense" },
  { id: "absolute-zero-raid", name: "アブソリュートゼロ", description: "全次元領域に絶対零度を撃ち込み全体にダメージとデバフ", damage: 100, cooldown: 5, type: "aoe", maxTargets: 8 }
]

export const BOSS_RAID_CONFIG = {
  defeatReward: {
    coins: 1000,
    exp: 500,
    hairRoot: BOSS_HAIR_ROOT,
  },
}
export function calculateSkillBonus(hairRoot: CollectedHairRoot): number {
  // Skill effectiveness increases with level and rarity
  // Level bonus: 8% per level
  // Rarity bonus: 1.0 to 1.3 (smaller than normal attack to keep balance)
  const levelBonus = 1 + (hairRoot.level - 1) * 0.08
  const rarityMultiplier: Record<Rarity, number> = {
    common: 1.0,
    uncommon: 1.05,
    rare: 1.1,
    epic: 1.15,
    legendary: 1.2,
    cosmic: 1.3,
  }
  return levelBonus * rarityMultiplier[hairRoot.rarity]
}

// Get rarity bonus multiplier
export function getRarityBonus(rarity: Rarity): number {
  const bonuses: Record<Rarity, number> = {
    common: 1.0,
    uncommon: 1.1,
    rare: 1.2,
    epic: 1.3,
    legendary: 1.4,
    cosmic: 1.5,
  }
  return bonuses[rarity]
}

// Calculate normal attack damage based on level and rarity
export function calculateNormalAttackDamage(hairRoot: CollectedHairRoot): number {
  const baseDamage = 15
  const levelBonus = 1 + (hairRoot.level - 1) * 0.15
  const rarityBonus = getRarityBonus(hairRoot.rarity)
  return Math.floor(baseDamage * levelBonus * rarityBonus)
}

// Calculate normal defense reduction based on level and rarity
export function calculateNormalDefenseReduction(hairRoot: CollectedHairRoot): number {
  const baseReduction = 15
  const levelBonus = 1 + (hairRoot.level - 1) * 0.15
  const rarityBonus = getRarityBonus(hairRoot.rarity)
  return Math.min(60, Math.floor(baseReduction * levelBonus * rarityBonus))
}
