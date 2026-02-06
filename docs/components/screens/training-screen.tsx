"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { RARITY_COLORS, RARITY_NAMES, LEVEL_UP_EXP, calculateStats, type CollectedHairRoot, type Rarity } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Zap, Dumbbell, Sparkles, TrendingUp, ArrowUpDown, Flame, Crown } from "lucide-react"

interface TrainingScreenProps {
  onNavigate: (screen: Screen) => void
}

const trainingMethods = [
  { id: "light", name: "軽いトレーニング", exp: 50, cost: 10, icon: Zap, color: "bg-accent" },
  { id: "normal", name: "普通のトレーニング", exp: 200, cost: 50, icon: Dumbbell, color: "bg-secondary" },
  { id: "hard", name: "ハードトレーニング", exp: 500, cost: 100, icon: Sparkles, color: "bg-primary" },
  { id: "intense", name: "激トレーニング", exp: 2000, cost: 300, icon: Flame, color: "bg-destructive" },
  { id: "god", name: "ゴッドトレーニング", exp: 5000, cost: 500, icon: Crown, color: "bg-yellow-500" },
]

const RARITY_ORDER: Record<Rarity, number> = {
  master: 7,
  cosmic: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
}

type SortType = "level" | "rarity" | "count"
type SortOrder = "asc" | "desc"

