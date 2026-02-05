"use client"

import { motion } from "framer-motion"
import { useGame } from "@/lib/game-context"
import type { Screen } from "@/lib/screens"

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void
}

const menuItems = [
  { id: "gacha" as const, label: "ガチャ", icon: "🎰", description: "毛根を引き抜こう", color: "from-primary to-rose-600" },
  { id: "collection" as const, label: "コレクション", icon: "📦", description: "毛根図鑑", color: "from-secondary to-amber-600" },
  { id: "training" as const, label: "育成", icon: "💪", description: "毛根を育てよう", color: "from-accent to-emerald-600" },
  { id: "matchmaking" as const, label: "1vs1対戦", icon: "⚔️", description: "バトルに挑戦", color: "from-blue-500 to-indigo-600" },
  { id: "battle-royale" as const, label: "ソロバトロワ", icon: "👑", description: "8人で最強決定戦", color: "from-purple-500 to-pink-600" },
  { id: "team-royale" as const, label: "チームバトロワ", icon: "👥", description: "4チーム対抗戦", color: "from-cyan-500 to-teal-600" },
  { id: "boss-raid" as const, label: "魔王討伐", icon: "😈", description: "ヘアグランドに挑戦", color: "from-red-600 to-rose-900" },
  { id: "ranking" as const, label: "ランキング", icon: "🏆", description: "順位を確認", color: "from-amber-500 to-orange-600" },
  { id: "tutorial" as const, label: "チュートリアル", icon: "❓", description: "各機能の説明", color: "from-slate-500 to-slate-700" },
]

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { coins, collection, selectedHairRoot, playerName, playerTitle } = useGame()

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between mb-6"
      >
        <button 
          onClick={() => onNavigate("profile")}
          className="text-left hover:opacity-80 transition-opacity"
        >
          <h1 className="text-2xl font-bold text-foreground">毛根伝説</h1>
          <p className="text-sm text-muted-foreground">
            {playerName} - {playerTitle}
          </p>
        </button>
        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border">
          <span className="text-xl">🪙</span>
          <span className="font-bold text-secondary">{coins.toLocaleString()}</span>
        </div>
      </motion.header>

      {/* Selected Hair Root Display */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-6 mb-6 border border-border"
      >
        <h2 className="text-sm text-muted-foreground mb-2">選択中の毛根</h2>
        {selectedHairRoot ? (
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${selectedHairRoot.color}20` }}
            >
              {selectedHairRoot.emoji}
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{selectedHairRoot.name}</p>
              <p className="text-sm text-muted-foreground">Lv.{selectedHairRoot.level}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  力 {selectedHairRoot.power}
                </span>
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded">
                  速 {selectedHairRoot.speed}
                </span>
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                  握 {selectedHairRoot.grip}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl">
              ?
            </div>
            <div>
              <p className="font-medium">毛根を選択してください</p>
              <p className="text-sm">コレクションから選んでね</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            onClick={() => onNavigate(item.id)}
            className={`
              relative overflow-hidden rounded-2xl p-6 text-left
              bg-gradient-to-br ${item.color} text-white
              active:scale-95 transition-transform
              ${item.id === "gacha" ? "col-span-2" : ""}
            `}
          >
            <div className="absolute top-2 right-2 text-4xl opacity-30">
              {item.icon}
            </div>
            <span className="text-4xl mb-2 block">{item.icon}</span>
            <h3 className="text-xl font-bold">{item.label}</h3>
            <p className="text-sm opacity-80">{item.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
