"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, BOSS_HAIR_ROOTS, BOSS_RAID_CONFIGS, calculateStats, calculateMaxHp, calculateSkillBonus, calculateNormalAttackDamage, calculateNormalDefenseReduction, getElementCombatModifiers, getDefenseSkillEffect, type HairRoot, type Skill, type CollectedHairRoot, type Element, type Rarity } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BossRaidScreenProps {
  onNavigate: (screen: Screen) => void
  bossId?: number
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
  level: number
}

const RARITY_ORDER: Record<Rarity, number> = {
  master: 7,
  cosmic: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
}

type BattlePhase = "preparation" | "selecting" | "action" | "finished"

export function BossRaidScreen({ onNavigate, bossId = 53 }: BossRaidScreenProps) {
  const { collection, defeatBossRaid } = useGame()
  const [phase, setPhase] = useState<BattlePhase>("preparation")
  
  // Get boss configuration
  const bossConfig = BOSS_RAID_CONFIGS[bossId]
  if (!bossConfig) {
    // Fallback to default boss if invalid ID
    console.error(`Invalid boss ID: ${bossId}, falling back to default`)
  }
  const config = bossConfig || BOSS_RAID_CONFIGS[53]
  const [selectedTeam, setSelectedTeam] = useState<CollectedHairRoot[]>([])
  const [players, setPlayers] = useState<BattlePlayer[]>([])
  const [round, setRound] = useState(1)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [sortType, setSortType] = useState<"level" | "rarity" | "count">("level")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const boss = config.boss
  const bossSkills = config.skills
  const bossMaxHp = config.maxHp
  const canStartBattle = selectedTeam.length === 5

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

  const toggleSort = (type: "level" | "rarity" | "count") => {
    if (sortType === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortType(type)
      setSortOrder("desc")
    }
  }

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
      skills: bossSkills,
    } as CollectedHairRoot
    
    // Calculate boss HP safely
    const bossStats = calculateStats(bossWithRaidSkills)
    
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
      level: 1,
    }

    // Create team players
    const teamPlayers: BattlePlayer[] = selectedTeam.map((hair, idx) => {
      const baseMaxHp = calculateMaxHp(hair)
      const maxHp = Math.max(1, Math.floor(baseMaxHp * 1.2))
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
        level: hair.level,
      }
    })

    setPlayers([bossPlayer, ...teamPlayers])
    setPhase("selecting")
    setBattleLog([`${boss.name}が降臨した！`])
  }

  const getElementDamageMod = (attacker: HairRoot, defender: HairRoot): number => {
    if (!attacker.element || !defender.element) return 1.0
    const mods = getElementCombatModifiers(attacker.element, defender.element)
    return mods.attackMod
  }

  const triggerAllFather = (
    attacker: BattlePlayer,
    defender: BattlePlayer,
    newLog: string[],
    newPlayers: BattlePlayer[]
  ): boolean => {
    // Check for dodge-skill avoidance first
    const dodgeBuff = defender.statusEffects.find(e => e.type === "buff" && e.name === "回避準備")
    if (dodgeBuff) {
      defender.statusEffects = defender.statusEffects.filter(e => e.name !== "回避準備")
      newLog.push(`${defender.name}の回避で攻撃を完全に回避した!`)
      return true
    }

    const allFatherBuff = defender.statusEffects.find(e => e.type === "buff" && e.name === "オールファーザー")
    if (!allFatherBuff) return false

    const counterBuff = defender.statusEffects.find(e => e.type === "buff" && e.name === "反撃準備")
    defender.statusEffects = defender.statusEffects.filter(
      e => e.name !== "オールファーザー" && e.name !== "反撃準備"
    )

    newLog.push(`${defender.name}はオールファーザーで攻撃を完全回避!`)

    if (counterBuff?.value) {
      const counterDamage = counterBuff.value
      attacker.hp = Math.max(0, attacker.hp - counterDamage)
      newLog.push(`${defender.name}の反撃が${attacker.name}に${counterDamage}ダメージ!`)

      if (attacker.hp <= 0) {
        attacker.isEliminated = true
        if (attacker.id === 999) {
          newLog.push(`${boss.name}を倒した！`)
          defeatBossRaid(bossId)
        } else {
          newLog.push(`${attacker.name}が脱落!`)
        }
      }
    }

    return true
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

      const newLog: string[] = []

      // Check if player is stunned
      const isStunned = player.statusEffects.some((e) => e.type === "stun")
      if (isStunned) {
        newLog.push(`${player.name}は行動不能!`)
        setBattleLog((prev) => [...prev, ...newLog])
        setPhase("action")
        setTimeout(() => {
          executeBossAction()
        }, 1500)
        return prev
      }

      const stats = calculateStats(player.hairRoot as CollectedHairRoot)
      const buffedPower = (stats?.power ?? 0) + (player.buffedStats.power || 0)

      const applyAttack = (
        attacker: BattlePlayer,
        target: BattlePlayer,
        baseDamage: number,
        label: string
      ) => {
        // Check for all-father dodge
        if (triggerAllFather(attacker, target, newLog, newPlayers)) {
          // Attack was dodged
          return
        }

        const attackerStats = calculateStats(attacker.hairRoot as CollectedHairRoot)
        const attackerPower = (attackerStats?.power ?? 0) + (attacker.buffedStats.power || 0)
        const elementMod = getElementDamageMod(attacker.hairRoot, target.hairRoot)
        const finalDamage = Math.floor(baseDamage * (1 + attackerPower / 100) * elementMod)

        const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
        const damageAfterDefense = defenseEffect?.value
          ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
          : finalDamage

        target.hp = Math.max(0, target.hp - damageAfterDefense)

        const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
        const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
        newLog.push(`${attacker.name}${label}${target.name}に${damageAfterDefense}ダメージ!${elementNote}${defenseNote}`)

        if (target.hp <= 0) {
          target.isEliminated = true
          if (target.id === 999) {
            newLog.push(`${boss.name}を倒した！`)
            defeatBossRaid(bossId)
          } else {
            newLog.push(`${target.name}が脱落!`)
          }
        }
      }

      // Process skill based on type
      if (selectedSkill.id === "normal-attack") {
        // Normal attack - use calculated damage based on level and rarity
        if (targetToUse !== null) {
          const target = newPlayers.find(p => p.id === targetToUse)
          if (target && !target.isEliminated) {
            // Check for all-father dodge
            if (triggerAllFather(player, target, newLog, newPlayers)) {
              // Attack was dodged
            } else {
              const baseDamage = calculateNormalAttackDamage({ ...player.hairRoot, level: player.level, exp: 0, count: 1 } as CollectedHairRoot)
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
                  newLog.push(`${boss.name}を倒した！`)
                  defeatBossRaid(bossId)
                } else {
                  newLog.push(`${target.name}が脱落!`)
                }
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
            // Check for all-father dodge
            if (triggerAllFather(player, target, newLog, newPlayers)) {
              // Attack was dodged
            } else {
              const skillBonus = calculateSkillBonus({ ...player.hairRoot, level: player.level, exp: 0, count: 1 })
              const baseDamage = Math.floor((selectedSkill.damage || 0) * skillBonus)
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
                  newLog.push(`${boss.name}を倒した！`)
                  defeatBossRaid(bossId)
                } else {
                  newLog.push(`${target.name}が脱落!`)
                }
              }
            }
          }
        }
      } else if (selectedSkill.type === "aoe") {
        // Player AOE only targets the boss
        const targets = [boss]

        targets.forEach(target => {
          // Check for all-father dodge
          if (triggerAllFather(player, target, newLog, newPlayers)) {
            // Attack was dodged
          } else {
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
                newLog.push(`${boss.name}を倒した！`)
                defeatBossRaid(bossId)
              } else {
                newLog.push(`${target.name}が脱落!`)
              }
            }
          }
        })
      } else if (selectedSkill.type === "defense") {
        // Defense skills
        const skillBonus = calculateSkillBonus(player.hairRoot as CollectedHairRoot)
        let finalDefenseValue: number
        
        // For normal defense, use calculated value; for others use skill effect
        if (selectedSkill.id === "normal-defense") {
          finalDefenseValue = calculateNormalDefenseReduction({ ...player.hairRoot, level: player.level, exp: 0, count: 1 } as CollectedHairRoot)
        } else {
          const defenseEffect = getDefenseSkillEffect(selectedSkill.id)
          finalDefenseValue = Math.min(100, Math.floor(defenseEffect.reduction * skillBonus))
        }
        
        player.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: selectedSkill.id === "normal-defense" ? 1 : getDefenseSkillEffect(selectedSkill.id).duration,
          value: finalDefenseValue
        })
        
        if (selectedSkill.id === "normal-defense") {
          newLog.push(`${player.name}の${selectedSkill.name}で${finalDefenseValue}%ダメージ軽減!`)
        } else {
          const defenseEffect = getDefenseSkillEffect(selectedSkill.id)
          if (defenseEffect.log) {
            newLog.push(defenseEffect.log)
          } else {
            newLog.push(`${player.name}の${selectedSkill.name}で${finalDefenseValue}%ダメージ軽減!`)
          }
        }
      } else if (selectedSkill.type === "dodge") {
        // Dodge skills - next attack is completely avoided
        player.statusEffects.push({
          type: "buff",
          name: "回避準備",
          duration: 1,
          value: 100
        })
        newLog.push(`${player.name}の${selectedSkill.name}で次の攻撃を完全に回避できる態勢を整えた!`)
      } else if (selectedSkill.type === "special") {
        // Special skills - no skill bonus for heal/buff/debuff skills
        
        if (selectedSkill.id === "absolute-zero") {
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
                newLog.push(`${boss.name}を倒した！`)
                defeatBossRaid(bossId)
              } else {
                newLog.push(`${target.name}が脱落!`)
              }
            }
          })
        } else if (selectedSkill.id === "bounce-back" || selectedSkill.id === "helix-heal") {
          const healAmount = Math.floor(player.maxHp * 0.25)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          newLog.push(`${player.name}は${selectedSkill.name}でHPを${healAmount}回復!`)
        } else if (selectedSkill.id === "static-field" || selectedSkill.id === "entangle") {
          boss.statusEffects.push({
            type: "stun",
            name: selectedSkill.id === "static-field" ? "麻痺" : "拘束",
            duration: 1
          })
          newLog.push(`${boss.name}は${selectedSkill.name}で動けなくなった!`)
        } else if (selectedSkill.id === "rainbow-aura") {
          const buffValue = 20
          player.buffedStats.power += buffValue
          player.buffedStats.speed += buffValue
          player.buffedStats.grip += buffValue
          player.statusEffects.push({
            type: "buff",
            name: "虹のオーラ",
            duration: 3,
            value: buffValue
          })
          newLog.push(`虹のオーラで全ステータス+${buffValue}!`)
        } else if (selectedSkill.id === "holy-blessing") {
          const buffValue = 50
          player.buffedStats.power += buffValue
          player.buffedStats.speed += buffValue
          player.buffedStats.grip += buffValue
          const healAmount = Math.floor(player.maxHp * 0.4)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          player.statusEffects.push({
            type: "buff",
            name: "神の祝福",
            duration: 4,
            value: buffValue
          })
          newLog.push(`神の祝福! 全ステータス+${buffValue}、HP${healAmount}回復!`)
        } else if (selectedSkill.id === "rebirth") {
          const healAmount = Math.floor(player.maxHp * 0.7)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          newLog.push(`不死鳥の再生! ${healAmount}HP回復!`)
        } else if (selectedSkill.id === "rewind") {
          const healAmount = Math.floor(player.maxHp * 0.35)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          player.statusEffects.push({
            type: "buff",
            name: "時間歪曲",
            duration: 1,
            value: 100
          })
          newLog.push(`時を戻した! HP${healAmount}回復+1ターン無敵!`)
        } else if (selectedSkill.id === "toxic-cloud") {
          boss.statusEffects.push({
            type: "debuff",
            name: "毒",
            duration: 3,
            value: 10
          })
          newLog.push(`毒霧が${boss.name}を包み込んだ!`)
        } else if (selectedSkill.id === "moon-blessing") {
          const healAmount = Math.floor(player.maxHp * 0.4)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          newLog.push(`月の加護で${healAmount}HP回復!`)
        } else if (selectedSkill.id === "sunlight-heal") {
          const healAmount = Math.floor(player.maxHp * 0.5)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          player.buffedStats.power += 25
          player.statusEffects.push({
            type: "buff",
            name: "太陽の力",
            duration: 3,
            value: 25
          })
          newLog.push(`日光でHP${healAmount}回復+攻撃力UP!`)
        } else if (selectedSkill.id === "hellfire-breath") {
          const targets = [boss, ...aliveTeamPlayers]
          const burnDamage = 30
          targets.forEach(target => {
            if (target.id === player.id) return
            target.hp = Math.max(0, target.hp - burnDamage)
            target.statusEffects.push({
              type: "debuff",
              name: "炎上",
              duration: 2,
              value: 15
            })
            if (target.hp <= 0) {
              target.isEliminated = true
              if (target.id === 999) {
                newLog.push(`${boss.name}を倒した！`)
                defeatBossRaid(bossId)
              } else {
                newLog.push(`${target.name}が脱落!`)
              }
            }
          })
          newLog.push(`地獄の炎が全員を焼き尽くす! ${burnDamage}ダメージ+炎上!`)
        } else if (selectedSkill.id === "einherjar") {
          const healAmount = Math.floor(player.maxHp * 0.6)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          player.statusEffects.push({
            type: "buff",
            name: "勇者の魂",
            duration: 2,
            value: 50
          })
          newLog.push(`勇者の魂が宿る! HP${healAmount}回復+防御強化!`)
        } else if (selectedSkill.id === "all-father") {
          player.statusEffects.push({
            type: "buff",
            name: "オールファーザー",
            duration: 1,
            value: 100
          })
          player.statusEffects.push({
            type: "buff",
            name: "反撃準備",
            duration: 1,
            value: 80
          })
          newLog.push(`全知の力発動! 次の攻撃を完全回避+反撃準備!`)
        } else if (selectedSkill.id === "end-world") {
          // エンドワールドはボスに対して無効
          newLog.push(`${selectedSkill.name}が発動したが、${boss.name}の力の前に通じなかった!`) 
        } else {
          newLog.push(`${selectedSkill.name}発動!`)
        }
      } else if (selectedSkill.type === "team_heal") {
        // Healing skills - olympus-blessing and divine-light heal all, others heal single teammate
        const skillBonus = calculateSkillBonus(player.hairRoot as CollectedHairRoot)
        const isFullHeal = selectedSkill.id === "olympus-blessing" || selectedSkill.id === "divine-light"
        
        if (isFullHeal) {
          // Full heal all alive teammates
          aliveTeamPlayers.forEach(ally => {
            let healAmount: number
            if (selectedSkill.id === "divine-light") {
              // divine-light heals 50% of max HP
              healAmount = Math.floor(ally.maxHp * 0.5 * skillBonus)
            } else {
              // olympus-blessing fully recovers HP
              healAmount = ally.maxHp
            }
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount)
          })
          const healMessage = selectedSkill.id === "divine-light" 
            ? `${player.name}の${selectedSkill.name}で全員のHP50%が回復した！`
            : `${player.name}の${selectedSkill.name}で全員のHPが完全回復した！`
          newLog.push(healMessage)
        } else {
          // Single target heal
          const target = targetToUse !== null ? newPlayers.find(p => p.id === targetToUse) : player
          if (target && !target.isEliminated) {
            const baseHeal = selectedSkill.damage || 50
            const healAmount = Math.floor(baseHeal * skillBonus)
            target.hp = Math.min(target.maxHp, target.hp + healAmount)
            newLog.push(`${player.name}の${selectedSkill.name}で${target.name}を${healAmount}回復した！`)
          }
        }
      }

      // Allies act together after the player's action (heal priority, then skills)
      if (!boss.isEliminated) {
        const allies = aliveTeamPlayers.filter(p => p.id !== player.id)
        const getLowestHpAlly = (targets: BattlePlayer[]) => {
          if (targets.length === 0) return null
          return targets.reduce((lowest, current) => {
            const lowestRatio = lowest.hp / lowest.maxHp
            const currentRatio = current.hp / current.maxHp
            return currentRatio < lowestRatio ? current : lowest
          }, targets[0])
        }

        const healer = allies.find(a => a.hairRoot.skills.some(s => s.type === "team_heal")) || allies[0]
        const needsHealing = aliveTeamPlayers.some(p => p.hp / p.maxHp < 0.5)

        allies.forEach((ally) => {
          if (boss.isEliminated || ally.isEliminated) return

          // Check if ally is stunned
          const isStunned = ally.statusEffects.some((e) => e.type === "stun")
          if (isStunned) {
            newLog.push(`${ally.name}は行動不能!`)
            return
          }

          const availableSkills = ally.hairRoot.skills.filter(s => (ally.cooldowns[s.id] || 0) <= 0)
          const normalDefenseReduction = calculateNormalDefenseReduction({ ...ally.hairRoot, level: ally.level, exp: 0, count: 1 } as CollectedHairRoot)
          const normalDefense: Skill = { id: "normal-defense", name: "通常防御", damage: 0, cooldown: 0, type: "defense", description: `軽減: ${normalDefenseReduction}%` }
          const skillPool = [...availableSkills, normalDefense]
          const defensiveSkills = skillPool.filter(s => s.type === "defense" || s.type === "dodge")
          const offensiveSkills = skillPool.filter(s => s.type !== "defense" && s.type !== "team_heal" && s.type !== "dodge")

          const isHealer = healer && ally.id === healer.id
          const healTarget = isHealer && needsHealing ? getLowestHpAlly(aliveTeamPlayers) : null
          const healSkill = isHealer ? availableSkills.find(s => s.type === "team_heal") : undefined

          let chosenSkill: Skill = { id: "normal-attack", name: "通常攻撃", damage: calculateNormalAttackDamage({ ...ally.hairRoot, level: ally.level, exp: 0, count: 1 } as CollectedHairRoot), cooldown: 0, type: "attack", description: `威力: ${calculateNormalAttackDamage({ ...ally.hairRoot, level: ally.level, exp: 0, count: 1 } as CollectedHairRoot)}` }
          let chosenTarget: BattlePlayer | null = null

          if (healSkill && healTarget && healTarget.hp / healTarget.maxHp < 0.5) {
            chosenSkill = healSkill
            chosenTarget = healTarget
          } else if (defensiveSkills.length > 0 && ally.hp / ally.maxHp < 0.5) {
            chosenSkill = defensiveSkills[0]
          } else if (defensiveSkills.length > 0 && Math.random() < 0.25) {
            chosenSkill = defensiveSkills[Math.floor(Math.random() * defensiveSkills.length)]
          } else if (offensiveSkills.length > 0) {
            const preferredOrder: Skill["type"][] = ["attack", "aoe", "special"]
            for (const pref of preferredOrder) {
              const match = offensiveSkills.find(s => s.type === pref)
              if (match) {
                chosenSkill = match
                break
              }
            }
          }

          if (chosenSkill.type === "team_heal") {
            // No skill bonus for healing - use base values
            const isFullHeal = chosenSkill.id === "olympus-blessing" || chosenSkill.id === "divine-light"
            
            if (isFullHeal) {
              // Full heal all alive teammates
              aliveTeamPlayers.forEach(allyTarget => {
                let healAmount: number
                if (chosenSkill.id === "divine-light") {
                  // divine-light heals 50% of max HP
                  healAmount = Math.floor(allyTarget.maxHp * 0.5)
                } else {
                  // olympus-blessing fully recovers HP
                  healAmount = allyTarget.maxHp
                }
                allyTarget.hp = Math.min(allyTarget.maxHp, allyTarget.hp + healAmount)
              })
              const healMessage = chosenSkill.id === "divine-light"
                ? `${ally.name}の${chosenSkill.name}で全員のHP50%が回復した！`
                : `${ally.name}の${chosenSkill.name}で全員のHPが完全回復した！`
              newLog.push(healMessage)
            } else if (chosenTarget) {
              // Single target heal
              const baseHeal = chosenSkill.damage || 50
              const healAmount = baseHeal
              chosenTarget.hp = Math.min(chosenTarget.maxHp, chosenTarget.hp + healAmount)
              newLog.push(`${ally.name}の${chosenSkill.name}で${chosenTarget.name}を${healAmount}回復した！`)
            }
          } else if (chosenSkill.type === "defense") {
            // No skill bonus for defense - use base values
            let finalDefenseValue: number
            let duration: number
            
            // For normal defense, use calculated value; for others use skill effect
            if (chosenSkill.id === "normal-defense") {
              finalDefenseValue = calculateNormalDefenseReduction({
                ...ally.hairRoot,
                level: ally.level,
                exp: 0,
                count: 1
              } as any)
              duration = 1
            } else {
              const defenseEffect = getDefenseSkillEffect(chosenSkill.id)
              finalDefenseValue = defenseEffect.reduction
              duration = defenseEffect.duration
            }
            
            ally.statusEffects.push({
              type: "buff",
              name: "防御強化",
              duration: duration,
              value: finalDefenseValue
            })
            
            if (chosenSkill.id === "normal-defense") {
              newLog.push(`${ally.name}の${chosenSkill.name}で${finalDefenseValue}%ダメージ軽減!`)
            } else {
              const defenseEffect = getDefenseSkillEffect(chosenSkill.id)
              if (defenseEffect.log) {
                newLog.push(defenseEffect.log)
              } else {
                newLog.push(`${ally.name}の${chosenSkill.name}で${finalDefenseValue}%ダメージ軽減!`)
              }
            }
          } else if (chosenSkill.type === "dodge") {
            // Dodge skills - next attack is completely avoided
            ally.statusEffects.push({
              type: "buff",
              name: "回避準備",
              duration: 1,
              value: 100
            })
            newLog.push(`${ally.name}の${chosenSkill.name}で次の攻撃を完全に回避できる態勢を整えた!`)
          } else if (chosenSkill.type === "attack" || chosenSkill.type === "aoe") {
            const skillBonus = calculateSkillBonus({ ...ally.hairRoot, level: ally.level, exp: 0, count: 1 })
            const baseDamage = Math.floor((chosenSkill.damage || 0) * skillBonus)
            const label = chosenSkill.id === "normal-attack"
              ? "の通常攻撃が"
              : `の${chosenSkill.name}が`
            if (!boss.isEliminated) {
              applyAttack(ally, boss, baseDamage, label)
            }
          } else if (chosenSkill.type === "special") {
            // Special skills
            if (chosenSkill.id === "end-world") {
              // エンドワールドはボスに対して無効
              newLog.push(`${ally.name}の${chosenSkill.name}が発動したが、${boss.name}の力の前に通じなかった!`)
            } else {
              const skillBonus = calculateSkillBonus({ ...ally.hairRoot, level: ally.level, exp: 0, count: 1 })
              const baseDamage = Math.floor((chosenSkill.damage || 0) * skillBonus)
              const label = `の${chosenSkill.name}が`
              if (!boss.isEliminated) {
                applyAttack(ally, boss, baseDamage, label)
              }
            }
          }

          if (chosenSkill.cooldown > 0) {
            ally.cooldowns = {
              ...ally.cooldowns,
              [chosenSkill.id]: chosenSkill.cooldown + 1
            }
          }
        })
      }

      // Update cooldowns for this skill
      if (selectedSkill.cooldown > 0) {
        player.cooldowns = {
          ...player.cooldowns,
          [selectedSkill.id]: selectedSkill.cooldown + 1
        }
      }

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
        return newPlayers
      }

      // Check if boss is stunned
      const isStunned = boss.statusEffects.some((e) => e.type === "stun")
      if (isStunned) {
        setBattleLog(prev => [...prev, `${boss.name}は行動不能!`])
        setRound(r => r + 1)
        setPhase("selecting")
        setIsExecuting(false)
        return newPlayers
      }

      const skills = boss.hairRoot.skills
      
      // Choose skill - prefer available skills, fallback to normal attack
      const availableSkills = skills.filter(s => (boss.cooldowns[s.id] || 0) <= 0)
      const selectedBossSkill = availableSkills.length > 0 
        ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
        : { id: "normal-attack", name: "通常攻撃", damage: calculateNormalAttackDamage({ ...boss.hairRoot, level: boss.level, exp: 0, count: 1 } as CollectedHairRoot), cooldown: 0, type: "attack" as const, description: "" }
      
      const newLog: string[] = []

      newLog.push(`${boss.name}が「${selectedBossSkill.name}」を使用した！`)

      // Update cooldown for this skill
      if (selectedBossSkill.cooldown > 0) {
        boss.cooldowns = {
          ...boss.cooldowns,
          [selectedBossSkill.id]: selectedBossSkill.cooldown + 1
        }
      }

      if (selectedBossSkill.id === "normal-attack" && aliveTeam.length > 0) {
        const target = aliveTeam[Math.floor(Math.random() * aliveTeam.length)]
        
        // Check for all-father dodge
        if (triggerAllFather(boss, target, newLog, newPlayers)) {
          // Attack was dodged
        } else {
          const stats = calculateStats(boss.hairRoot as unknown as CollectedHairRoot)
          const buffedPower = (stats?.power ?? 0) + (boss.buffedStats.power || 0)
          const skillBonus = calculateSkillBonus({ ...boss.hairRoot, level: 8, exp: 0, count: 1 })
          const baseDamage = calculateNormalAttackDamage({ ...boss.hairRoot, level: boss.level, exp: 0, count: 1 } as CollectedHairRoot)
          const elementMod = getElementDamageMod(boss.hairRoot, target.hairRoot)
          const finalDamage = Math.floor(baseDamage * skillBonus * (1 + buffedPower / 100) * elementMod * 1.7)
          
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
        
        // Check for all-father dodge
        if (triggerAllFather(boss, target, newLog, newPlayers)) {
          // Attack was dodged
        } else {
          const stats = calculateStats(boss.hairRoot as unknown as CollectedHairRoot)
          const buffedPower = (stats?.power ?? 0) + (boss.buffedStats.power || 0)
          const skillBonus = calculateSkillBonus({ ...boss.hairRoot, level: boss.level, exp: 0, count: 1 })
          const baseDamage = Math.floor((selectedBossSkill.damage || 0) * skillBonus)
          const elementMod = getElementDamageMod(boss.hairRoot, target.hairRoot)
          const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod * 1.3)
          
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
        }
      } else if (selectedBossSkill.type === "aoe") {
        aliveTeam.forEach(target => {
          // Check for all-father dodge
          if (triggerAllFather(boss, target, newLog, newPlayers)) {
            // Attack was dodged
          } else {
            const stats = calculateStats(boss.hairRoot as unknown as CollectedHairRoot)
            const buffedPower = (stats?.power ?? 0) + (boss.buffedStats.power || 0)
            const baseDamage = selectedBossSkill.damage || 0
            const elementMod = getElementDamageMod(boss.hairRoot, target.hairRoot)
            const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod * 1.5)
            
            const defenseEffect = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
            const damageAfterDefense = defenseEffect?.value 
              ? Math.floor(finalDamage * (1 - (defenseEffect.value / 100)))
              : finalDamage

            target.hp = Math.max(0, target.hp - damageAfterDefense)

            if (selectedBossSkill.id === "reality-collapse-raid") {
              target.statusEffects.push({
                type: "debuff",
                name: "全ステータスダウン",
                duration: 2,
                value: 30,
                stat: "all"
              })
              newLog.push(`${target.name}の全ステータスが30%ダウン!`)
            }
            
            const defenseNote = defenseEffect ? ` (防御で${finalDamage - damageAfterDefense}軽減)` : ""
            newLog.push(`${target.name}に${damageAfterDefense}ダメージ!${defenseNote}`)
            
            if (target.hp <= 0) {
              target.isEliminated = true
              newLog.push(`${target.name}が脱落!`)
            }
          }
        })
      } else if (selectedBossSkill.type === "defense") {
        // No skill bonus for defense - use base values
        let finalDefenseValue: number
        let duration: number
        
        // For normal defense, use calculated value; for others use skill effect
        if (selectedBossSkill.id === "normal-defense") {
          finalDefenseValue = calculateNormalDefenseReduction({
            ...boss.hairRoot,
            level: boss.level,
            exp: 0,
            count: 1
          } as any)
          duration = 1
        } else {
          const defenseEffect = getDefenseSkillEffect(selectedBossSkill.id)
          finalDefenseValue = defenseEffect.reduction
          duration = defenseEffect.duration
        }
        
        boss.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: duration,
          value: finalDefenseValue
        })
        
        if (selectedBossSkill.id === "normal-defense") {
          newLog.push(`${finalDefenseValue}%ダメージ軽減!`)
        } else {
          const defenseEffect = getDefenseSkillEffect(selectedBossSkill.id)
          if (defenseEffect.log) {
            newLog.push(defenseEffect.log)
          } else {
            newLog.push(`${finalDefenseValue}%ダメージ軽減!`)
          }
        }
      }

      const aliveAfterBoss = newPlayers.filter(p => p.id !== 999 && !p.isEliminated)
      
      // First update the battle log with all damage messages
      setBattleLog(prev => [...prev, ...newLog])
      
      if (aliveAfterBoss.length === 0) {
        // Show all elimination messages first, then show defeat message after delay
        setTimeout(() => {
          setBattleLog(prev => [...prev, "毛根が死滅した..."])
          setTimeout(() => {
            setPhase("finished")
            setIsExecuting(false)
          }, 1000)
        }, 500)
        return newPlayers
      }

      // Reduce all cooldowns and status effect durations once per round (after boss action)
      newPlayers.forEach(p => {
        // Reduce cooldowns
        Object.keys(p.cooldowns).forEach(skillId => {
          if (p.cooldowns[skillId] > 0) {
            p.cooldowns[skillId]--
          }
        })
        
        // Reduce status effect durations
        p.statusEffects = p.statusEffects.map(e => ({ ...e, duration: e.duration - 1 }))
        // Remove expired status effects
        p.statusEffects = p.statusEffects.filter(e => e.duration > 0)
      })

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
                  <p className="font-bold">{bossMaxHp}</p>
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-lg p-4 border border-border"
            >
              <h3 className="font-bold mb-3">チーム選択 ({selectedTeam.length}/5)</h3>
              <p className="text-xs text-muted-foreground mb-2">※ 所有している毛根5体を選択</p>
              <div className="flex gap-1 justify-end mb-2">
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
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {sortedCollection.map((hair, idx) => (
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
                      onClick={() => {
                        const normalAtkDamage = calculateNormalAttackDamage({ ...player.hairRoot, level: player.level, exp: 0, count: 1 } as CollectedHairRoot)
                        setSelectedSkill({ id: "normal-attack", name: "通常攻撃", damage: normalAtkDamage, cooldown: 0, type: "attack", description: `威力: ${normalAtkDamage}` })
                      }}
                      className={`p-2 rounded-lg text-left border text-xs transition-all ${
                        selectedSkill?.id === "normal-attack"
                          ? "border-primary bg-primary/20"
                          : "border-border bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <p className="font-medium">通常攻撃</p>
                      <p className="text-muted-foreground text-xs">威力: {calculateNormalAttackDamage({ ...player.hairRoot, level: player.level, exp: 0, count: 1 } as CollectedHairRoot)}</p>
                    </button>

                    {/* Normal Defense - always available */}
                    <button
                      onClick={() => {
                        const normalDefReduction = calculateNormalDefenseReduction({ ...player.hairRoot, level: player.level, exp: 0, count: 1 } as CollectedHairRoot)
                        setSelectedSkill({ id: "normal-defense", name: "通常防御", damage: 0, cooldown: 0, type: "defense", description: `軽減: ${normalDefReduction}%` })
                      }}
                      className={`p-2 rounded-lg text-left border text-xs transition-all ${
                        selectedSkill?.id === "normal-defense"
                          ? "border-primary bg-primary/20"
                          : "border-border bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <p className="font-medium">通常防御</p>
                      <p className="text-muted-foreground text-xs">軽減: {calculateNormalDefenseReduction({ ...player.hairRoot, level: player.level, exp: 0, count: 1 } as CollectedHairRoot)}%</p>
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
                      ) : selectedSkill.type === "dodge" ? (
                        <Button
                          className="w-full text-xs"
                          onClick={() => executePlayerAction()}
                          disabled={isExecuting}
                        >
                          回避態勢 - {player.name}に使用
                        </Button>
                      ) : selectedSkill.type === "team_heal" ? (
                        // Heal skill - olympus-blessing and divine-light show full heal button, others show teammate selection
                        selectedSkill.id === "olympus-blessing" || selectedSkill.id === "divine-light" ? (
                          <Button
                            className="w-full text-xs"
                            onClick={() => executePlayerAction()}
                            disabled={isExecuting}
                          >
                            全体回復 - {selectedSkill.name}
                          </Button>
                        ) : (
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
                        )
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
            className={`relative overflow-hidden rounded-lg p-6 text-center text-white ${
              boss_player && boss_player.hp <= 0
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-red-500 to-rose-600"
            }`}
          >
            {boss_player && boss_player.hp > 0 && (
              <>
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.35),rgba(0,0,0,0.85))]"
                />
                <motion.div
                  aria-hidden="true"
                  initial={{ y: 0, rotate: -3 }}
                  animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
                  className="pointer-events-none absolute top-4 right-6 text-3xl"
                >
                  ☠️
                </motion.div>
              </>
            )}
            <div className="relative z-10">
              <div className="text-5xl mb-4">{boss_player && boss_player.hp <= 0 ? "🎉" : "☠️"}</div>
              <h2 className="text-2xl font-bold mb-4">
                {boss_player && boss_player.hp <= 0 ? "勝利！" : "敗北..."}
              </h2>
              {boss_player && boss_player.hp <= 0 && (
                <div className="bg-black/20 rounded-lg p-4 mb-4">
                  <p className="mb-2">{boss.name}を倒した！</p>
                  <p className="text-xl font-bold mb-2">
                    {config.defeatReward.hairRoot.rarity === "master" ? "✨ マスターレア" : 
                     config.defeatReward.hairRoot.rarity === "cosmic" ? "👑 コズミックレア" : "レア"}
                  </p>
                  <p className="text-lg">{config.defeatReward.hairRoot.name}</p>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm">+{config.defeatReward.coins} コイン</p>
                    <p className="text-sm">+{config.defeatReward.exp} 経験値</p>
                  </div>
                </div>
              )}
              {boss_player && boss_player.hp > 0 && (
                <div className="bg-black/20 rounded-lg p-4 mb-4">
                  <p className="text-2xl font-bold mb-2">毛根が死滅した</p>
                  <p className="text-sm">{boss.name}に敗北した...</p>
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
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