export function TrainingScreen({ onNavigate }: TrainingScreenProps) {
  const { collection, coins, trainHairRoot, selectHairRoot, selectedHairRoot, addCoins } = useGame()
  const [selectedId, setSelectedId] = useState<number | null>(selectedHairRoot?.id ?? null)
  const [isTraining, setIsTraining] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [prevLevel, setPrevLevel] = useState(0)
  const [selectedForTraining, setSelectedForTraining] = useState<CollectedHairRoot | null>(null)
  const [sortType, setSortType] = useState<SortType>("level")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  // Always get fresh data from collection
  const currentData = selectedId ? collection.find((h) => h.id === selectedId) : null

  // Sort collection
  const sortedCollection = useMemo(() => {
    const sorted = [...collection]
    sorted.sort((a, b) => {
      let comparison = 0
      if (sortType === "level") {
        comparison = a.level - b.level
      } else if (sortType === "rarity") {
        comparison = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
      } else if (sortType === "count") {
        comparison = a.count - b.count
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
    return sorted
  }, [collection, sortType, sortOrder])

  const toggleSort = (type: SortType) => {
    if (sortType === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortType(type)
      setSortOrder("desc")
    }
  }

  const handleTrain = useCallback(
    async (method: (typeof trainingMethods)[0]) => {
      if (!currentData || coins < method.cost) return

      const currentLevel = currentData.level
      setPrevLevel(currentLevel)
      setIsTraining(true)

      addCoins(-method.cost)

      await new Promise((r) => setTimeout(r, 1000))

      trainHairRoot(currentData.id, method.exp)

      setIsTraining(false)
    },
    [currentData, coins, trainHairRoot, addCoins]
  )

  // Check for level up after collection updates
  const checkLevelUp = useCallback(() => {
    if (currentData && prevLevel > 0 && currentData.level > prevLevel) {
      setShowLevelUp(true)
      setTimeout(() => {
        setShowLevelUp(false)
        setPrevLevel(0)
      }, 2000)
    }
  }, [currentData, prevLevel])

  // Trigger level up check when collection changes
  if (currentData && prevLevel > 0 && currentData.level > prevLevel && !showLevelUp && !isTraining) {
    checkLevelUp()
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">毛根育毛</h1>
          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border border-border">
            <span className="text-sm">🪙</span>
            <span className="font-bold text-secondary text-sm">{coins.toLocaleString()}</span>
          </div>
        </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Selected Hair Root Display */}
        {currentData ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card rounded-2xl p-6 mb-6 border-2"
            style={{ borderColor: RARITY_COLORS[currentData.rarity] }}
          >
            <div className="flex items-center gap-4 mb-4">
              <motion.div
                animate={isTraining ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.5, repeat: isTraining ? Number.POSITIVE_INFINITY : 0 }}
                className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl"
                style={{ backgroundColor: `${currentData.color}30` }}
              >
                {currentData.emoji}
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{currentData.name}</h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: RARITY_COLORS[currentData.rarity] }}
                  >
                    {RARITY_NAMES[currentData.rarity]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-secondary">Lv.{currentData.level}</span>
                  {currentData.level < 10 && (
                    <span className="text-sm text-muted-foreground">/ MAX 10</span>
                  )}
                </div>
              </div>
            </div>

            {/* EXP Bar */}
            {currentData.level < 10 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">経験値</span>
                  <span className="text-foreground">
                    {currentData.exp} / {LEVEL_UP_EXP[currentData.rarity][currentData.level]}
                  </span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-secondary to-primary"
                    animate={{ width: `${(currentData.exp / LEVEL_UP_EXP[currentData.rarity][currentData.level]) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {currentData.level >= 10 && (
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-3 mb-4 text-center">
                <p className="text-primary font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  最大レベルに到達！
                  <Sparkles className="w-5 h-5" />
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {(["power", "speed", "grip"] as const).map((stat) => {
                const stats = calculateStats(currentData)
                const labels = { power: "パワー", speed: "スピード", grip: "グリップ" }
                const icons = { power: "💪", speed: "⚡", grip: "🤝" }
                const colors = { power: "text-primary", speed: "text-secondary", grip: "text-accent" }

                return (
                  <div key={stat} className="bg-muted rounded-xl p-3 text-center">
                    <span className="text-2xl">{icons[stat]}</span>
                    <p className="text-xs text-muted-foreground mt-1">{labels[stat]}</p>
                    <p className={`text-lg font-bold ${colors[stat]}`}>{stats[stat]}</p>
                  </div>
                )
              })}
            </div>
        </motion.div>
        ) : (
          <div className="bg-card rounded-2xl p-8 mb-6 text-center border border-border">
            <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center text-3xl text-muted-foreground">
              ?
            </div>
            <p className="text-muted-foreground">育毛する毛根を選択してください</p>
          </div>
        )}
        {currentData && currentData.level < 10 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              トレーニングメニュー
            </h3>
            {trainingMethods.map((method) => {
              const Icon = method.icon
              const canAfford = coins >= method.cost

              return (
                <motion.button
                  key={method.id}
                  whileHover={{ scale: canAfford ? 1.02 : 1 }}
                  whileTap={{ scale: canAfford ? 0.98 : 1 }}
                  onClick={() => handleTrain(method)}
                  disabled={!canAfford || isTraining}
                  className={`
                    w-full p-4 rounded-xl border transition-all flex items-center gap-4
                    ${canAfford ? "bg-card border-border hover:border-primary" : "bg-muted/50 border-border opacity-50 cursor-not-allowed"}
                  `}
                >
                  <div className={`w-12 h-12 ${method.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{method.name}</p>
                    <p className="text-sm text-muted-foreground">
                      +{method.exp} EXP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-secondary">{method.cost}</p>
                    <p className="text-xs text-muted-foreground">コイン</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Hair Root Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              毛根を選択 ({collection.length}体)
            </h3>
            <div className="flex gap-1">
              <Button
                variant={sortType === "level" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("level")}
                className="text-xs h-7 px-2"
              >
                Lv {sortType === "level" && (sortOrder === "asc" ? "↑" : "↓")}
              </Button>
              <Button
                variant={sortType === "rarity" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("rarity")}
                className="text-xs h-7 px-2"
              >
                レア {sortType === "rarity" && (sortOrder === "asc" ? "↑" : "↓")}
              </Button>
              <Button
                variant={sortType === "count" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("count")}
                className="text-xs h-7 px-2"
              >
                所持 {sortType === "count" && (sortOrder === "asc" ? "↑" : "↓")}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {sortedCollection.map((hairRoot) => (
              <motion.button
                key={hairRoot.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedId(hairRoot.id)
                  selectHairRoot(hairRoot)
                }}
                className={`
                  relative aspect-square rounded-xl border-2 p-2 transition-all
                  ${selectedId === hairRoot.id ? "ring-2 ring-accent" : ""}
                `}
                style={{
                  borderColor: RARITY_COLORS[hairRoot.rarity],
                  backgroundColor: `${RARITY_COLORS[hairRoot.rarity]}10`,
                }}
              >
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <span className="text-2xl mb-1">{hairRoot.emoji}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {hairRoot.name}
                  </span>
                  <span className="absolute bottom-1 right-1 text-xs bg-background/80 px-1 rounded">
                    Lv.{hairRoot.level}
                  </span>
                </div>
              </motion.button>
            ))}
            {collection.length === 0 && (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                <p>まだ毛根がありません</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-transparent"
                  onClick={() => onNavigate("gacha")}
                >
                  ガチャを引く
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center"
            style={{ position: 'fixed', zIndex: 99999 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="text-center px-4"
            >
              {selectedForTraining && (
                <motion.div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center mx-auto mb-4 relative"
                  style={{ 
                    backgroundColor: `${RARITY_COLORS[selectedForTraining.rarity]}40`,
                    borderWidth: 4,
                    borderColor: RARITY_COLORS[selectedForTraining.rarity],
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  <span className="text-6xl">{selectedForTraining.emoji}</span>
                  <motion.div
                    className="absolute -top-4 -right-4"
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <span className="text-4xl">🎉</span>
                  </motion.div>
                </motion.div>
              )}
              <h2 className="text-4xl font-bold text-foreground mb-2">LEVEL UP!</h2>
              {selectedForTraining && (
                <p className="text-lg text-muted-foreground mb-2">{selectedForTraining.name}</p>
              )}
              <p className="text-2xl text-secondary font-bold">
                Lv.{prevLevel} → Lv.{currentData?.level}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Training Animation */}
      <AnimatePresence>
        {isTraining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998] flex items-center justify-center"
            style={{ position: 'fixed' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full"
            />
            <p className="absolute mt-32 text-foreground font-bold">トレーニング中...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
