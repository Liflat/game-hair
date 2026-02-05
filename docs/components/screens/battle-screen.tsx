"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { RARITY_COLORS, calculateStats, getRankColor, getElementMatchup, ELEMENT_NAMES, ELEMENT_COLORS, type HairRoot, type CollectedHairRoot, type Element } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"

interface BattleScreenProps {
  onNavigate: (screen: Screen) => void
  opponent: { name: string; hairRoot: HairRoot } | null
}

type BattlePhase = "intro" | "tangling" | "pulling" | "result"
type BattleResult = "win" | "lose" | "draw" | null

export function BattleScreen({ onNavigate, opponent }: BattleScreenProps) {
  const { selectedHairRoot, addCoins, getBattleRank, updateBattleRank } = useGame()
  const [phase, setPhase] = useState<BattlePhase>("intro")
  const [playerPower, setPlayerPower] = useState(0)
  const [opponentPower, setOpponentPower] = useState(0)
  const [result, setResult] = useState<BattleResult>(null)
  const [tangledAmount, setTangledAmount] = useState(0)
  const [pullProgress, setPullProgress] = useState(50)
  const [rankChange, setRankChange] = useState<number | null>(null)
  const tapCountRef = useRef(0)
  const battleTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const currentRank = getBattleRank()

  const myStats = selectedHairRoot ? calculateStats(selectedHairRoot) : { power: 0, speed: 0, grip: 0 }
  const opponentStats = opponent?.hairRoot
    ? { power: opponent.hairRoot.power, speed: opponent.hairRoot.speed, grip: opponent.hairRoot.grip }
    : { power: 0, speed: 0, grip: 0 }
  
  // Calculate element matchup for grip strength modification
  const myElement = selectedHairRoot?.element as Element | undefined
  const oppElement = opponent?.hairRoot?.element as Element | undefined
  const elementMatchup = myElement && oppElement ? getElementMatchup(myElement, oppElement) : 1.0
  const elementAdvantage = elementMatchup > 1 ? "advantage" : elementMatchup < 1 ? "disadvantage" : "neutral"

  // Start battle sequence
  useEffect(() => {
    if (!selectedHairRoot || !opponent) {
      onNavigate("matchmaking")
      return
    }

    // Intro phase
    const introTimer = setTimeout(() => {
      setPhase("tangling")
    }, 2000)

    return () => clearTimeout(introTimer)
  }, [selectedHairRoot, opponent, onNavigate])

  // Tangling phase - auto progress
  useEffect(() => {
    if (phase !== "tangling") return

    const interval = setInterval(() => {
      setTangledAmount((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setPhase("pulling")
          return 100
        }
        return prev + 5
      })
    }, 100)

    return () => clearInterval(interval)
  }, [phase])

  // Pulling phase - tap battle
  useEffect(() => {
    if (phase !== "pulling") return

    // AI opponent tapping
    const opponentInterval = setInterval(() => {
      const opponentTapPower = 0.5 + Math.random() * (opponentStats.speed / 100)
      setPullProgress((prev) => Math.max(0, Math.min(100, prev - opponentTapPower)))
    }, 100)

    // Battle timer - 10 seconds
    battleTimerRef.current = setTimeout(() => {
      clearInterval(opponentInterval)
      determinResult()
    }, 10000)

    return () => {
      clearInterval(opponentInterval)
      if (battleTimerRef.current) {
        clearTimeout(battleTimerRef.current)
      }
    }
  }, [phase, opponentStats.speed])

  const handleTap = useCallback(() => {
    if (phase !== "pulling") return

    tapCountRef.current += 1
    // Apply element matchup to tap power (grip strength)
    const baseTapPower = 0.8 + (myStats.speed / 100) * 0.5 + (myStats.grip / 100) * 0.3
    const tapPower = baseTapPower * elementMatchup
    setPullProgress((prev) => Math.max(0, Math.min(100, prev + tapPower)))

    setPlayerPower((prev) => prev + 1)
  }, [phase, myStats.speed, myStats.grip])

  const determinResult = useCallback(() => {
    // Calculate final result based on pull progress and stats
    const myTotal = myStats.power + myStats.speed + myStats.grip + tapCountRef.current
    const oppTotal = opponentStats.power + opponentStats.speed + opponentStats.grip + Math.floor(Math.random() * 50)

    let battleResult: BattleResult
    if (pullProgress > 55) {
      battleResult = "win"
      addCoins(50)
    } else if (pullProgress < 45) {
      battleResult = "lose"
      addCoins(10)
    } else {
      // Close battle - use stats
      if (myTotal > oppTotal) {
        battleResult = "win"
        addCoins(50)
      } else if (myTotal < oppTotal) {
        battleResult = "lose"
        addCoins(10)
      } else {
        battleResult = "draw"
        addCoins(20)
      }
    }

    // Update rank
    if (battleResult !== "draw") {
      const change = updateBattleRank(battleResult === "win")
      setRankChange(change)
    }

    setResult(battleResult)
    setPhase("result")
  }, [pullProgress, myStats, opponentStats, addCoins, updateBattleRank])

  if (!selectedHairRoot || !opponent) return null

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Battle Arena */}
      <div className="flex-1 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              background: [
                "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.2) 0%, transparent 50%)",
                "radial-gradient(circle at 70% 70%, hsl(var(--secondary) / 0.2) 0%, transparent 50%)",
                "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.2) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-0"
          />
        </div>

        {/* Player Side */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute left-4 top-1/4 transform -translate-y-1/2"
        >
          <div className="text-center">
            <motion.div
              animate={
                phase === "pulling"
                  ? { x: [0, 5, -5, 0], rotate: [0, 5, -5, 0] }
                  : {}
              }
              transition={{ duration: 0.2, repeat: phase === "pulling" ? Number.POSITIVE_INFINITY : 0 }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center text-4xl md:text-5xl mb-2 relative"
              style={{
                backgroundColor: `${selectedHairRoot.color}30`,
                borderColor: RARITY_COLORS[selectedHairRoot.rarity],
                borderWidth: 3,
              }}
            >
              {selectedHairRoot.emoji}
              {myElement && (
                <span 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: ELEMENT_COLORS[myElement] }}
                >
                  {ELEMENT_NAMES[myElement][0]}
                </span>
              )}
            </motion.div>
            <p className="text-sm font-medium text-foreground">あなた</p>
            <p className="text-xs text-muted-foreground">{selectedHairRoot.name}</p>
            {myElement && (
              <p className="text-[10px] mt-1 px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: ELEMENT_COLORS[myElement] }}>
                {ELEMENT_NAMES[myElement]}属性
              </p>
            )}
          </div>
        </motion.div>

        {/* Opponent Side */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute right-4 top-1/4 transform -translate-y-1/2"
        >
          <div className="text-center">
            <motion.div
              animate={
                phase === "pulling"
                  ? { x: [0, -5, 5, 0], rotate: [0, -5, 5, 0] }
                  : {}
              }
              transition={{ duration: 0.2, repeat: phase === "pulling" ? Number.POSITIVE_INFINITY : 0 }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center text-4xl md:text-5xl mb-2 relative"
              style={{
                backgroundColor: `${opponent.hairRoot.color}30`,
                borderColor: RARITY_COLORS[opponent.hairRoot.rarity],
                borderWidth: 3,
              }}
            >
              {opponent.hairRoot.emoji}
              {oppElement && (
                <span 
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: ELEMENT_COLORS[oppElement] }}
                >
                  {ELEMENT_NAMES[oppElement][0]}
                </span>
              )}
            </motion.div>
            <p className="text-sm font-medium text-foreground">{opponent.name}</p>
            <p className="text-xs text-muted-foreground">{opponent.hairRoot.name}</p>
            {oppElement && (
              <p className="text-[10px] mt-1 px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: ELEMENT_COLORS[oppElement] }}>
                {ELEMENT_NAMES[oppElement]}属性
              </p>
            )}
          </div>
        </motion.div>

        {/* Tangling Animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg viewBox="0 0 300 200" className="w-64 h-48">
            {/* Player hair root */}
            <motion.path
              d={`M50,100 Q${100 + tangledAmount * 0.5},${80 + Math.sin(tangledAmount * 0.1) * 20} 150,100`}
              fill="none"
              stroke={selectedHairRoot.color}
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase !== "intro" ? 1 : 0 }}
              transition={{ duration: 1 }}
            />
            {/* Opponent hair root */}
            <motion.path
              d={`M250,100 Q${200 - tangledAmount * 0.5},${120 - Math.sin(tangledAmount * 0.1) * 20} 150,100`}
              fill="none"
              stroke={opponent.hairRoot.color}
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase !== "intro" ? 1 : 0 }}
              transition={{ duration: 1 }}
            />
            {/* Tangle point */}
            {phase !== "intro" && (
              <motion.circle
                cx="150"
                cy="100"
                r={5 + tangledAmount * 0.1}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </svg>
        </div>

        {/* Phase Indicators */}
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-card/90 backdrop-blur-sm rounded-2xl p-8 text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  className="text-6xl mb-4"
                >
                  VS
                </motion.div>
                <p className="text-xl font-bold text-foreground">毛根バトル開始！</p>
              </div>
            </motion.div>
          )}

          {phase === "tangling" && (
            <motion.div
              key="tangling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-32 left-0 right-0 text-center"
            >
              <p className="text-lg font-bold text-foreground mb-2">毛根が絡まっています...</p>
              <div className="w-48 h-3 bg-muted rounded-full mx-auto overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: `${tangledAmount}%` }}
                />
              </div>
            </motion.div>
          )}

          {phase === "pulling" && (
            <motion.div
              key="pulling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-24 left-0 right-0 px-4"
            >
              <p className="text-center text-lg font-bold text-foreground mb-4">
                連打して引っ張れ！
              </p>

              {/* Tug of war bar */}
              <div className="relative h-8 bg-muted rounded-full overflow-hidden mb-4">
                <div className="absolute inset-0 flex">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100"
                    style={{ width: `${pullProgress}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 flex-1"
                  />
                </div>
                <motion.div
                  className="absolute top-0 bottom-0 w-2 bg-white shadow-lg"
                  style={{ left: `${pullProgress}%`, transform: "translateX(-50%)" }}
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-6 bg-white/50" />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-blue-400">あなた</span>
                <span className="text-red-400">{opponent.name}</span>
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`text-6xl mb-4 ${
                    result === "win" ? "text-secondary" : result === "lose" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {result === "win" && "🎉"}
                  {result === "lose" && "😢"}
                  {result === "draw" && "🤝"}
                </motion.div>
                <motion.h2
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className={`text-4xl font-black mb-2 ${
                    result === "win" ? "text-secondary" : result === "lose" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {result === "win" && "勝利！"}
                  {result === "lose" && "敗北..."}
                  {result === "draw" && "引き分け"}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-muted-foreground mb-2"
                >
                  獲得コイン: {result === "win" ? 50 : result === "draw" ? 20 : 10}
                </motion.p>
                {rankChange !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mb-4"
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: getRankColor(currentRank.tier) }}
                    >
                      {currentRank.name}
                    </span>
                    <span className={`ml-2 font-medium ${rankChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {rankChange >= 0 ? "+" : ""}{rankChange} RP
                    </span>
                  </motion.div>
                )}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="flex gap-4 justify-center"
                >
                  <Button variant="outline" onClick={() => onNavigate("home")}>
                    ホームへ
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => onNavigate("matchmaking")}
                  >
                    もう一度
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tap Zone */}
      {phase === "pulling" && (
        <motion.button
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTap}
          className="h-32 bg-gradient-to-t from-primary to-primary/80 flex items-center justify-center active:from-primary/80"
        >
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
            className="text-2xl font-bold text-primary-foreground"
          >
            タップ！タップ！タップ！
          </motion.span>
        </motion.button>
      )}
    </div>
  )
}
