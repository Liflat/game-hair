"use client"

import { motion } from "framer-motion"
import { BOSS_HAIR_ROOTS, RARITY_COLORS, RARITY_NAMES, ELEMENT_NAMES, ELEMENT_COLORS, type HairRoot } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Crown, Flame, Sparkles, Swords, Shield } from "lucide-react"
import { useState } from "react"

interface BossSelectScreenProps {
  onNavigate: (screen: Screen, bossId?: number) => void
}

const BOSS_INFO = [
  {
    id: 53,
    difficulty: "★★★☆☆",
    difficultyColor: "text-yellow-500",
    recommendedLevel: "Lv.5以上のチーム",
    description: "超次元を支配する闇の魔王。全次元の力を使いこなす",
  },
  {
    id: 54,
    difficulty: "★★★★☆",
    difficultyColor: "text-orange-500",
    recommendedLevel: "Lv.7以上のチーム",
    description: "終焉を司る恐怖の皇帝。灼熱の業火で全てを焼き尽くす",
  },
  {
    id: 55,
    difficulty: "★★★★★",
    difficultyColor: "text-red-500",
    recommendedLevel: "Lv.10のチーム推奨",
    description: "真理を司る究極存在。全ての理を超越し絶対なる力を振るう",
  },
]

export function BossSelectScreen({ onNavigate }: BossSelectScreenProps) {
  const [selectedBoss, setSelectedBoss] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">ボス選択</h1>
          <p className="text-xs text-muted-foreground">挑戦するボスを選んでください</p>
        </div>
        <div className="w-10" />
      </header>

      {/* Boss Selection */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {BOSS_HAIR_ROOTS.map((boss, index) => {
          const info = BOSS_INFO[index]
          const isSelected = selectedBoss === boss.id

          return (
            <motion.div
              key={boss.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedBoss(boss.id)}
              className={`
                relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all
                ${isSelected ? "ring-4 ring-primary scale-[1.02]" : ""}
              `}
              style={{
                background: `linear-gradient(135deg, ${boss.color}20 0%, ${boss.color}40 100%)`,
                borderWidth: 3,
                borderStyle: "solid",
                borderColor: RARITY_COLORS[boss.rarity],
              }}
            >
              {/* Background Icon */}
              <div 
                className="absolute top-4 right-4 text-8xl opacity-10"
                style={{ filter: 'blur(2px)' }}
              >
                {boss.emoji}
              </div>

              {/* Boss Info */}
              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl shadow-lg"
                    style={{ backgroundColor: `${boss.color}40` }}
                  >
                    {boss.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      <h2 className="text-2xl font-bold text-foreground">{boss.name}</h2>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs px-3 py-1 rounded-full text-white font-medium"
                        style={{ backgroundColor: RARITY_COLORS[boss.rarity] }}
                      >
                        {RARITY_NAMES[boss.rarity]}
                      </span>
                      {boss.element && (
                        <span
                          className="text-xs px-3 py-1 rounded-full text-white font-medium"
                          style={{ backgroundColor: ELEMENT_COLORS[boss.element] }}
                        >
                          {ELEMENT_NAMES[boss.element]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 mb-2">{boss.description}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">💪</div>
                    <p className="text-xs text-muted-foreground mb-1">パワー</p>
                    <p className="text-lg font-bold text-primary">{boss.power}</p>
                  </div>
                  <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">⚡</div>
                    <p className="text-xs text-muted-foreground mb-1">スピード</p>
                    <p className="text-lg font-bold text-secondary">{boss.speed}</p>
                  </div>
                  <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🤝</div>
                    <p className="text-xs text-muted-foreground mb-1">グリップ</p>
                    <p className="text-lg font-bold text-accent">{boss.grip}</p>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">難易度:</span>
                    <span className={`text-lg font-bold ${info.difficultyColor}`}>
                      {info.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{info.recommendedLevel}</p>
                </div>

                {/* Skills Preview */}
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">スキル:</p>
                  <div className="space-y-1">
                    {boss.skills.slice(0, 3).map((skill) => (
                      <div key={skill.id} className="flex items-center gap-2">
                        {skill.type === "attack" || skill.type === "aoe" ? (
                          <Swords className="w-3 h-3 text-primary" />
                        ) : skill.type === "defense" ? (
                          <Shield className="w-3 h-3 text-secondary" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-accent" />
                        )}
                        <span className="text-xs text-foreground">{skill.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Action Button */}
      {selectedBoss !== null && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 bg-card border-t border-border"
        >
          <Button
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-secondary"
            onClick={() => onNavigate("boss-raid", selectedBoss)}
          >
            <Crown className="w-5 h-5 mr-2" />
            このボスに挑戦する
          </Button>
        </motion.div>
      )}
    </div>
  )
}
