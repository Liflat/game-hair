"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { RARITY_COLORS, RARITY_NAMES, GACHA_HAIR_ROOTS, calculateStats, ELEMENT_NAMES, ELEMENT_COLORS, type CollectedHairRoot, type HairRoot } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Coins } from "lucide-react"
import { addCoins } from "@/lib/game-utils" // Import addCoins function

interface GachaScreenProps {
  onNavigate: (screen: Screen) => void
}

type GachaState = "idle" | "pulling" | "revealing" | "result"

export function GachaScreen({ onNavigate }: GachaScreenProps) {
  const { coins, pullSingle, pullTen, selectHairRoot, selectedHairRoot } = useGame()
  const [gachaState, setGachaState] = useState<GachaState>("idle")
  const [results, setResults] = useState<CollectedHairRoot[]>([])
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0)
  const [showLegendaryAnimation, setShowLegendaryAnimation] = useState(false)
  const [legendaryResult, setLegendaryResult] = useState<CollectedHairRoot | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CollectedHairRoot | null>(null)
  const [pickupDetail, setPickupDetail] = useState<HairRoot | null>(null)
  
  // Get legendary and cosmic hair roots for pickup display (excluding boss-only)
  const pickupHairRoots = GACHA_HAIR_ROOTS.filter(hr => hr.rarity === "legendary" || hr.rarity === "cosmic")

  const handlePull = useCallback(
    async (type: "single" | "ten") => {
      setGachaState("pulling")
      setResults([])
      setCurrentRevealIndex(0)

      await new Promise((r) => setTimeout(r, 1500))

      const pulled = type === "single" ? [pullSingle()].filter(Boolean) : pullTen()
      if (pulled.length === 0) {
        setGachaState("idle")
        return
      }

      setResults(pulled as CollectedHairRoot[])
      
      // Check for cosmic or legendary - cosmic takes priority
      const cosmicPull = pulled.find((p) => p?.rarity === "cosmic")
      const legendaryPull = pulled.find((p) => p?.rarity === "legendary")
      if (cosmicPull) {
        setLegendaryResult(cosmicPull as CollectedHairRoot)
        setShowLegendaryAnimation(true)
        await new Promise((r) => setTimeout(r, 7000)) // Longer animation for cosmic
        setShowLegendaryAnimation(false)
      } else if (legendaryPull) {
        setLegendaryResult(legendaryPull as CollectedHairRoot)
        setShowLegendaryAnimation(true)
        await new Promise((r) => setTimeout(r, 5000))
        setShowLegendaryAnimation(false)
      }
      
      setGachaState("revealing")

      for (let i = 0; i < pulled.length; i++) {
        await new Promise((r) => setTimeout(r, 300))
        setCurrentRevealIndex(i + 1)
      }

      setGachaState("result")
    },
    [pullSingle, pullTen]
  )

  const handleClose = () => {
    setGachaState("idle")
    setResults([])
    setCurrentRevealIndex(0)
    setLegendaryResult(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">脱毛ガチャ</h1>
        <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border border-border">
          <Coins className="w-4 h-4 text-secondary" />
          <span className="font-bold text-secondary">{coins.toLocaleString()}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {gachaState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md"
            >
              {/* Gacha Machine */}
              <div className="relative mb-8">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="w-64 h-64 mx-auto bg-gradient-to-b from-card to-muted rounded-3xl border-4 border-primary shadow-2xl flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-2">
                      <svg viewBox="0 0 80 80" className="w-24 h-24 mx-auto">
                        <circle cx="40" cy="30" r="20" className="fill-secondary/20" />
                        <path
                          d="M40 50 Q40 60 40 70 Q30 75 40 78 Q50 75 40 70"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-foreground"
                        />
                        <circle cx="40" cy="78" r="5" className="fill-primary" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-sm">毛根を引き抜こう！</p>
                  </div>
                </motion.div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-secondary rounded-full animate-pulse" />
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary rounded-full animate-pulse delay-100" />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-accent rounded-full animate-pulse delay-200" />
              </div>

{/* Pickup Section */}
              <div className="bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-amber-500/10 rounded-xl p-4 mb-4 border border-amber-500/30">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-amber-500">PICKUP</span>
                  <span className="text-xs text-muted-foreground">レジェンド・コズミック</span>
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pickupHairRoots.map((hr) => (
                    <motion.button
                      key={hr.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPickupDetail(hr)}
                      className="flex-shrink-0 w-20 bg-card rounded-lg p-2 border-2 text-center"
                      style={{ borderColor: RARITY_COLORS[hr.rarity] }}
                    >
                      <div 
                        className="text-2xl mb-1 w-10 h-10 mx-auto rounded-full flex items-center justify-center relative"
                        style={{ backgroundColor: `${RARITY_COLORS[hr.rarity]}20` }}
                      >
                        {hr.emoji}
                        {hr.element && (
                          <span 
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: ELEMENT_COLORS[hr.element] }}
                          >
                            {ELEMENT_NAMES[hr.element][0]}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-foreground truncate">{hr.name}</p>
                      <p className="text-[8px]" style={{ color: RARITY_COLORS[hr.rarity] }}>
                        {RARITY_NAMES[hr.rarity]}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>

{/* Rates Info */}
  <div className="bg-card rounded-xl p-4 mb-6 border border-border">
  <h3 className="text-sm font-medium text-foreground mb-2">排出確率</h3>
  <div className="grid grid-cols-6 gap-1.5 text-xs">
  {(["common", "uncommon", "rare", "epic", "legendary", "cosmic"] as const).map((rarity) => (
  <div key={rarity} className="text-center">
  <div
  className="w-4 h-4 rounded-full mx-auto mb-1"
  style={{ backgroundColor: RARITY_COLORS[rarity] }}
  />
  <p className="text-muted-foreground text-[10px]">{rarity === "common" ? "N" : rarity === "cosmic" ? "CH" : RARITY_NAMES[rarity].charAt(0) + "H"}</p>
  <p className="font-bold text-[10px]" style={{ color: RARITY_COLORS[rarity] }}>
  {rarity === "common" && "49.9%"}
  {rarity === "uncommon" && "30%"}
  {rarity === "rare" && "14%"}
  {rarity === "epic" && "5%"}
  {rarity === "legendary" && "1%"}
  {rarity === "cosmic" && "0.1%"}
  </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pull Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={() => handlePull("single")}
                  disabled={coins < 50}
                  className="flex-1 h-16 text-lg bg-primary hover:bg-primary/90"
                >
                  <div className="text-center">
                    <p className="font-bold">単発</p>
                    <p className="text-xs opacity-80">50 コイン</p>
                  </div>
                </Button>
                <Button
                  onClick={() => handlePull("ten")}
                  disabled={coins < 500}
                  className="flex-1 h-16 text-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  <div className="text-center">
                    <p className="font-bold">10連</p>
                    <p className="text-xs opacity-80">500 コイン</p>
                  </div>
                </Button>
              </div>


            </motion.div>
          )}

          {gachaState === "pulling" && !showLegendaryAnimation && (
            <motion.div
              key="pulling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                className="w-40 h-40 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-6xl text-white">?</span>
              </motion.div>
              <p className="text-xl font-bold text-foreground">引き抜き中...</p>
              <motion.div
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 1.5 }}
                className="h-2 bg-primary rounded-full mt-4 mx-auto max-w-xs"
              />
            </motion.div>
          )}

          {/* Legendary/Cosmic Animation */}
          {showLegendaryAnimation && legendaryResult && (
            <motion.div
              key="legendary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: legendaryResult.rarity === "cosmic" ? "#0a0015" : "#000" }}
            >
              {/* Background burst rays */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: legendaryResult.rarity === "cosmic" ? 10 : 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {[...Array(legendaryResult.rarity === "cosmic" ? 36 : 24)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: [0, 1, 0.5], scaleY: [0, 1, 1] }}
                    transition={{ delay: i * 0.05, duration: 1 }}
                    className="absolute h-[200vh] w-4"
                    style={{
                      background: legendaryResult.rarity === "cosmic" 
                        ? `linear-gradient(to top, transparent, ${RARITY_COLORS.cosmic}80, #FFD700, ${RARITY_COLORS.cosmic}80, transparent)`
                        : `linear-gradient(to top, transparent, ${RARITY_COLORS.legendary}80, ${RARITY_COLORS.legendary}, ${RARITY_COLORS.legendary}80, transparent)`,
                      transform: `rotate(${i * (legendaryResult.rarity === "cosmic" ? 10 : 15)}deg)`,
                      transformOrigin: "center center",
                    }}
                  />
                ))}
              </motion.div>

              {/* Cosmic lightning effect */}
              {legendaryResult.rarity === "cosmic" && [...Array(8)].map((_, i) => (
                <motion.div
                  key={`lightning-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.2, delay: 1 + i * 0.3, repeat: 3 }}
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(ellipse at ${20 + Math.random() * 60}% ${20 + Math.random() * 60}%, rgba(255,215,0,0.4) 0%, transparent 50%)`,
                  }}
                />
              ))}

              {/* Particle explosion */}
              {[...Array(legendaryResult.rarity === "cosmic" ? 80 : 50)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  initial={{ 
                    x: 0, y: 0, scale: 0, opacity: 1 
                  }}
                  animate={{ 
                    x: (Math.random() - 0.5) * (legendaryResult.rarity === "cosmic" ? 1200 : 800),
                    y: (Math.random() - 0.5) * (legendaryResult.rarity === "cosmic" ? 1200 : 800),
                    scale: [0, legendaryResult.rarity === "cosmic" ? 1.5 : 1, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: legendaryResult.rarity === "cosmic" ? 4 : 3, delay: 0.5 + Math.random() * 0.5 }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: legendaryResult.rarity === "cosmic"
                      ? i % 4 === 0 ? RARITY_COLORS.cosmic : i % 4 === 1 ? "#FFD700" : i % 4 === 2 ? "#fff" : "#00BFFF"
                      : i % 3 === 0 ? RARITY_COLORS.legendary : i % 3 === 1 ? "#fff" : "#FFD700",
                  }}
                />
              ))}

              {/* Spinning rings */}
              {[...Array(legendaryResult.rarity === "cosmic" ? 5 : 3)].map((_, i) => (
                <motion.div
                  key={`ring-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.5 + i * 0.5, 2 + i * 0.5],
                    opacity: [0, 0.8, 0],
                    rotate: [0, i % 2 === 0 ? 180 : -180, i % 2 === 0 ? 360 : -360],
                  }}
                  transition={{ duration: 2, delay: 0.3 + i * 0.2, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute w-64 h-64 rounded-full border-4"
                  style={{ borderColor: legendaryResult.rarity === "cosmic" ? (i % 2 === 0 ? RARITY_COLORS.cosmic : "#FFD700") : RARITY_COLORS.legendary }}
                />
              ))}

              {/* Main content */}
              <motion.div
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ type: "spring", delay: 0.5, duration: 1.5 }}
                className="relative z-10 text-center"
              >
                {/* Crown */}
                <motion.div
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1, type: "spring" }}
                  className="text-6xl mb-4"
                >
                  {"<"}
                </motion.div>

                {/* Hair root */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      `0 0 60px ${RARITY_COLORS.legendary}`,
                      `0 0 120px ${RARITY_COLORS.legendary}`,
                      `0 0 60px ${RARITY_COLORS.legendary}`,
                    ],
                  }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  className="w-48 h-48 mx-auto rounded-3xl flex items-center justify-center text-8xl mb-6"
                  style={{ 
                    backgroundColor: `${legendaryResult.color}60`,
                    border: `4px solid ${RARITY_COLORS.legendary}`,
                  }}
                >
                  {legendaryResult.emoji}
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <motion.p
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                    className="text-4xl font-bold mb-2"
                    style={{ 
                      color: RARITY_COLORS.legendary,
                      textShadow: `0 0 30px ${RARITY_COLORS.legendary}`,
                    }}
                  >
                    LEGENDARY!!!
                  </motion.p>
                  <p className="text-3xl font-bold text-white mb-2">
                    {legendaryResult.name}
                  </p>
                  <p className="text-lg text-white/70">
                    {legendaryResult.description}
                  </p>
                </motion.div>

                {/* Sparkles around the card */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    animate={{ 
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      delay: i * 0.15, 
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="absolute w-4 h-4"
                    style={{
                      top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 12)}%`,
                      left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 12)}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill={RARITY_COLORS.legendary}>
                      <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
                    </svg>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {(gachaState === "revealing" || gachaState === "result") && results.length > 0 && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg px-2"
            >
              <motion.h2 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-bold text-foreground text-center mb-6"
              >
                獲得した毛根！
              </motion.h2>

              {/* Single result - large display */}
              {results.length === 1 && (
                <motion.div
                  initial={{ scale: 0, rotateY: 180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="relative mb-6 cursor-pointer"
                  onClick={() => setSelectedDetail(results[0])}
                >
                  <div
                    className="rounded-2xl p-8 border-4 text-center mx-auto max-w-xs hover:scale-105 transition-transform"
                    style={{
                      borderColor: RARITY_COLORS[results[0].rarity],
                      backgroundColor: `${RARITY_COLORS[results[0].rarity]}20`,
                      boxShadow: `0 0 40px ${RARITY_COLORS[results[0].rarity]}40`,
                    }}
                  >
                    <div
                      className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center mb-4 text-6xl"
                      style={{ backgroundColor: `${results[0].color}40` }}
                    >
                      {results[0].emoji}
                    </div>
                    <p
                      className="font-bold text-2xl mb-1"
                      style={{ color: RARITY_COLORS[results[0].rarity] }}
                    >
                      {results[0].name}
                    </p>
                    {results[0].element && (
                      <span 
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white mb-1"
                        style={{ backgroundColor: ELEMENT_COLORS[results[0].element] }}
                      >
                        {ELEMENT_NAMES[results[0].element]}属性
                      </span>
                    )}
                    <p
                      className="text-sm font-medium"
                      style={{ color: RARITY_COLORS[results[0].rarity] }}
                    >
                      {RARITY_NAMES[results[0].rarity]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {results[0].description}
                    </p>
                    <p className="text-xs text-primary mt-3">タップで詳細を見る</p>
                  </div>

                  {/* Sparkle effect for rare+ */}
                  {["rare", "epic", "legendary"].includes(results[0].rarity) && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, delay: i * 0.2, repeat: Number.POSITIVE_INFINITY }}
                          className="absolute w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: RARITY_COLORS[results[0].rarity],
                            top: `${50 + 48 * Math.sin((i * Math.PI * 2) / 8)}%`,
                            left: `${50 + 48 * Math.cos((i * Math.PI * 2) / 8)}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Multiple results - grid display */}
              {results.length > 1 && (
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {results.map((hairRoot, index) => (
                    <motion.div
                      key={`${hairRoot.id}-${index}`}
                      initial={{ scale: 0, rotateY: 180 }}
                      animate={
                        index < currentRevealIndex
                          ? { scale: 1, rotateY: 0 }
                          : { scale: 0.5, rotateY: 180 }
                      }
                      transition={{ type: "spring", delay: index * 0.08 }}
                      className="relative cursor-pointer"
                      onClick={() => index < currentRevealIndex && setSelectedDetail(hairRoot)}
                    >
                      <div
                        className="rounded-lg p-2 border-2 text-center aspect-square flex flex-col items-center justify-center"
                        style={{
                          borderColor: RARITY_COLORS[hairRoot.rarity],
                          backgroundColor: `${RARITY_COLORS[hairRoot.rarity]}15`,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-1 text-xl relative"
                          style={{ backgroundColor: `${hairRoot.color}30` }}
                        >
                          {hairRoot.emoji}
                          {hairRoot.element && (
                            <span 
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full text-[6px] flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: ELEMENT_COLORS[hairRoot.element] }}
                            >
                              {ELEMENT_NAMES[hairRoot.element][0]}
                            </span>
                          )}
                        </div>
                        <p
                          className="font-bold text-[10px] leading-tight line-clamp-1"
                          style={{ color: RARITY_COLORS[hairRoot.rarity] }}
                        >
                          {hairRoot.name}
                        </p>
                      </div>

                      {/* Mini sparkle for rare+ */}
                      {["rare", "epic", "legendary"].includes(hairRoot.rarity) && index < currentRevealIndex && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.5, 0] }}
                          transition={{ duration: 0.5 }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
                          style={{ backgroundColor: RARITY_COLORS[hairRoot.rarity] }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Summary for 10-pull */}
              {results.length > 1 && gachaState === "result" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-4 mb-4 border border-border"
                >
                  <h3 className="text-sm font-medium text-foreground mb-2">獲得結果サマリー</h3>
                  <div className="flex justify-around text-xs">
                    {(["common", "uncommon", "rare", "epic", "legendary"] as const).map((rarity) => {
                      const count = results.filter((r) => r.rarity === rarity).length
                      return (
                        <div key={rarity} className="text-center">
                          <div
                            className="w-3 h-3 rounded-full mx-auto mb-1"
                            style={{ backgroundColor: count > 0 ? RARITY_COLORS[rarity] : "#333" }}
                          />
                          <p className="font-bold" style={{ color: count > 0 ? RARITY_COLORS[rarity] : "#666" }}>
                            {count}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {gachaState === "result" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-4"
                >
                  <Button onClick={handleClose} variant="outline" className="flex-1 bg-transparent">
                    閉じる
                  </Button>
                  <Button
                    onClick={() => handlePull(results.length === 1 ? "single" : "ten")}
                    disabled={results.length === 1 ? coins < 10 : coins < 100}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    もう一度！
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
                style={{ borderColor: RARITY_COLORS[selectedDetail.rarity], maxHeight: "80vh" }}
              >
                <div className="flex justify-between items-start p-6 pb-4 flex-shrink-0">
                  <div
                    className="px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: RARITY_COLORS[selectedDetail.rarity] }}
                  >
                    {RARITY_NAMES[selectedDetail.rarity]}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDetail(null)}>
                    閉じる
                  </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                  <div
                    className="w-24 h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
                    style={{ backgroundColor: `${selectedDetail.color}30` }}
                  >
                    {selectedDetail.emoji}
                  </div>

                  <h2 className="text-xl font-bold text-foreground text-center mb-1">
                    {selectedDetail.name}
                  </h2>
                  {selectedDetail.element && (
                    <div className="flex justify-center mb-2">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: ELEMENT_COLORS[selectedDetail.element] }}
                      >
                        {ELEMENT_NAMES[selectedDetail.element]}属性
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {selectedDetail.description}
                  </p>

                  {/* Stats */}
                  <div className="bg-muted rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">ステータス</h3>
                    <div className="space-y-2">
                      {[
                        { label: "パワー", value: selectedDetail.power, color: "#EF4444" },
                        { label: "スピード", value: selectedDetail.speed, color: "#3B82F6" },
                        { label: "グリップ", value: selectedDetail.grip, color: "#10B981" },
                      ].map((stat) => (
                        <div key={stat.label} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16">{stat.label}</span>
                          <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${Math.min((stat.value / 80) * 100, 100)}%`,
                                backgroundColor: stat.color,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold w-8 text-right">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="bg-muted rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">スキル</h3>
                    <div className="space-y-2">
                      {selectedDetail.skills.map((skill) => (
                        <div key={skill.id} className="bg-background rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground text-sm">{skill.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                              {skill.type === "attack" ? "攻撃" : skill.type === "defense" ? "防御" : "特殊"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{skill.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {skill.damage > 0 && <span>威力: {skill.damage}</span>}
                            <span>CT: {skill.cooldown}ターン</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Select Button */}
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => {
                      selectHairRoot(selectedDetail)
                      setSelectedDetail(null)
                    }}
                  >
                    {selectedHairRoot?.id === selectedDetail.id ? (
                      "選択中"
                    ) : (
                      "この毛根を選択"
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Pickup Detail Modal */}
          {pickupDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              onClick={() => setPickupDetail(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-card rounded-2xl p-6 border-2 max-h-[85vh] overflow-y-auto"
                style={{ borderColor: RARITY_COLORS[pickupDetail.rarity] }}
              >
                {/* Header */}
                <div 
                  className="text-center mb-4 p-4 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${RARITY_COLORS[pickupDetail.rarity]}20, ${RARITY_COLORS[pickupDetail.rarity]}40)` }}
                >
                  <div className="text-6xl mb-2">{pickupDetail.emoji}</div>
                  <h2 className="text-xl font-bold text-foreground">{pickupDetail.name}</h2>
                  {pickupDetail.element && (
                    <div className="flex justify-center my-2">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: ELEMENT_COLORS[pickupDetail.element] }}
                      >
                        {ELEMENT_NAMES[pickupDetail.element]}属性
                      </span>
                    </div>
                  )}
                  <p 
                    className="text-sm font-medium"
                    style={{ color: RARITY_COLORS[pickupDetail.rarity] }}
                  >
                    {RARITY_NAMES[pickupDetail.rarity]}
                  </p>
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm text-center mb-4">{pickupDetail.description}</p>

                {/* Stats */}
                <div className="bg-muted rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">ステータス</h3>
                  <div className="space-y-2">
                    {[
                      { label: "パワー", value: pickupDetail.power, max: 100, color: "#EF4444" },
                      { label: "スピード", value: pickupDetail.speed, max: 100, color: "#3B82F6" },
                      { label: "グリップ", value: pickupDetail.grip, max: 100, color: "#22C55E" },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{stat.label}</span>
                          <span className="font-bold" style={{ color: stat.color }}>{stat.value}</span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(stat.value / stat.max) * 100}%`, backgroundColor: stat.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="bg-muted rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">スキル</h3>
                  <div className="space-y-2">
                    {pickupDetail.skills.map((skill) => (
                      <div key={skill.id} className="bg-background rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-sm">{skill.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                            {skill.type === "attack" ? "攻撃" : skill.type === "defense" ? "防御" : "特殊"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{skill.description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {skill.damage > 0 && <span>威力: {skill.damage}</span>}
                          <span>CT: {skill.cooldown}ターン</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  className="w-full bg-transparent hover:bg-muted border border-border"
                  variant="outline"
                  onClick={() => setPickupDetail(null)}
                >
                  閉じる
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
