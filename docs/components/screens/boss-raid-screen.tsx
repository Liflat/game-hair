"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, BOSS_HAIR_ROOT, calculateStats, calculateSkillBonus, getElementCombatModifiers, BOSS_RAID_SKILLS, type HairRoot, type Skill, type CollectedHairRoot, type Element } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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

type BattlePhase = "preparation" | "selecting" | "action" | "finished"

export function BossRaidScreen({ onNavigate }: BossRaidScreenProps) {
  const { collection, defeatBossRaid } = useGame()
  const [phase, setPhase] = useState<BattlePhase>("preparation")
  const [selectedTeam, setSelectedTeam] = useState<CollectedHairRoot[]>([])
  const [players, setPlayers] = useState<BattlePlayer[]>([])
  const [round, setRound] = useState(1)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)

  const boss = BOSS_HAIR_ROOT
  const canStartBattle = selectedTeam.length === 5

  const handleTeamSelection = (hairRoot: CollectedHairRoot) => {
    if (selectedTeam.find(h => h.id === hairRoot.id && h.level === hairRoot.level)) {
      setSelectedTeam(selectedTeam.filter(h => !(h.id === hairRoot.id && h.level === hairRoot.level)))
    } else if (selectedTeam.length < 5) {
      setSelectedTeam([...selectedTeam, hairRoot])
    }
  }

  const initializeBattle = () => {
    // Create boss player with raid-specific skills and level
    const bossWithRaidSkills = {
      ...boss,
      level: 1,
      exp: 0,
      count: 1,
      skills: BOSS_RAID_SKILLS,
    } as CollectedHairRoot
    
    // Calculate boss HP safely
    const bossStats = calculateStats(bossWithRaidSkills)
    const bossMaxHp = Math.max(1, Math.floor((1000 + (bossStats?.power ?? 0) + (bossStats?.grip ?? 0)) * 1.5))
    
    const bossPlayer: BattlePlayer = {
      id: 999,
      name: boss.name,
      hairRoot: bossWithRaidSkills,
      hp: Math.max(1, bossMaxHp),
      maxHp: Math.max(1, bossMaxHp),
      isEliminated: false,
      cooldowns: {},
      statusEffects: [],
      buffedStats: { power: 0, speed: 0, grip: 0 },
    }

    // Create team players
    const teamPlayers: BattlePlayer[] = selectedTeam.map((hair, idx) => {
      const stats = calculateStats(hair)
      const power = stats?.power ?? 0
      const grip = stats?.grip ?? 0
      const maxHp = Math.max(1, Math.floor((100 + power + grip) * 1.2))
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

    setPlayers([bossPlayer, ...teamPlayers])
    setPhase("selecting")
    setBattleLog(["魔王ヘアグランドが降臨した！", "「全次元の力で、お前達を消し去ってやる...」"])
  }

  const getElementDamageMod = (attacker: HairRoot, defender: HairRoot): number => {
    if (!attacker.element || !defender.element) return 1.0
    const mods = getElementCombatModifiers(attacker.element, defender.element)
    return mods.attackMod
  }

  const executePlayerAction = (targetId?: number) => {
    if (!selectedSkill || isExecuting) return
    
    // If target is provided as parameter, use it; otherwise use selectedTarget state
    const targetToUse = targetId !== undefined ? targetId : selectedTarget
    
    // Find the currently active player (first non-eliminated team member)
    const activePlayer = players.find(p => p.id !== 999 && !p.isEliminated)
    if (!activePlayer) return

    setIsExecuting(true)
    setPhase("action")

    setPlayers((prev) => {
      const newPlayers = [...prev]
      const player = newPlayers.find(p => p.id === activePlayer.id)
      const boss = newPlayers.find(p => p.id === 999)
      if (!player || !boss) return prev
      const aliveTeamPlayers = newPlayers.filter(p => p.id !== 999 && !p.isEliminated)

      if (!player) return prev

      const stats = calculateStats(player.hairRoot as CollectedHairRoot)
      const buffedPower = (stats?.power ?? 0) + (player.buffedStats.power || 0)

      const newLog: string[] = []

      // Process skill based on type
      if (selectedSkill.id === "normal-attack") {
        // Normal attack - always 15 damage
        if (targetToUse !== null) {
          const target = newPlayers.find(p => p.id === targetToUse)
          if (target && !target.isEliminated) {
            const baseDamage = 15
            const elementMod = getElementDamageMod(player.hairRoot, target.hairRoot)
            const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
            
            // Apply defense buff if exists
            const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
            const damageAfterDefense = defenseEffect?.value 
              ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
              : finalDamage

            target.hp = Math.max(0, target.hp - damageAfterDefense)
            
            const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
            const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
            newLog.push(`${player.name}の通常攻撃が${target.name}に${damageAfterDefense}ダメージ!${elementNote}${defenseNote}`)
            
            if (target.hp <= 0) {
              target.isEliminated = true
              if (target.id === 999) {
                newLog.push("ヘアグランドを倒した！")
                defeatBossRaid()
              } else {
                newLog.push(`${target.name}が脱落!`)
              }
            }
          }
        }
      } else if (selectedSkill.id === "normal-defense") {
        // Normal defense - 20% damage reduction for 1 turn
        player.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: 1,
          value: 20
        })
        newLog.push(`${player.name}は通常防御で20%のダメージを軽減!`)
      } else if (selectedSkill.type === "attack") {
        if (targetToUse !== null) {
          const target = newPlayers.find(p => p.id === targetToUse)
          if (target && !target.isEliminated) {
            const baseDamage = selectedSkill.damage || 0
            const elementMod = getElementDamageMod(player.hairRoot, target.hairRoot)
            const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
            
            // Apply defense buff if exists
            const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
            const damageAfterDefense = defenseEffect?.value 
              ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
              : finalDamage

            target.hp = Math.max(0, target.hp - damageAfterDefense)
            
            const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
            const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
            newLog.push(`${player.name}の${selectedSkill.name}が${target.name}に${damageAfterDefense}ダメージ!${elementNote}${defenseNote}`)
            
            if (target.hp <= 0) {
              target.isEliminated = true
              if (target.id === 999) {
                newLog.push("ヘアグランドを倒した！")
                defeatBossRaid()
              } else {
                newLog.push(`${target.name}が脱落!`)
              }
            }
          }
        }
      } else if (selectedSkill.type === "aoe") {
        // Player AOE only targets the boss
        const targets = [boss]

        targets.forEach(target => {
          const baseDamage = selectedSkill.damage || 0
          const elementMod = getElementDamageMod(player.hairRoot, target.hairRoot)
          const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
          
          const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
          const damageAfterDefense = defenseEffect?.value 
            ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
            : finalDamage

          target.hp = Math.max(0, target.hp - damageAfterDefense)
          
          const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
          const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
          newLog.push(`${selectedSkill.name}が${target.name}に${damageAfterDefense}ダメージ!${elementNote}${defenseNote}`)
          
          if (target.hp <= 0) {
            target.isEliminated = true
            if (target.id === 999) {
              newLog.push("ヘアグランドを倒した！")
              defeatBossRaid()
            } else {
              newLog.push(`${target.name}が脱落!`)
            }
          }
        })
      } else if (selectedSkill.type === "defense") {
        // Defense skills
        const skillBonus = calculateSkillBonus(player.hairRoot as CollectedHairRoot)
        let defenseValue = 20

        if (selectedSkill.id === "normal-defense") {
          defenseValue = 20
        } else if (selectedSkill.id === "demon-king-shell") {
          defenseValue = 90
        } else {
          defenseValue = 25
        }

        const finalDefenseValue = Math.min(100, Math.floor(defenseValue * skillBonus))
        player.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: 1,
          value: finalDefenseValue
        })
        newLog.push(`${player.name}の${selectedSkill.name}で${finalDefenseValue}%ダメージ軽減!`)
      } else if (selectedSkill.type === "special") {
        // Special skills
        if (selectedSkill.id === "absolute-zero") {
          const skillBonus = calculateSkillBonus(player.hairRoot as CollectedHairRoot)
          const targets = [boss, ...aliveTeamPlayers]
          const baseDamage = selectedSkill.damage || 0
          
          targets.forEach(target => {
            const elementMod = getElementDamageMod(player.hairRoot, target.hairRoot)
            const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
            
            const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
            const damageAfterDefense = defenseEffect?.value 
              ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
              : finalDamage

            target.hp = Math.max(0, target.hp - damageAfterDefense)
            
            // Add debuff
            target.statusEffects.push({
              type: "debuff",
              name: "全ステータスダウン",
              duration: 2,
              value: 20,
              stat: "all"
            })
            
            newLog.push(`${selectedSkill.name}が${target.name}に${damageAfterDefense}ダメージ! (全ステータス20%ダウン)`)
            
            if (target.hp <= 0) {
              target.isEliminated = true
              if (target.id === 999) {
                newLog.push("ヘアグランドを倒した！")
                defeatBossRaid()
              } else {
                newLog.push(`${target.name}が脱落!`)
              }
            }
          })
        }
      } else if (selectedSkill.type === "team_heal") {
        // Healing skills - target single teammate
        const skillBonus = calculateSkillBonus(player.hairRoot as CollectedHairRoot)
        const target = targetToUse !== null ? newPlayers.find(p => p.id === targetToUse) : player
        
        if (target && !target.isEliminated) {
          const baseHeal = selectedSkill.damage || 50
          const healAmount = Math.floor(baseHeal * skillBonus)
          target.hp = Math.min(target.maxHp, target.hp + healAmount)
          newLog.push(`${player.name}の${selectedSkill.name}で${target.name}を${healAmount}回復した！`)
        }
      }

      // Update cooldowns for this skill
      if (selectedSkill.cooldown > 0) {
        player.cooldowns = {
          ...player.cooldowns,
          [selectedSkill.id]: selectedSkill.cooldown
        }
      }

      // Reduce all cooldowns
      newPlayers.forEach(p => {
        Object.keys(p.cooldowns).forEach(skillId => {
          if (p.cooldowns[skillId] > 0) {
            p.cooldowns[skillId]--
          }
        })
      })

      setBattleLog(prev => [...prev, ...newLog])
      return newPlayers
    })

    setTimeout(() => executeBossTurn(), 1500)
  }

  const executeBossTurn = () => {
    setPlayers((prev) => {
      const newPlayers = [...prev]
      const boss = newPlayers.find(p => p.id === 999)!
      const aliveTeam = newPlayers.filter(p => p.id !== 999 && !p.isEliminated)

      if (boss.isEliminated || aliveTeam.length === 0) {
        if (aliveTeam.length === 0) {
          setBattleLog(prev => [...prev, "すべての毛根が絶滅した..."])
        }
        setPhase("finished")
        setIsExecuting(false)
        return prev
      }

      const skills = boss.hairRoot.skills
      
      // Choose skill - prefer available skills, fallback to normal attack
      const availableSkills = skills.filter(s => (boss.cooldowns[s.id] || 0) <= 0)
      const selectedBossSkill = availableSkills.length > 0 
        ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
        : { id: "normal-attack", name: "通常攻撃", damage: 15, cooldown: 0, type: "attack" as const, description: "" }
      
      const newLog: string[] = []

      newLog.push(`ヘアグランドが「${selectedBossSkill.name}」を使用した！`)

      // Update cooldown for this skill
      if (selectedBossSkill.cooldown > 0) {
        boss.cooldowns = {
          ...boss.cooldowns,
          [selectedBossSkill.id]: selectedBossSkill.cooldown
        }
      }

      if (selectedBossSkill.id === "normal-attack" && aliveTeam.length > 0) {
        const target = aliveTeam[Math.floor(Math.random() * aliveTeam.length)]
        const stats = calculateStats(boss.hairRoot as unknown as CollectedHairRoot)
        const buffedPower = (stats?.power ?? 0) + (boss.buffedStats.power || 0)
        const baseDamage = 15
        const elementMod = getElementDamageMod(boss.hairRoot, target.hairRoot)
        const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
        
        const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
        const damageAfterDefense = defenseEffect?.value 
          ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
          : finalDamage

        target.hp = Math.max(0, target.hp - damageAfterDefense)
        
        const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
        newLog.push(`${target.name}に${damageAfterDefense}ダメージ!${defenseNote}`)
        
        if (target.hp <= 0) {
          target.isEliminated = true
          newLog.push(`${target.name}が脱落!`)
        }
      } else if (selectedBossSkill.id === "normal-defense") {
        // Normal defense - 20% damage reduction for 1 turn
        boss.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: 1,
          value: 20
        })
        newLog.push(`20%ダメージ軽減!`)
      } else if (selectedBossSkill.type === "attack" && aliveTeam.length > 0) {
        const target = aliveTeam[Math.floor(Math.random() * aliveTeam.length)]
        const stats = calculateStats(boss.hairRoot as unknown as CollectedHairRoot)
        const buffedPower = (stats?.power ?? 0) + (boss.buffedStats.power || 0)
        const baseDamage = selectedBossSkill.damage || 0
        const elementMod = getElementDamageMod(boss.hairRoot, target.hairRoot)
        const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
        
        const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
        const damageAfterDefense = defenseEffect?.value 
          ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
          : finalDamage

        target.hp = Math.max(0, target.hp - damageAfterDefense)
        
        const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
        newLog.push(`${target.name}に${damageAfterDefense}ダメージ!${defenseNote}`)
        
        if (target.hp <= 0) {
          target.isEliminated = true
          newLog.push(`${target.name}が脱落!`)
        }
      } else if (selectedBossSkill.type === "aoe") {
        aliveTeam.forEach(target => {
          const stats = calculateStats(boss.hairRoot as unknown as CollectedHairRoot)
          const buffedPower = (stats?.power ?? 0) + (boss.buffedStats.power || 0)
          const baseDamage = selectedBossSkill.damage || 0
          const elementMod = getElementDamageMod(boss.hairRoot, target.hairRoot)
          const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
          
          const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
          const damageAfterDefense = defenseEffect?.value 
            ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
            : finalDamage

          target.hp = Math.max(0, target.hp - damageAfterDefense)
          
          const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
          newLog.push(`${target.name}に${damageAfterDefense}ダメージ!${defenseNote}`)
          
          if (target.hp <= 0) {
            target.isEliminated = true
            newLog.push(`${target.name}が脱落!`)
          }
        })
      } else if (selectedBossSkill.type === "defense") {
        const skillBonus = calculateSkillBonus(boss.hairRoot as CollectedHairRoot)
        let defenseValue = 20

        if (selectedBossSkill.id === "normal-defense") {
          defenseValue = 20
        } else if (selectedBossSkill.id === "demon-king-shell-raid") {
          defenseValue = 90
        }

        const finalDefenseValue = Math.min(100, Math.floor(defenseValue * skillBonus))
        boss.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: 1,
          value: finalDefenseValue
        })
        newLog.push(`${finalDefenseValue}%ダメージ軽減!`)
      }

      // Reduce all cooldowns
      newPlayers.forEach(p => {
        Object.keys(p.cooldowns).forEach(skillId => {
          if (p.cooldowns[skillId] > 0) {
            p.cooldowns[skillId]--
          }
        })
      })

      setBattleLog(prev => [...prev, ...newLog])
      setRound(prev => prev + 1)
      setPhase("selecting")
      setSelectedSkill(null)
      setSelectedTarget(null)
      setIsExecuting(false)

      return newPlayers
    })
  }

  if (!boss) return null

  const boss_player = players.find(p => p.id === 999)
  const team_players = players.filter(p => p.id !== 999)
  const player = team_players.find(p => !p.isEliminated)
  const currentSkills = player ? player.hairRoot.skills : []
  const aliveTeam = team_players.filter(p => !p.isEliminated)
  const allAlivePlayers = boss_player && !boss_player.isEliminated ? [boss_player, ...aliveTeam] : aliveTeam

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
              <p className="text-xs text-muted-foreground mb-2">※ 所有している毛根5体を選択</p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {collection.map((hair, idx) => (
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

        {(phase === "selecting" || phase === "action") && boss_player && (
          <>
            {/* Boss Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-lg p-3 border border-border"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{boss_player.name}</span>
                <span className="text-sm text-muted-foreground">HP: {Math.max(0, Math.floor(boss_player.hp ?? boss_player.maxHp))}/{boss_player.maxHp}</span>
              </div>
              <div className="w-full h-6 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-red-500"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(Math.max(0, boss_player.hp ?? boss_player.maxHp) / boss_player.maxHp) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>

            {/* Team Status */}
            <div className="grid grid-cols-2 gap-2">
              {team_players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg border ${
                    p.isEliminated
                      ? "border-border bg-muted/50 opacity-50"
                      : player?.id === p.id
                      ? "border-primary bg-primary/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.max(0, Math.floor(p.hp ?? p.maxHp))}/{p.maxHp}</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(Math.max(0, p.hp ?? p.maxHp) / p.maxHp) * 100}%` }}
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
            {phase === "selecting" && player && !isExecuting && players.length > 0 && (
              <>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-sm font-bold mb-2">{player.name}のターン</p>
                  <p className="text-xs text-muted-foreground mb-3">スキルを選択してください</p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Normal Attack - always available */}
                    <button
                      onClick={() => setSelectedSkill({ id: "normal-attack", name: "通常攻撃", damage: 15, cooldown: 0, type: "attack", description: "威力: 15" })}
                      className={`p-2 rounded-lg text-left border text-xs transition-all ${
                        selectedSkill?.id === "normal-attack"
                          ? "border-primary bg-primary/20"
                          : "border-border bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <p className="font-medium">通常攻撃</p>
                      <p className="text-muted-foreground text-xs">威力: 15</p>
                    </button>

                    {/* Normal Defense - always available */}
                    <button
                      onClick={() => setSelectedSkill({ id: "normal-defense", name: "通常防御", damage: 0, cooldown: 0, type: "defense", description: "軽減: 20%" })}
                      className={`p-2 rounded-lg text-left border text-xs transition-all ${
                        selectedSkill?.id === "normal-defense"
                          ? "border-primary bg-primary/20"
                          : "border-border bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <p className="font-medium">通常防御</p>
                      <p className="text-muted-foreground text-xs">軽減: 20%</p>
                    </button>
                    {currentSkills.map((skill) => {
                      const onCooldown = (player.cooldowns[skill.id] || 0) > 0
                      return (
                        <button
                          key={skill.id}
                          onClick={() => !onCooldown && setSelectedSkill(skill)}
                          disabled={onCooldown}
                          className={`p-2 rounded-lg text-left border text-xs transition-all ${
                            onCooldown
                              ? "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                              : selectedSkill?.id === skill.id
                              ? "border-primary bg-primary/20"
                              : "border-border bg-muted hover:bg-muted/80"
                          }`}
                        >
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-muted-foreground text-xs">{skill.description}</p>
                          {onCooldown && <p className="text-muted-foreground text-xs mt-1">CT: {player.cooldowns[skill.id]}</p>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Target Selection for Normal Attack */}
                {selectedSkill?.id === "normal-attack" && (
                  <div className="bg-card rounded-lg p-3 border border-primary">
                    <p className="text-xs font-bold mb-2">対象を選択</p>
                    <div className="space-y-2">
                      {boss_player && !boss_player.isEliminated && (
                        <Button
                          className="w-full text-xs"
                          variant={selectedTarget === 999 ? "default" : "outline"}
                          onClick={() => executePlayerAction(999)}
                          disabled={isExecuting}
                        >
                          {boss_player.name}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Target Selection for Normal Defense */}
                {selectedSkill?.id === "normal-defense" && (
                  <Button
                    className="w-full text-xs"
                    onClick={() => executePlayerAction()}
                    disabled={isExecuting}
                  >
                    防御 - {player.name}に使用
                  </Button>
                )}

                {/* Target Selection for other skills */}
                {selectedSkill && selectedSkill.id !== "normal-attack" && selectedSkill.id !== "normal-defense" && (
                  <div className="bg-card rounded-lg p-3 border border-primary">
                    <p className="text-xs font-bold mb-2">対象を選択</p>
                    <div className="space-y-2">
                      {selectedSkill.type === "defense" ? (
                        <Button
                          className="w-full text-xs"
                          onClick={() => executePlayerAction()}
                          disabled={isExecuting}
                        >
                          防御 - {player.name}に使用
                        </Button>
                      ) : selectedSkill.type === "team_heal" ? (
                        // Heal skill - select teammate
                        team_players
                          .filter(p => !p.isEliminated)
                          .map((p) => (
                            <Button
                              key={p.id}
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => executePlayerAction(p.id)}
                              disabled={isExecuting}
                            >
                              {p.name}
                            </Button>
                          ))
                      ) : selectedSkill.type === "special" ? (
                        <Button
                          className="w-full text-xs"
                          onClick={() => executePlayerAction()}
                          disabled={isExecuting}
                        >
                          全体スキル - {selectedSkill.name}
                        </Button>
                      ) : selectedSkill.type === "aoe" ? (
                        <Button
                          className="w-full text-xs"
                          onClick={() => executePlayerAction()}
                          disabled={isExecuting}
                        >
                          全敵に使用
                        </Button>
                      ) : (
                        // Attack skill - only target boss
                        boss_player && !boss_player.isEliminated && (
                          <Button
                            key={boss_player.id}
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => executePlayerAction(boss_player.id)}
                            disabled={isExecuting}
                          >
                            {boss_player.name}
                          </Button>
                        )
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
              boss_player && boss_player.hp <= 0
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-red-500 to-rose-600"
            }`}
          >
            <div className="text-5xl mb-4">{boss_player && boss_player.hp <= 0 ? "🎉" : "☠️"}</div>
            <h2 className="text-2xl font-bold mb-4">
              {boss_player && boss_player.hp <= 0 ? "勝利！" : "敗北..."}
            </h2>
            {boss_player && boss_player.hp <= 0 && (
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
            {boss_player && boss_player.hp > 0 && (
              <div className="bg-black/20 rounded-lg p-4 mb-4">
                <p className="text-lg">すべての毛根が絶滅した...</p>
              </div>
            )}
            <Button
              className={`w-full ${
                boss_player && boss_player.hp <= 0
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
