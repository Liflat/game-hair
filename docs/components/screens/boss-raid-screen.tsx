"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useGame } from "@/lib/game-context"
import type { Screen } from "@/lib/screens"
import type { CollectedHairRoot } from "@/lib/game-data"
import { HAIR_ROOTS } from "@/lib/game-data"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BossRaidScreenProps {
  onNavigate: (screen: Screen) => void
}

export function BossRaidScreen({ onNavigate }: BossRaidScreenProps) {
  const { collection, selectedHairRoot, defeatBossRaid } = useGame()
  const [gameState, setGameState] = useState<"preparation" | "battle" | "victory" | "defeat">("preparation")
  const [selectedTeam, setSelectedTeam] = useState<CollectedHairRoot[]>([])
  const [bossHealth, setBossHealth] = useState(100)
  const [playerTeamHealth, setPlayerTeamHealth] = useState<number[]>([100, 100, 100, 100])
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [turnCount, setTurnCount] = useState(0)

  const boss = HAIR_ROOTS.find(h => h.id === 53)!
  const legendaryHairRoots = collection.filter(h => h.rarity === "legendary")
  const selectableHairRoots = collection.filter(h => h.rarity !== "cosmic")

  const canStartBattle = selectedTeam.length === 4 && selectableHairRoots.length >= 4

  const handleTeamSelection = (hairRoot: CollectedHairRoot) => {
    if (selectedTeam.find(h => h.id === hairRoot.id && h.level === hairRoot.level)) {
      setSelectedTeam(selectedTeam.filter(h => !(h.id === hairRoot.id && h.level === hairRoot.level)))
    } else if (selectedTeam.length < 4) {
      setSelectedTeam([...selectedTeam, hairRoot])
    }
  }

  const startBattle = () => {
    setGameState("battle")
    setBattleLog([
      "魔王ヘアグランドが現れた！",
      "全次元の力で、お前達を消し去ってやる...",
      "バトル開始！"
    ])
    setTurnCount(1)
  }

  const executePlayerAttack = () => {
    const totalDamage = selectedTeam.reduce((sum, hair) => sum + hair.power, 0) * 0.5
    const newBossHealth = Math.max(0, bossHealth - totalDamage)
    
    setBattleLog(prev => [
      ...prev,
      `毛根連合がヘアグランドに ${Math.round(totalDamage)} ダメージを与えた！`
    ])
    
    if (newBossHealth === 0) {
      setBossHealth(0)
      setTimeout(() => {
        defeatBossRaid()
        setGameState("victory")
        setBattleLog(prev => [
          ...prev,
          "ヘアグランドを倒した！",
          "コズミックレア『超次元毛根魔王ヘアグランド』を手に入れた！"
        ])
      }, 500)
      return
    }
    
    setBossHealth(newBossHealth)
    
    setTimeout(() => {
      executeBossAttack(newBossHealth)
    }, 500)
  }

  const executeBossAttack = (currentBossHealth: number) => {
    if (currentBossHealth <= 0) return
    
    const skills = boss.skills
    const randomSkill = skills[Math.floor(Math.random() * skills.length)]
    
    let damageDealt = 0
    const damageToTeam = [...playerTeamHealth]
    
    if (randomSkill.id === "absolute-zero") {
      // 全体攻撃とデバフ
      damageDealt = 50
      for (let i = 0; i < damageToTeam.length; i++) {
        damageToTeam[i] = Math.max(0, damageToTeam[i] - damageDealt)
      }
      setBattleLog(prev => [
        ...prev,
        `ヘアグランドが『${randomSkill.name}』を使用した！`,
        "全体に 50 ダメージとデバフを受けた！"
      ])
    } else if (randomSkill.id === "ancient-chaos") {
      // 集中攻撃
      damageDealt = 75
      const targetIndex = Math.floor(Math.random() * damageToTeam.length)
      damageToTeam[targetIndex] = Math.max(0, damageToTeam[targetIndex] - damageDealt)
      setBattleLog(prev => [
        ...prev,
        `ヘアグランドが『${randomSkill.name}』を使用した！`,
        `${selectedTeam[targetIndex]?.name} に ${damageDealt} ダメージ！`
      ])
    } else {
      damageDealt = 30
      for (let i = 0; i < damageToTeam.length; i++) {
        damageToTeam[i] = Math.max(0, damageToTeam[i] - damageDealt)
      }
      setBattleLog(prev => [
        ...prev,
        `ヘアグランドが『${randomSkill.name}』を使用した！`,
        "全体に 30 ダメージを受けた！"
      ])
    }
    
    setPlayerTeamHealth(damageToTeam)
    
    if (damageToTeam.every(h => h === 0)) {
      setTimeout(() => {
        setGameState("defeat")
        setBattleLog(prev => [
          ...prev,
          "すべての毛根が絶滅した...",
          "敗北だ..."
        ])
      }, 500)
    } else {
      setTurnCount(prev => prev + 1)
    }
  }

  if (!boss) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">魔王討伐</h1>
        <div className="w-6" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {gameState === "preparation" && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 border border-border text-center"
            >
              <div className="text-6xl mb-4">{boss.emoji}</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{boss.name}</h2>
              <p className="text-muted-foreground mb-4">{boss.description}</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">力</p>
                  <p className="font-bold text-foreground">{boss.power}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">速</p>
                  <p className="font-bold text-foreground">{boss.speed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">握</p>
                  <p className="font-bold text-foreground">{boss.grip}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">HP</p>
                  <p className="font-bold text-foreground">100</p>
                </div>
              </div>
              <p className="text-yellow-500 font-bold text-sm mb-4">
                ⚠️ コズミックレアは使用できません
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              <h3 className="font-bold text-foreground mb-4">チーム選択 ({selectedTeam.length}/4)</h3>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {selectableHairRoots.map((hairRoot, idx) => (
                  <button
                    key={`${hairRoot.id}-${idx}`}
                    onClick={() => handleTeamSelection(hairRoot)}
                    className={`p-3 rounded-lg text-left transition-all border-2 ${
                      selectedTeam.find(h => h.id === hairRoot.id && h.level === hairRoot.level)
                        ? "border-primary bg-primary/20"
                        : "border-border bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{hairRoot.emoji}</span>
                      <span className="text-sm font-medium">{hairRoot.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Lv.{hairRoot.level}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4"
            >
              <Button variant="outline" className="flex-1" onClick={() => onNavigate("home")}>
                戻る
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700" 
                onClick={startBattle}
                disabled={!canStartBattle}
              >
                バトル開始
              </Button>
            </motion.div>
          </>
        )}

        {gameState === "battle" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground">ヘアグランド</span>
                <span className="text-sm text-muted-foreground">第 {turnCount} ターン</span>
              </div>
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, bossHealth)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round(bossHealth)}/100</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {playerTeamHealth.map((health, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-lg p-3 border border-border"
                >
                  <p className="text-xs font-medium mb-1">
                    {selectedTeam[idx]?.name}
                  </p>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${Math.max(0, health)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{health}/100</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-muted rounded-lg p-4 max-h-40 overflow-y-auto"
            >
              {battleLog.map((log, idx) => (
                <p key={idx} className="text-sm text-foreground mb-1">
                  {log}
                </p>
              ))}
            </motion.div>

            <Button 
              className="w-full" 
              onClick={executePlayerAttack}
              disabled={gameState !== "battle"}
            >
              攻撃
            </Button>
          </>
        )}

        {gameState === "victory" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-center text-white"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">勝利！</h2>
            <div className="bg-black/20 rounded-lg p-4 mb-6">
              <p className="text-lg mb-2">ヘアグランドを倒した！</p>
              <p className="text-2xl font-bold">👑 コズミックレア</p>
              <p className="text-xl">超次元毛根魔王ヘアグランド</p>
              <p className="text-sm mt-2">を手に入れた！</p>
            </div>
            <div className="space-y-3">
              <div className="bg-black/20 rounded p-2">
                <p className="text-sm">+1000 コイン</p>
              </div>
              <div className="bg-black/20 rounded p-2">
                <p className="text-sm">+500 経験値</p>
              </div>
            </div>
            <Button 
              className="w-full mt-6 bg-white text-green-600 hover:bg-gray-100" 
              onClick={() => onNavigate("home")}
            >
              ホームに戻る
            </Button>
          </motion.div>
        )}

        {gameState === "defeat" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-8 text-center text-white"
          >
            <div className="text-6xl mb-4">☠️</div>
            <h2 className="text-3xl font-bold mb-4">敗北...</h2>
            <p className="text-lg mb-6">全ての毛根が絶滅した。</p>
            <p className="text-sm mb-6">今度はもっと強い毛根で挑戦しよう。</p>
            <Button 
              className="w-full bg-white text-red-600 hover:bg-gray-100" 
              onClick={() => onNavigate("home")}
            >
              ホームに戻る
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
