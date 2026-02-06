"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, RARITY_COLORS, RARITY_NAMES, calculateStats, EVOLUTION_COST, ELEMENT_NAMES, ELEMENT_COLORS, type Rarity, type CollectedHairRoot } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, X, Filter } from "lucide-react"

const RARITY_ORDER: Record<Rarity, number> = {
  cosmic: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
}

type SortType = "id" | "level" | "rarity" | "count"
type SortOrder = "asc" | "desc"

interface CollectionScreenProps {
  onNavigate: (screen: Screen) => void
}

const rarityFilters: (Rarity | "all")[] = ["all", "common", "uncommon", "rare", "epic", "legendary", "cosmic"]

export function CollectionScreen({ onNavigate }: CollectionScreenProps) {
  const { collection, selectHairRoot, selectedHairRoot, evolveHairRoot, canEvolve } = useGame()
  const [filter, setFilter] = useState<Rarity | "all">("all")
  const [selectedDetail, setSelectedDetail] = useState<CollectedHairRoot | null>(null)
  const [showEvolution, setShowEvolution] = useState(false)
  const [evolvedResult, setEvolvedResult] = useState<CollectedHairRoot | null>(null)
  const [sortType, setSortType] = useState<SortType>("id")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const collectedIds = new Set(collection.map((h) => h.id))

  const toggleSort = (type: SortType) => {
    if (sortType === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortType(type)
      setSortOrder("asc")
    }
  }

  const filteredAndSortedHairRoots = useMemo(() => {
    const filtered = HAIR_ROOTS.filter((h) => filter === "all" || h.rarity === filter)
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      const aCollected = collection.find(c => c.id === a.id)
      const bCollected = collection.find(c => c.id === b.id)
      
      let comparison = 0
      if (sortType === "id") {
        comparison = a.id - b.id
      } else if (sortType === "level") {
        const aLevel = aCollected?.level || 0
        const bLevel = bCollected?.level || 0
        comparison = aLevel - bLevel
      } else if (sortType === "rarity") {
        comparison = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
      } else if (sortType === "count") {
        const aCount = aCollected?.count || 0
        const bCount = bCollected?.count || 0
        comparison = aCount - bCount
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
    return sorted
  }, [filter, collection, sortType, sortOrder])

  const collectionProgress = {
    total: HAIR_ROOTS.length,
    collected: collection.length,
    byRarity: (["common", "uncommon", "rare", "epic", "legendary", "cosmic"] as Rarity[]).map((rarity) => ({
      rarity,
      total: HAIR_ROOTS.filter((h) => h.rarity === rarity).length,
      collected: collection.filter((h) => h.rarity === rarity).length,
    })),
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">毛根コレクション</h1>
        <div className="text-sm text-muted-foreground">
          {collectionProgress.collected} / {collectionProgress.total}
        </div>
      </header>

      {/* Progress Section */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">コンプリート進捗</span>
          <span className="text-sm font-bold text-foreground">
            {Math.round((collectionProgress.collected / collectionProgress.total) * 100)}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${(collectionProgress.collected / collectionProgress.total) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {collectionProgress.byRarity.map(({ rarity, total, collected }) => (
            <div key={rarity} className="text-center">
              <div
                className="w-5 h-5 rounded-full mx-auto mb-1"
                style={{ backgroundColor: RARITY_COLORS[rarity] }}
              />
              <p className="text-[10px] text-muted-foreground">
                {collected}/{total}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2 overflow-x-auto mb-2">
          <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          {rarityFilters.map((r) => (
          <Button
            key={r}
            variant={filter === r ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(r)}
            className="flex-shrink-0"
            style={
              filter === r && r !== "all"
                ? { backgroundColor: RARITY_COLORS[r], borderColor: RARITY_COLORS[r] }
                : {}
            }
          >
            {r === "all" ? "すべて" : RARITY_NAMES[r]}
          </Button>
        ))}
        </div>
        <div className="flex gap-1 justify-end">
          <Button
            variant={sortType === "id" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("id")}
            className="text-xs h-7 px-2"
          >
            ID {sortType === "id" && (sortOrder === "asc" ? "↑" : "↓")}
          </Button>
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

      {/* Collection Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          {filteredAndSortedHairRoots.map((hairRoot, index) => {
            const collected = collection.find((h) => h.id === hairRoot.id)
            const isCollected = collectedIds.has(hairRoot.id)

            return (
              <motion.button
                key={hairRoot.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => isCollected && collected && setSelectedDetail(collected)}
                disabled={!isCollected}
                className={`
                  relative aspect-square rounded-xl border-2 p-2 transition-all
                  ${
                    isCollected
                      ? "bg-card cursor-pointer hover:scale-105 active:scale-95"
                      : "bg-muted/50 cursor-not-allowed opacity-50"
                  }
                `}
                style={{
                  borderColor: isCollected ? RARITY_COLORS[hairRoot.rarity] : "transparent",
                }}
              >
                <div className="absolute top-1 right-1 w-3 h-3 rounded-full" style={{ backgroundColor: RARITY_COLORS[hairRoot.rarity] }} />
                
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {isCollected ? (
                    <>
                      <span className="text-2xl md:text-3xl mb-1">{hairRoot.emoji}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">
                        {hairRoot.name}
                      </span>
                      {collected && collected.count > 1 && (
                        <span className="absolute bottom-1 right-1 text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                          {collected.count}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl text-muted-foreground">?</span>
                      <span className="text-[10px] text-muted-foreground">???</span>
                    </>
                  )}
                </div>

                {selectedHairRoot?.id === hairRoot.id && (
                  <motion.div
                    layoutId="selected-indicator"
                    className="absolute inset-0 border-4 border-accent rounded-xl pointer-events-none"
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl max-w-sm w-full border-2 flex flex-col"
              style={{ borderColor: RARITY_COLORS[selectedDetail.rarity], maxHeight: "85vh" }}
            >
              <div className="flex justify-between items-start p-6 pb-4 flex-shrink-0">
                <div
                  className="px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: RARITY_COLORS[selectedDetail.rarity] }}
                >
                  {RARITY_NAMES[selectedDetail.rarity]}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDetail(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                <div
                  className="w-24 h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                  style={{ backgroundColor: `${selectedDetail.color}30` }}
                >
                  {selectedDetail.emoji}
                </div>

                <h2 className="text-2xl font-bold text-foreground text-center mb-1">
                  {selectedDetail.name}
                </h2>
                {(() => {
                  // Get element from the hair root, fallback to HAIR_ROOTS if not present (old data)
                  const element = selectedDetail.element || HAIR_ROOTS.find(h => h.id === selectedDetail.id)?.element
                  if (!element) return null
                  return (
                    <div className="flex justify-center mb-2">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: ELEMENT_COLORS[element] }}
                      >
                        {ELEMENT_NAMES[element]}属性
                      </span>
                    </div>
                  )
                })()}
                <p className="text-center text-muted-foreground text-sm mb-4">
                  {selectedDetail.description}
                </p>

                <div className="bg-muted rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">レベル</span>
                    <span className="font-bold text-foreground">Lv.{selectedDetail.level}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">所持数</span>
                    <span className="font-bold text-foreground">{selectedDetail.count}</span>
                  </div>

                  <div className="space-y-2 mt-4">
                    {(["power", "speed", "grip"] as const).map((stat) => {
                      const stats = calculateStats(selectedDetail)
                      const labels = { power: "パワー", speed: "スピード", grip: "グリップ" }
                      const colors = { power: "bg-primary", speed: "bg-secondary", grip: "bg-accent" }
                      return (
                        <div key={stat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{labels[stat]}</span>
                            <span className="text-foreground font-medium">{stats[stat]}</span>
                          </div>
                          <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[stat]} transition-all duration-500`}
                              style={{ width: `${Math.min(stats[stat], 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Evolution Bonus Display */}
                {(selectedDetail.evolutionBonus || selectedDetail.skillBonus) && (
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-4 border border-primary/20">
                    <h3 className="text-sm font-medium text-foreground mb-2">進化ボーナス</h3>
                    <div className="flex gap-4 text-xs">
                      {selectedDetail.evolutionBonus && selectedDetail.evolutionBonus > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">ステータス:</span>
                          <span className="text-primary font-bold">+{selectedDetail.evolutionBonus * 5}%</span>
                        </div>
                      )}
                      {selectedDetail.skillBonus && selectedDetail.skillBonus > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">スキル威力:</span>
                          <span className="text-secondary font-bold">+{selectedDetail.skillBonus * 10}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills Section */}
                <div className="bg-muted rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">スキル</h3>
                  <div className="space-y-2">
                    {selectedDetail.skills.map((skill) => {
                      const skillMultiplier = 1 + (selectedDetail.skillBonus || 0) * 0.10
                      const boostedDamage = Math.floor(skill.damage * skillMultiplier)
                      return (
                        <div key={skill.id} className="bg-background rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground text-sm">{skill.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                              {skill.type === "attack" ? "攻撃" : skill.type === "defense" ? "防御" : "特殊"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{skill.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {skill.damage > 0 && (
                              <span>
                                威力: {boostedDamage}
                                {selectedDetail.skillBonus && selectedDetail.skillBonus > 0 && (
                                  <span className="text-secondary ml-1">(+{boostedDamage - skill.damage})</span>
                                )}
                              </span>
                            )}
                            <span>CT: {skill.cooldown}ターン</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Evolution Section */}
                {HAIR_ROOTS.find((h) => h.id === selectedDetail.id)?.evolvesTo && (
                  <div className="bg-gradient-to-r from-secondary/20 to-primary/20 rounded-xl p-4 mb-4 border border-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">進化</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedDetail.count} / {EVOLUTION_COST}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-secondary to-primary transition-all"
                        style={{ width: `${Math.min((selectedDetail.count / EVOLUTION_COST) * 100, 100)}%` }}
                      />
                    </div>
                    {canEvolve(selectedDetail.id) ? (
                      <Button
                        className="w-full bg-gradient-to-r from-secondary to-primary hover:opacity-90"
                        onClick={() => {
                          const result = evolveHairRoot(selectedDetail.id)
                          if (result) {
                            setEvolvedResult(result)
                            setShowEvolution(true)
                            setSelectedDetail(null)
                          }
                        }}
                      >
                        進化させる
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">
                        同じ毛根を{EVOLUTION_COST}個集めると進化できます
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setSelectedDetail(null)}
                  >
                    閉じる
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      selectHairRoot(selectedDetail)
                      setSelectedDetail(null)
                    }}
                  >
                    {selectedHairRoot?.id === selectedDetail.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        選択中
                      </>
                    ) : (
                      "選択する"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evolution Animation Modal */}
      <AnimatePresence>
        {showEvolution && evolvedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="w-40 h-40 mx-auto mb-6 rounded-full flex items-center justify-center text-7xl"
                style={{ 
                  backgroundColor: `${RARITY_COLORS[evolvedResult.rarity]}30`,
                  boxShadow: `0 0 60px ${RARITY_COLORS[evolvedResult.rarity]}60`
                }}
              >
                {evolvedResult.emoji}
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold mb-2"
                style={{ color: RARITY_COLORS[evolvedResult.rarity] }}
              >
                進化成功!
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                {evolvedResult.name}
              </motion.p>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-sm mb-6"
                style={{ color: RARITY_COLORS[evolvedResult.rarity] }}
              >
                {RARITY_NAMES[evolvedResult.rarity]}
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <Button
                  onClick={() => {
                    setShowEvolution(false)
                    setEvolvedResult(null)
                  }}
                  className="bg-primary hover:bg-primary/90 px-8"
                >
                  OK
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
