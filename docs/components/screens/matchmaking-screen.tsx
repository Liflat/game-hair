"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, RARITY_COLORS, RARITY_NAMES, calculateStats, getRankColor, getNpcStrengthMultiplier, type HairRoot } from "@/lib/game-data"
import { Trophy } from "lucide-react"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Users, Wifi, X } from "lucide-react"

interface MatchmakingScreenProps {
  onNavigate: (screen: Screen) => void
  onBattleStart: (opponent: { name: string; hairRoot: HairRoot }) => void
}

const mockOpponents = [
  { name: "毛根ハンター", level: 5 },
  { name: "脱毛マスター", level: 8 },
  { name: "ヘアルート使い", level: 3 },
  { name: "毛穴探検家", level: 6 },
  { name: "フサフサ職人", level: 7 },
  { name: "引き抜きの達人", level: 9 },
  { name: "毛根コレクター", level: 4 },
  { name: "育毛バトラー", level: 2 },
]

export function MatchmakingScreen({ onNavigate, onBattleStart }: MatchmakingScreenProps) {
  const { selectedHairRoot, getBattleRank } = useGame()
  const [isSearching, setIsSearching] = useState(false)
  const [foundOpponent, setFoundOpponent] = useState<{
    name: string
    hairRoot: HairRoot
    rank?: string
  } | null>(null)
  const [nearbyPlayers, setNearbyPlayers] = useState(Math.floor(Math.random() * 50) + 10)
  
  const currentRank = getBattleRank()
  const strengthMultiplier = getNpcStrengthMultiplier(currentRank)

  useEffect(() => {
    const interval = setInterval(() => {
      setNearbyPlayers((prev) => {
        const change = Math.floor(Math.random() * 5) - 2
        return Math.max(5, Math.min(100, prev + change))
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const startSearch = useCallback(() => {
    if (!selectedHairRoot) return
    setIsSearching(true)
    setFoundOpponent(null)

    const searchDuration = 2000 + Math.random() * 3000

    setTimeout(() => {
      const opponent = mockOpponents[Math.floor(Math.random() * mockOpponents.length)]
      
      // Select opponent hair root based on rank - higher rank = better opponents
      const rarityPool: HairRoot[] = []
      HAIR_ROOTS.forEach((hr) => {
        // Weight selection by rank
        if (currentRank.tier === "legend" || currentRank.tier === "master") {
          // High rank - mostly epic/legendary
          if (hr.rarity === "epic" || hr.rarity === "legendary") rarityPool.push(hr, hr, hr)
          else if (hr.rarity === "rare") rarityPool.push(hr, hr)
          else rarityPool.push(hr)
        } else if (currentRank.tier === "diamond" || currentRank.tier === "platinum") {
          // Mid-high rank - mostly rare/epic
          if (hr.rarity === "rare" || hr.rarity === "epic") rarityPool.push(hr, hr, hr)
          else if (hr.rarity === "uncommon") rarityPool.push(hr, hr)
          else rarityPool.push(hr)
        } else if (currentRank.tier === "gold" || currentRank.tier === "silver") {
          // Mid rank - balanced
          if (hr.rarity === "uncommon" || hr.rarity === "rare") rarityPool.push(hr, hr)
          else rarityPool.push(hr)
        } else {
          // Low rank - mostly common/uncommon
          if (hr.rarity === "common" || hr.rarity === "uncommon") rarityPool.push(hr, hr, hr)
          else rarityPool.push(hr)
        }
      })
      
      const baseHairRoot = rarityPool[Math.floor(Math.random() * rarityPool.length)]
      
      // Apply strength multiplier to stats
      const scaledHairRoot: HairRoot = {
        ...baseHairRoot,
        power: Math.floor(baseHairRoot.power * strengthMultiplier),
        speed: Math.floor(baseHairRoot.speed * strengthMultiplier),
        grip: Math.floor(baseHairRoot.grip * strengthMultiplier),
      }

      setFoundOpponent({
        name: opponent.name,
        hairRoot: scaledHairRoot,
        rank: currentRank.name,
      })
      setIsSearching(false)
    }, searchDuration)
  }, [selectedHairRoot, currentRank, strengthMultiplier])

  const cancelSearch = useCallback(() => {
    setIsSearching(false)
    setFoundOpponent(null)
  }, [])

  const handleBattleStart = useCallback(() => {
    if (foundOpponent) {
      onBattleStart(foundOpponent)
    }
  }, [foundOpponent, onBattleStart])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">対戦マッチング</h1>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Trophy className="w-4 h-4" style={{ color: getRankColor(currentRank.tier) }} />
            <span className="text-sm font-medium" style={{ color: getRankColor(currentRank.tier) }}>
              {currentRank.name}
            </span>
            <span className="text-xs text-muted-foreground ml-1">({currentRank.points} RP)</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-accent">
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">{nearbyPlayers}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* My Hair Root */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full max-w-sm mb-8"
        >
          <h3 className="text-sm text-muted-foreground mb-2 text-center">あなたの毛根</h3>
          {selectedHairRoot ? (
            <div
              className="bg-card rounded-2xl p-4 border-2"
              style={{ borderColor: RARITY_COLORS[selectedHairRoot.rarity] }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${selectedHairRoot.color}30` }}
                >
                  {selectedHairRoot.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{selectedHairRoot.name}</p>
                  <p className="text-sm" style={{ color: RARITY_COLORS[selectedHairRoot.rarity] }}>
                    {RARITY_NAMES[selectedHairRoot.rarity]} Lv.{selectedHairRoot.level}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {(["power", "speed", "grip"] as const).map((stat) => {
                      const stats = calculateStats(selectedHairRoot)
                      const labels = { power: "力", speed: "速", grip: "握" }
                      return (
                        <span key={stat} className="text-xs text-muted-foreground">
                          {labels[stat]}:{stats[stat]}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl p-6 border border-border text-center">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center text-2xl text-muted-foreground">
                ?
              </div>
              <p className="text-muted-foreground mb-2">毛根を選択してください</p>
              <Button variant="outline" size="sm" onClick={() => onNavigate("collection")}>
                選択する
              </Button>
            </div>
          )}
        </motion.div>

        {/* VS Indicator / Search Animation */}
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="searching"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="relative mb-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                className="absolute inset-0 rounded-full border-2 border-primary"
              />
            </motion.div>
          ) : foundOpponent ? (
            <motion.div
              key="vs"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mb-8"
            >
              <span className="text-2xl font-black text-white">VS</span>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-8 text-muted-foreground"
            >
              <Wifi className="w-5 h-5" />
              <span>対戦相手を探しています...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Opponent */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full max-w-sm mb-8"
        >
          <h3 className="text-sm text-muted-foreground mb-2 text-center">対戦相手</h3>
          <AnimatePresence mode="wait">
            {foundOpponent ? (
              <motion.div
                key="opponent"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-card rounded-2xl p-4 border-2"
                style={{ borderColor: RARITY_COLORS[foundOpponent.hairRoot.rarity] }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: `${foundOpponent.hairRoot.color}30` }}
                  >
                    {foundOpponent.hairRoot.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{foundOpponent.name}</p>
                    <p className="text-sm" style={{ color: RARITY_COLORS[foundOpponent.hairRoot.rarity] }}>
                      {foundOpponent.hairRoot.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {RARITY_NAMES[foundOpponent.hairRoot.rarity]}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card rounded-2xl p-6 border border-dashed border-border text-center"
              >
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="w-16 h-16 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center"
                >
                  <Search className="w-8 h-8 text-muted-foreground" />
                </motion.div>
                <p className="text-muted-foreground">
                  {isSearching ? "マッチング中..." : "対戦相手を検索"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Actions */}
        <div className="w-full max-w-sm space-y-3">
          {!isSearching && !foundOpponent && (
            <Button
              onClick={startSearch}
              disabled={!selectedHairRoot}
              className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
            >
              <Search className="w-5 h-5 mr-2" />
              対戦相手を探す
            </Button>
          )}

          {isSearching && (
            <Button onClick={cancelSearch} variant="outline" className="w-full h-14 text-lg bg-transparent">
              <X className="w-5 h-5 mr-2" />
              キャンセル
            </Button>
          )}

          {foundOpponent && (
            <div className="flex gap-3">
              <Button
                onClick={cancelSearch}
                variant="outline"
                className="flex-1 h-14 bg-transparent"
              >
                やめる
              </Button>
              <Button
                onClick={handleBattleStart}
                className="flex-1 h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                バトル開始！
              </Button>
            </div>
          )}
        </div>

        {/* Tips */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-muted-foreground max-w-xs"
        >
          <p>毛根を絡め合って引っ張り合う対戦！</p>
          <p>パワー・スピード・グリップのバランスが勝敗を決める！</p>
        </motion.div>
      </div>
    </div>
  )
}
