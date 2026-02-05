"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, calculateStats, calculateSkillBonus, ELEMENT_NAMES, getElementCombatModifiers, BOSS_RAID_SKILLS, type HairRoot, type Skill, type CollectedHairRoot } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Zap } from "lucide-react"

interface BossRaidScreenProps {
  onNavigate: (screen: Screen) => void
}

interface StatusEffect {
  type: "stun" | "buff" | "debuff" | "dot"
  name: string
  duration: number
  value?: number
  stat?: "power" | "speed" | "grip" | "all"
}

interface BattlePlayer {
  id: number
  name: string
  hairRoot: HairRoot
  hp: number
  maxHp: number
  isEliminated: boolean
  cooldowns: { [skillId: string]: number }
  statusEffects: StatusEffect[]
  buffedStats: { power: number; speed: number; grip: number }
}

type BattlePhase = "preparation" | "selecting" | "action" | "result" | "finished"

export function BossRaidScreen({ onNavigate }: BossRaidScreenProps) {
  const { collection, selectedHairRoot, defeatBossRaid } = useGame()
  const [phase, setPhase] = useState<BattlePhase>("preparation")
  const [selectedTeam, setSelectedTeam] = useState<CollectedHairRoot[]>([])
  const [bossPlayer, setBossPlayer] = useState<BattlePlayer | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<BattlePlayer[]>([])
  const [currentActorIndex, setCurrentActorIndex] = useState(0)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)
  const [round, setRound] = useState(1)
  const [battleLog, setBattleLog] = useState<string[]>([])

  const boss = HAIR_ROOTS.find(h => h.id === 53)!
  const selectableHairRoots = collection.filter(h => h.rarity !== "cosmic")
  const canStartBattle = selectedTeam.length === 5 && selectedHairRoot && selectedTeam.some(h => h.id === selectedHairRoot.id)

  const handleTeamSelection = (hairRoot: CollectedHairRoot) => {
    if (selectedHairRoot && hairRoot.id === selectedHairRoot.id && hairRoot.level === selectedHairRoot.level) {
      // This is the main character - always selectable
      if (selectedTeam.find(h => h.id === hairRoot.id && h.level === hairRoot.level)) {
        setSelectedTeam(selectedTeam.filter(h => !(h.id === hairRoot.id && h.level === hairRoot.level)))
      } else if (selectedTeam.length < 5) {
        setSelectedTeam([...selectedTeam, hairRoot])
      }
    } else {
      // Team member selection
      if (selectedTeam.find(h => h.id === hairRoot.id && h.level === hairRoot.level)) {
        setSelectedTeam(selectedTeam.filter(h => !(h.id === hairRoot.id && h.level === hairRoot.level)))
      } else if (selectedTeam.length < 5) {
        setSelectedTeam([...selectedTeam, hairRoot])
      }
    }
  }

  const initializeBattle = () => {
    if (!selectedTeam.length) return

    // Create boss player with raid-specific skills
    const maxHp = 5000
    const bossWithRaidSkills: HairRoot = {
      ...boss,
      skills: BOSS_RAID_SKILLS,
    }
    
    const bossPlayer: BattlePlayer = {
      id: 999,
      name: boss.name,
      hairRoot: bossWithRaidSkills,
      hp: maxHp,
      maxHp,
      isEliminated: false,
      cooldowns: {},
      statusEffects: [],
      buffedStats: { power: 0, speed: 0, grip: 0 },
    }

    // Create team players
    const teamPlayers: BattlePlayer[] = selectedTeam.map((hair, idx) => {
      const stats = calculateStats(hair)
      const maxHp = Math.floor((100 + stats.power + stats.grip) * 1.2)
      return {
        id: idx,
        name: hair.name,
        hairRoot: hair as HairRoot,
        hp: maxHp,
        maxHp,
        isEliminated: false,
        cooldowns: {},
        statusEffects: [],
        buffedStats: { power: 0, speed: 0, grip: 0 },
      }
    })

    setBossPlayer(bossPlayer)
    setTeamPlayers(teamPlayers)
    setPhase("selecting")
    setBattleLog(["魔王ヘアグランドが降臨した！", "「全次元の力で、お前達を消し去ってやる...」"])
  }

  const getSkillDamage = (caster: BattlePlayer, skill: Skill): number => {
    const casterStats = calculateStats(caster.hairRoot as CollectedHairRoot)
    const baseDamage = skill.damage
    const skillBonus = calculateSkillBonus(caster.hairRoot as CollectedHairRoot)
    const powerBonus = casterStats.power * 0.3
    
    return Math.floor((baseDamage + powerBonus) * skillBonus)
  }

  const executeSkill = (actor: BattlePlayer, skill: Skill, targets: BattlePlayer[]) => {
    if (!bossPlayer) return

    let damage = getSkillDamage(actor, skill)
    const newLog: string[] = []

    newLog.push(`${actor.name}が「${skill.name}」を使用した！`)

    // Apply damage to targets
    const allPlayers = [bossPlayer, ...teamPlayers]
    
    if (skill.type === "aoe" && skill.maxTargets) {
      // AOE skill
      const validTargets = allPlayers.filter(p => !p.isEliminated && p.id !== actor.id).slice(0, skill.maxTargets)
      validTargets.forEach(target => {
        const actualDamage = Math.max(1, damage)
        target.hp = Math.max(0, target.hp - actualDamage)
        newLog.push(`${target.name}に ${actualDamage} ダメージ！`)
      })
    } else if (targets.length > 0) {
      // Single target skill
      targets.forEach(target => {
        const actualDamage = Math.max(1, damage)
        target.hp = Math.max(0, target.hp - actualDamage)
        newLog.push(`${target.name}に ${actualDamage} ダメージ！`)
      })
    }

    setBattleLog(prev => [...prev, ...newLog])
    
    // Check win condition
    if (bossPlayer.hp <= 0) {
      setBattleLog(prev => [...prev, "ヘアグランドを倒した！"])
      defeatBossRaid()
      setPhase("finished")
      return
    }

    // Boss turn
    setTimeout(() => executeBossTurn(), 1500)
  }

  const executeBossTurn = () => {
    if (!bossPlayer || bossPlayer.isEliminated) return

    const aliveTeam = teamPlayers.filter(p => !p.isEliminated)
    if (aliveTeam.length === 0) {
      setBattleLog(prev => [...prev, "すべての毛根が絶滅した..."])
      setPhase("finished")
      return
    }

    const skills = bossPlayer.hairRoot.skills
    const randomSkill = skills[Math.floor(Math.random() * skills.length)]
    const targets = randomSkill.type === "aoe" ? aliveTeam : [aliveTeam[Math.floor(Math.random() * aliveTeam.length)]]

    const damage = getSkillDamage(bossPlayer, randomSkill)
    const newLog: string[] = []

    newLog.push(`ヘアグランドが「${randomSkill.name}」を使用した！`)

    if (randomSkill.type === "aoe") {
      aliveTeam.forEach(target => {
        const actualDamage = Math.max(1, damage)
        target.hp = Math.max(0, target.hp - actualDamage)
        newLog.push(`${target.name}に ${actualDamage} ダメージ！`)
      })
    } else {
      targets.forEach(target => {
        const actualDamage = Math.max(1, damage)
        target.hp = Math.max(0, target.hp - actualDamage)
        newLog.push(`${target.name}に ${actualDamage} ダメージ！`)
      })
    }

    setBattleLog(prev => [...prev, ...newLog])
    setRound(prev => prev + 1)
    setPhase("selecting")
    setSelectedSkill(null)
    setSelectedTarget(null)
  }

  if (!boss) return null

  const allAlivePlayers = [
    ...(bossPlayer && !bossPlayer.isEliminated ? [bossPlayer] : []),
    ...teamPlayers.filter(p => !p.isEliminated),
  ]

  const currentActor = phase === "selecting" ? teamPlayers[currentActorIndex] : null
  const currentSkills = currentActor ? currentActor.hairRoot.skills : []

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">魔王討伐 - {phase === "finished" ? "終了" : `第${round}ターン`}</h1>
        <div className="w-6" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {phase === "preparation" && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-lg p-4 border border-border text-center"
            >
              <div className="text-5xl mb-2">{boss.emoji}</div>
              <h2 className="text-xl font-bold mb-2">{boss.name}</h2>
              <p className="text-sm text-muted-foreground mb-3">{boss.description}</p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">HP</p>
                  <p className="font-bold">5000</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">力</p>
                  <p className="font-bold">{boss.power}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">速</p>
                  <p className="font-bold">{boss.speed}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">握</p>
                  <p className="font-bold">{boss.grip}</p>
                </div>
              </div>
              <p className="text-yellow-500 text-xs mt-3">⚠️ コズミックレアは使用できません</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-lg p-4 border border-border"
            >
              <h3 className="font-bold mb-3">チーム選択 ({selectedTeam.length}/5)</h3>
              <p className="text-xs text-muted-foreground mb-2">※ 自分の毛根 + 仲間4体を選択</p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {selectableHairRoots.map((hair, idx) => (
                  <button
                    key={`${hair.id}-${idx}`}
                    onClick={() => handleTeamSelection(hair)}
                    className={`p-3 rounded-lg text-left border text-sm ${
                      selectedTeam.find(h => h.id === hair.id && h.level === hair.level)
                        ? "border-primary bg-primary/20"
                        : "border-border bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{hair.emoji}</span>
                      <span className="font-medium truncate">{hair.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Lv.{hair.level}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onNavigate("home")}>
                戻る
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={initializeBattle}
                disabled={!canStartBattle}
              >
                バトル開始
              </Button>
            </div>
          </>
        )}

        {(phase === "selecting" || phase === "action") && bossPlayer && (
          <>
            {/* Boss and Team Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-lg p-3 border border-border"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{bossPlayer.name}</span>
                <span className="text-sm text-muted-foreground">HP: {Math.max(0, bossPlayer.hp)}/5000</span>
              </div>
              <div className="w-full h-6 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-red-500"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(Math.max(0, bossPlayer.hp) / 5000) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-2">
              {teamPlayers.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg border ${
                    player.isEliminated
                      ? "border-border bg-muted/50"
                      : currentActor?.id === player.id
                      ? "border-primary bg-primary/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium truncate">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.max(0, player.hp)}/{player.maxHp}</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(Math.max(0, player.hp) / player.maxHp) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Battle Log */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-muted rounded-lg p-3 max-h-32 overflow-y-auto"
            >
              {battleLog.map((log, idx) => (
                <p key={idx} className="text-xs text-foreground mb-1">
                  {log}
                </p>
              ))}
            </motion.div>

            {/* Skill Selection */}
            {phase === "selecting" && currentActor && (
              <>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-sm font-bold mb-2">{currentActor.name}のターン</p>
                  <p className="text-xs text-muted-foreground mb-3">スキルを選択してください</p>
                  <div className="grid grid-cols-2 gap-2">
                    {currentSkills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
                        className={`p-2 rounded-lg text-left border text-xs transition-all ${
                          selectedSkill?.id === skill.id
                            ? "border-primary bg-primary/20"
                            : "border-border bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <p className="font-medium">{skill.name}</p>
                        <p className="text-muted-foreground">{skill.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Selection */}
                {selectedSkill && (
                  <div className="bg-card rounded-lg p-3 border border-primary">
                    <p className="text-xs font-bold mb-2">対象を選択</p>
                    <div className="space-y-2">
                      {selectedSkill.type === "aoe" ? (
                        <Button
                          className="w-full text-xs"
                          onClick={() => {
                            executeSkill(currentActor, selectedSkill, allAlivePlayers.filter(p => p.id !== currentActor.id))
                            setCurrentActorIndex((prev) => (prev + 1) % teamPlayers.length)
                          }}
                        >
                          全敵に使用
                        </Button>
                      ) : (
                        allAlivePlayers
                          .filter(p => p.id !== currentActor.id)
                          .map((player) => (
                            <Button
                              key={player.id}
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => {
                                executeSkill(currentActor, selectedSkill, [player])
                                setCurrentActorIndex((prev) => (prev + 1) % teamPlayers.length)
                              }}
                            >
                              {player.name}
                            </Button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {phase === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-lg p-6 text-center text-white ${
              bossPlayer && bossPlayer.hp <= 0
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-red-500 to-rose-600"
            }`}
          >
            <div className="text-5xl mb-4">{bossPlayer && bossPlayer.hp <= 0 ? "🎉" : "☠️"}</div>
            <h2 className="text-2xl font-bold mb-4">
              {bossPlayer && bossPlayer.hp <= 0 ? "勝利！" : "敗北..."}
            </h2>
            {bossPlayer && bossPlayer.hp <= 0 && (
              <div className="bg-black/20 rounded-lg p-4 mb-4">
                <p className="mb-2">ヘアグランドを倒した！</p>
                <p className="text-xl font-bold mb-2">👑 コズミックレア</p>
                <p className="text-lg">超次元毛根魔王ヘアグランド</p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm">+1000 コイン</p>
                  <p className="text-sm">+500 経験値</p>
                </div>
              </div>
            )}
            {bossPlayer && bossPlayer.hp > 0 && (
              <div className="bg-black/20 rounded-lg p-4 mb-4">
                <p className="text-lg">すべての毛根が絶滅した...</p>
              </div>
            )}
            <Button
              className={`w-full ${
                bossPlayer && bossPlayer.hp <= 0
                  ? "bg-white text-green-600 hover:bg-gray-100"
                  : "bg-white text-red-600 hover:bg-gray-100"
              }`}
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
