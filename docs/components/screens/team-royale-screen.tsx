"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, RARITY_COLORS, calculateStats, calculateSkillBonus, getRankColor, getNpcStrengthMultiplier, getRankCoinMultiplier, getElementCombatModifiers, getDefenseSkillEffect, ELEMENT_NAMES, ELEMENT_COLORS, type HairRoot, type Skill, type Element } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Swords, Shield, Zap, Crown, Users, Trophy } from "lucide-react"

interface TeamRoyaleScreenProps {
  onNavigate: (screen: Screen) => void
}

type BattlePhase = "waiting" | "select" | "action" | "result" | "finished"

interface BattlePlayer {
  id: number
  name: string
  hairRoot: HairRoot
  level: number
  hp: number
  maxHp: number
  prevHp: number
  isNpc: boolean
  isEliminated: boolean
  cooldowns: Record<string, number>
  statusEffects: { type: "stun" | "buff" | "debuff" | "dot"; name: string; duration: number; value?: number }[]
  buffedStats: { power: number; speed: number; grip: number }
  teamId: number
}

interface Team {
  id: number
  name: string
  color: string
  members: BattlePlayer[]
  isEliminated: boolean
}

interface TeamBattlePlayer extends BattlePlayer {}

const TEAM_NAMES = ["炎チーム", "水チーム", "風チーム", "雷チーム"]
const TEAM_COLORS = ["#EF4444", "#3B82F6", "#22C55E", "#F59E0B"]
const NPC_NAMES = [
  "ハゲ田", "毛無し郎", "抜け毛王", "薄毛侍", "ツルピカ丸",
  "毛根仙人", "フサフサ姫", "剛毛騎士", "軟毛僧侶", "縮毛魔王",
  "直毛勇者", "白髪賢者"
]

function generateNpcPlayer(index: number, teamId: number, strengthMultiplier: number, rankTier: string): BattlePlayer {
  const rarityPool: HairRoot[] = []
  HAIR_ROOTS.forEach((hr) => {
    if (rankTier === "legend" || rankTier === "master") {
      if (hr.rarity === "epic" || hr.rarity === "legendary") rarityPool.push(hr, hr, hr)
      else if (hr.rarity === "rare") rarityPool.push(hr, hr)
      else rarityPool.push(hr)
    } else if (rankTier === "diamond" || rankTier === "platinum") {
      if (hr.rarity === "rare" || hr.rarity === "epic") rarityPool.push(hr, hr, hr)
      else if (hr.rarity === "uncommon") rarityPool.push(hr, hr)
      else rarityPool.push(hr)
    } else if (rankTier === "gold" || rankTier === "silver") {
      if (hr.rarity === "uncommon" || hr.rarity === "rare") rarityPool.push(hr, hr)
      else rarityPool.push(hr)
    } else {
      if (hr.rarity === "common" || hr.rarity === "uncommon") rarityPool.push(hr, hr, hr)
      else rarityPool.push(hr)
    }
  })
  
  const baseHairRoot = rarityPool[Math.floor(Math.random() * rarityPool.length)]
  const scaledHairRoot: HairRoot = {
    ...baseHairRoot,
    power: Math.floor(baseHairRoot.power * strengthMultiplier),
    speed: Math.floor(baseHairRoot.speed * strengthMultiplier),
    grip: Math.floor(baseHairRoot.grip * strengthMultiplier),
  }
  
  const npcLevel = Math.floor(Math.random() * 5) + 1
  const stats = calculateStats({ ...scaledHairRoot, level: npcLevel, exp: 0, count: 1 })
  const maxHp = Math.floor((100 + stats.power + stats.grip) * strengthMultiplier)

  return {
    id: index + 100,
    name: NPC_NAMES[index % NPC_NAMES.length],
    hairRoot: scaledHairRoot,
    level: npcLevel,
    hp: maxHp,
    maxHp,
    prevHp: maxHp,
    isNpc: true,
    isEliminated: false,
    cooldowns: {},
    statusEffects: [],
    buffedStats: { power: 0, speed: 0, grip: 0 },
    teamId,
  }
}

export function TeamRoyaleScreen({ onNavigate }: TeamRoyaleScreenProps) {
  const { selectedHairRoot, addCoins, getTeamRoyaleRank, updateTeamRoyaleRank, playerName } = useGame()
  const [phase, setPhase] = useState<BattlePhase>("waiting")
  const [teams, setTeams] = useState<Team[]>([])
  const [round, setRound] = useState(1)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<number[]>([])
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [winningTeam, setWinningTeam] = useState<Team | null>(null)
  const [playerTeamRank, setPlayerTeamRank] = useState<number>(0)
  const [rankChange, setRankChange] = useState<number | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  
  const currentRank = getTeamRoyaleRank()
  const strengthMultiplier = getNpcStrengthMultiplier(currentRank)
  const coinMultiplier = getRankCoinMultiplier(currentRank)

  const getTeamRoyaleBaseCoins = (placement: number): number => {
    const coinRewards: Record<number, number> = { 1: 300, 2: 150, 3: 80, 4: 30 }
    return coinRewards[placement] || 30
  }

  const getTeamRoyaleRewardCoins = (placement: number): number => {
    return Math.floor(getTeamRoyaleBaseCoins(placement) * coinMultiplier)
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [battleLog])

  const player = teams.flatMap(t => t.members).find((p) => !p.isNpc)
  const playerTeam = teams.find(t => t.members.some(m => !m.isNpc))

  const triggerAllFather = (attacker: BattlePlayer, defender: BattlePlayer): boolean => {
    const allFather = defender.statusEffects.find((e) => e.type === "buff" && e.name === "オールファーザー")
    if (!allFather) return false

    const counter = defender.statusEffects.find((e) => e.type === "buff" && e.name === "反撃準備")
    defender.statusEffects = defender.statusEffects.filter(
      (e) => e.name !== "オールファーザー" && e.name !== "反撃準備"
    )

    setBattleLog((logs) => [...logs, `${defender.name}はオールファーザーで攻撃を完全回避!`])

    const counterValue = counter?.value ?? 0
    if (counterValue > 0) {
      attacker.hp = Math.max(0, attacker.hp - counterValue)
      setBattleLog((logs) => [...logs, `${defender.name}の反撃で${attacker.name}に${counterValue}ダメージ!`])
      if (attacker.hp <= 0) {
        attacker.isEliminated = true
        setBattleLog((logs) => [...logs, `${attacker.name}が脱落!`])
      }
    }

    return true
  }

  // Auto-progress when player is eliminated
  useEffect(() => {
    if (phase === "select" && player?.isEliminated) {
      // Player is dead, skip their turn and proceed
      const timeout = setTimeout(() => {
        setPhase("action")
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [phase, player])

  const getBattleStats = useCallback((battlePlayer: BattlePlayer) => {
    return calculateStats({
      ...battlePlayer.hairRoot,
      level: battlePlayer.level,
      exp: 0,
      count: 1,
    })
  }, [])

  const getSkillBonus = useCallback((battlePlayer: BattlePlayer) => {
    return calculateSkillBonus({
      ...battlePlayer.hairRoot,
      level: battlePlayer.level,
      exp: 0,
      count: 1,
    })
  }, [])

  const startBattle = useCallback(() => {
    if (!selectedHairRoot) return

    const stats = calculateStats(selectedHairRoot)
    const maxHp = 100 + stats.power + stats.grip

    // Create player
    const playerChar: BattlePlayer = {
      id: 0,
      name: playerName,
      hairRoot: selectedHairRoot,
      level: selectedHairRoot.level || 1,
      hp: maxHp,
      maxHp,
      prevHp: maxHp,
      isNpc: false,
      isEliminated: false,
      cooldowns: {},
      statusEffects: [],
      buffedStats: { power: 0, speed: 0, grip: 0 },
      teamId: 0,
    }

    // Create 4 teams with 3 members each (player + 2 allies in team 0, 3 NPCs in other teams)
    const newTeams: Team[] = TEAM_NAMES.map((name, i) => ({
      id: i,
      name,
      color: TEAM_COLORS[i],
      members: [],
      isEliminated: false,
    }))

    // Add player to team 0
    newTeams[0].members.push(playerChar)
    
    // Add 2 allies to player's team
    for (let j = 0; j < 2; j++) {
      newTeams[0].members.push(generateNpcPlayer(j, 0, strengthMultiplier, currentRank.tier))
    }

    // Add 3 NPCs to each other team
    let npcIndex = 2
    for (let i = 1; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        newTeams[i].members.push(generateNpcPlayer(npcIndex++, i, strengthMultiplier, currentRank.tier))
      }
    }

    setTeams(newTeams)
    setPhase("select")
    setRound(1)
    setBattleLog(["チームバトルロワイヤル開始! 4チーム12人で最強チームを決める!"])
  }, [selectedHairRoot, strengthMultiplier, currentRank.tier, playerName])

  const executePlayerAction = useCallback(() => {
    if (!selectedSkill || !player) return
    if ((selectedSkill.type === "attack" || selectedSkill.type === "dot") && selectedTarget === null) return
    if (selectedSkill.type === "aoe" && selectedTargets.length === 0) return

    setTeams((prev) => {
      const newTeams = prev.map(t => ({
        ...t,
        members: t.members.map(p => ({
          ...p,
          prevHp: p.hp,
          cooldowns: { ...p.cooldowns }
        }))
      }))

      const allPlayers = newTeams.flatMap(t => t.members)
      const currentPlayer = allPlayers.find(p => !p.isNpc)
      const target = allPlayers.find(p => p.id === selectedTarget)

      if (!currentPlayer || currentPlayer.isEliminated) return prev
      
      // Only check target for skills that require one
      const requiresTarget = selectedSkill.type === "attack" || selectedSkill.type === "dot" || selectedSkill.id === "end-world" || selectedSkill.id === "static-field" || selectedSkill.id === "entangle"
      if (requiresTarget && (!target || target.isEliminated)) return prev

      // Helper function for element damage modifier
      const getElementDamageMod = (attackerHairRoot: HairRoot, defenderHairRoot: HairRoot): number => {
        if (!attackerHairRoot.element || !defenderHairRoot.element) return 1.0
        const mods = getElementCombatModifiers(attackerHairRoot.element, defenderHairRoot.element)
        return mods.attackMod
      }

      // Execute skill
      if (selectedSkill.type === "attack") {
        if (target && !target.isEliminated) {
          const stats = getBattleStats(currentPlayer)
          const totalPower = stats.power + currentPlayer.buffedStats.power
          const elementMod = getElementDamageMod(currentPlayer.hairRoot, target.hairRoot)
          if (triggerAllFather(currentPlayer, target)) {
            return prev
          }
          let damage = Math.floor((selectedSkill.damage * (1 + totalPower / 100) * elementMod) * (0.9 + Math.random() * 0.2))
          
          const defBuff = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
          if (defBuff) {
            damage = Math.floor(damage * (1 - (defBuff.value || 30) / 100))
          }

          target.hp = Math.max(0, target.hp - damage)
          const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! ${target.name}に${damage}ダメージ!${elementNote}`])

          if (target.hp <= 0) {
            target.isEliminated = true
            setBattleLog((logs) => [...logs, `${target.name}が脱落!`])
          }
        }
      } else if (selectedSkill.type === "dot") {
        // DOT attack
        if (target && !target.isEliminated) {
          const stats = getBattleStats(currentPlayer)
          const totalPower = stats.power + currentPlayer.buffedStats.power
          const elementMod = getElementDamageMod(currentPlayer.hairRoot, target.hairRoot)
          if (triggerAllFather(currentPlayer, target)) {
            return prev
          }
          let damage = Math.floor((selectedSkill.damage * (1 + totalPower / 100) * elementMod) * (0.9 + Math.random() * 0.2))
          
          const defBuff = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
          if (defBuff) {
            damage = Math.floor(damage * (1 - (defBuff.value || 30) / 100))
          }

          target.hp = Math.max(0, target.hp - damage)
          const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! ${target.name}に${damage}ダメージ!${elementNote}`])
          
          // Apply DOT effect
          if (selectedSkill.dotEffect) {
            target.statusEffects.push({
              type: "dot",
              name: selectedSkill.dotEffect.name,
              duration: selectedSkill.dotEffect.duration,
              value: selectedSkill.dotEffect.damage
            })
            setBattleLog((logs) => [...logs, `${target.name}に${selectedSkill.dotEffect?.name}を付与! (${selectedSkill.dotEffect?.duration}ターン)`])
          }

          if (target.hp <= 0) {
            target.isEliminated = true
            setBattleLog((logs) => [...logs, `${target.name}が脱落!`])
          }
        }
      } else if (selectedSkill.type === "defense") {
        // Apply skill bonus from training level
        const defenseSkillBonus = getSkillBonus(currentPlayer)
        const defenseEffect = getDefenseSkillEffect(selectedSkill.id)
        const finalDefenseValue = Math.min(100, Math.floor(defenseEffect.reduction * defenseSkillBonus))

        currentPlayer.statusEffects.push({
          type: "buff",
          name: "防御強化",
          duration: defenseEffect.duration,
          value: finalDefenseValue
        })
        const defenseLog = defenseEffect.log
        if (defenseLog) {
          setBattleLog((logs) => [...logs, defenseLog])
        } else {
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! ${finalDefenseValue}%ダメージ軽減!`])
        }
      } else if (selectedSkill.type === "aoe") {
        // AOE attack - hit multiple targets
        const targets = selectedTargets
          .map(id => allPlayers.find(p => p.id === id))
          .filter((t): t is BattlePlayer => t !== undefined && !t.isEliminated)
        
        const stats = getBattleStats(currentPlayer)
        const totalPower = stats.power + currentPlayer.buffedStats.power
        
        targets.forEach(t => {
          if (triggerAllFather(currentPlayer, t)) {
            return
          }
          let damage = Math.floor((selectedSkill.damage * (1 + totalPower / 100)) * (0.9 + Math.random() * 0.2))
          const defBuff = t.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
          if (defBuff) damage = Math.floor(damage * (1 - (defBuff.value || 30) / 100))
          
          t.hp = Math.max(0, t.hp - damage)
          setBattleLog((logs) => [...logs, `${selectedSkill.name}が${t.name}に${damage}ダメージ!`])
          
          if (t.hp <= 0) {
            t.isEliminated = true
            setBattleLog((logs) => [...logs, `${t.name}が脱落!`])
          }
        })
      } else if (selectedSkill.type === "team_heal") {
        // Team heal - heal all alive teammates in team mode
        // Apply skill bonus from training level
        const teamHealBonus = getSkillBonus(currentPlayer)
        const playerTeam = newTeams.find(t => t.members.some(m => !m.isNpc))
        const aliveTeammates = playerTeam?.members.filter(m => !m.isEliminated) || []
        const baseHealPercent = selectedSkill.id === "olympus-blessing" ? 1.0 : 0.5
        const healPercent = baseHealPercent * teamHealBonus
        
        aliveTeammates.forEach(teammate => {
          const healAmount = Math.floor(teammate.maxHp * healPercent)
          teammate.hp = Math.min(teammate.maxHp, teammate.hp + healAmount)
          setBattleLog((logs) => [...logs, `${teammate.name}のHP${healAmount}回復!`])
        })
        setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! チーム全員回復!`])
      } else if (selectedSkill.type === "special") {
        // Apply skill bonus from training level for special skills
        const specialSkillBonus = getSkillBonus(currentPlayer)
        
        // Heal skills
        if (selectedSkill.id === "bounce-back" || selectedSkill.id === "helix-heal") {
          const healAmount = Math.floor(currentPlayer.maxHp * 0.25 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! HP${healAmount}回復!`])
        } else if (selectedSkill.id === "static-field" || selectedSkill.id === "entangle") {
          if (target && !target.isEliminated) {
            const stunDuration = Math.floor(1 * specialSkillBonus)
            target.statusEffects.push({
              type: "stun",
              name: selectedSkill.id === "static-field" ? "麻痺" : "拘束",
              duration: stunDuration
            })
            setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! ${target.name}は動けなくなった!`])
          }
        } else if (selectedSkill.id === "rainbow-aura") {
          const buffValue = Math.floor(20 * specialSkillBonus)
          currentPlayer.buffedStats.power += buffValue
          currentPlayer.buffedStats.speed += buffValue
          currentPlayer.buffedStats.grip += buffValue
          currentPlayer.statusEffects.push({ type: "buff", name: "虹のオーラ", duration: 3, value: buffValue })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}に虹のオーラ! 全ステータス+${buffValue}!`])
        } else if (selectedSkill.id === "rewind") {
          const healAmount = Math.floor(currentPlayer.maxHp * 0.35 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          currentPlayer.statusEffects.push({ type: "buff", name: "時間歪曲", duration: 1, value: 100 })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}が時を戻した! HP${healAmount}回復+1ターン無敵!`])
        } else if (selectedSkill.id === "rebirth") {
          const healAmount = Math.floor(currentPlayer.maxHp * 0.7 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! HP${healAmount}回復!`])
        } else if (selectedSkill.id === "holy-blessing") {
          const buffValue = Math.floor(50 * specialSkillBonus)
          const healAmount = Math.floor(currentPlayer.maxHp * 0.4 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          currentPlayer.buffedStats.power += buffValue
          currentPlayer.buffedStats.speed += buffValue
          currentPlayer.buffedStats.grip += buffValue
          currentPlayer.statusEffects.push({ type: "buff", name: "神の祝福", duration: 4, value: buffValue })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! 全ステ+${buffValue}, HP${healAmount}回復!`])
        } else if (selectedSkill.id === "toxic-cloud") {
          // Poison all enemies - bonus increases poison damage
          const enemyPlayers = allPlayers.filter(p => p.teamId !== currentPlayer.teamId && !p.isEliminated)
          const poisonDamage = Math.floor(10 * specialSkillBonus)
          enemyPlayers.forEach(enemy => {
            enemy.statusEffects.push({ type: "dot", name: "毒", duration: 3, value: poisonDamage })
          })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の毒霧! 敵全員が毒状態に! (3ターン)`])
        } else if (selectedSkill.id === "moon-blessing") {
          const healAmount = Math.floor(currentPlayer.maxHp * 0.4 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          setBattleLog((logs) => [...logs, `${currentPlayer.name}は月の加護でHP${healAmount}回復!`])
        } else if (selectedSkill.id === "sunlight-heal") {
          const healAmount = Math.floor(currentPlayer.maxHp * 0.5 * specialSkillBonus)
          const buffValue = Math.floor(25 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          currentPlayer.buffedStats.power += buffValue
          currentPlayer.statusEffects.push({ type: "buff", name: "太陽の力", duration: 3, value: buffValue })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}に日光の力! HP${healAmount}回復+攻撃力UP!`])
        } else if (selectedSkill.id === "hellfire-breath") {
          const enemyPlayers = allPlayers.filter(p => p.teamId !== currentPlayer.teamId && !p.isEliminated)
          const burnDamage = Math.floor(30 * specialSkillBonus)
          const burnDot = Math.floor(15 * specialSkillBonus)
          enemyPlayers.forEach(enemy => {
            enemy.hp = Math.max(0, enemy.hp - burnDamage)
            enemy.statusEffects.push({ type: "dot", name: "炎上", duration: 2, value: burnDot })
            if (enemy.hp <= 0) {
              enemy.isEliminated = true
              setBattleLog((logs) => [...logs, `${enemy.name}が脱落!`])
            }
          })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}の地獄の炎! 敵全員に${burnDamage}ダメージ+炎上!`])
        } else if (selectedSkill.id === "einherjar") {
          const healAmount = Math.floor(currentPlayer.maxHp * 0.6 * specialSkillBonus)
          const buffValue = Math.floor(50 * specialSkillBonus)
          currentPlayer.hp = Math.min(currentPlayer.maxHp, currentPlayer.hp + healAmount)
          currentPlayer.statusEffects.push({ type: "buff", name: "勇者の魂", duration: 2, value: buffValue })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}に勇者の魂! HP${healAmount}回復+防御強化!`])
        } else if (selectedSkill.id === "all-father") {
          currentPlayer.statusEffects.push({ type: "buff", name: "オールファーザー", duration: 1, value: 100 })
          const counterValue = Math.floor(80 * specialSkillBonus)
          currentPlayer.statusEffects.push({ type: "buff", name: "反撃準備", duration: 1, value: counterValue })
          setBattleLog((logs) => [...logs, `${currentPlayer.name}が全知の力発動! 完全回避+反撃準備!`])
        } else if (selectedSkill.id === "end-world") {
          if (target && !target.isEliminated) {
            target.hp = 0
            target.isEliminated = true
            setBattleLog((logs) => [...logs, `${currentPlayer.name}の${selectedSkill.name}! ${target.name}は世界から消滅した!!`])
          }
        }
      }

      if (selectedSkill.cooldown > 0) {
        currentPlayer.cooldowns = {
          ...currentPlayer.cooldowns,
          [selectedSkill.id]: selectedSkill.cooldown
        }
      }

      // Check team elimination
      newTeams.forEach(team => {
        if (team.members.every(m => m.isEliminated)) {
          team.isEliminated = true
        }
      })

      return newTeams
    })

    setSelectedSkill(null)
    setSelectedTarget(null)
    setSelectedTargets([])
    setPhase("action")
  }, [selectedSkill, selectedTarget, selectedTargets, player, getBattleStats, getSkillBonus])

  // NPC actions and round processing
  useEffect(() => {
    if (phase !== "action") return

    const timeout = setTimeout(() => {
      setTeams((prev) => {
        const newTeams = prev.map(t => ({
          ...t,
          members: t.members.map(p => ({
            ...p,
            cooldowns: { ...p.cooldowns },
            prevHp: p.hp
          }))
        }))

        const allPlayers = newTeams.flatMap(t => t.members)
        const alivePlayers = allPlayers.filter(p => !p.isEliminated)
        const aliveTeams = newTeams.filter(t => !t.isEliminated)

        // NPC actions
        const npcs = alivePlayers.filter(p => p.isNpc)
        for (const npc of npcs) {
          const enemyPlayers = alivePlayers.filter(p => p.teamId !== npc.teamId && !p.isEliminated)
          if (enemyPlayers.length === 0) continue

          const availableSkills = npc.hairRoot.skills.filter(s => !npc.cooldowns[s.id] || npc.cooldowns[s.id] <= 0)
          if (availableSkills.length === 0) continue

          const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)]
          const target = enemyPlayers[Math.floor(Math.random() * enemyPlayers.length)]

          if (skill.type === "attack") {
            const stats = getBattleStats(npc)
            const totalPower = stats.power + npc.buffedStats.power
            if (triggerAllFather(npc, target)) {
              continue
            }
            let damage = Math.floor((skill.damage * (1 + totalPower / 100)) * (0.9 + Math.random() * 0.2))
            
            const defBuff = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
            if (defBuff) {
              damage = Math.floor(damage * (1 - (defBuff.value || 30) / 100))
            }

            target.hp = Math.max(0, target.hp - damage)
            setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}! ${target.name}に${damage}ダメージ!`])

            if (target.hp <= 0) {
              target.isEliminated = true
              setBattleLog((logs) => [...logs, `${target.name}が脱落!`])
            }
          } else if (skill.type === "dot") {
            // NPC DOT attack
            const stats = getBattleStats(npc)
            const totalPower = stats.power + npc.buffedStats.power
            if (triggerAllFather(npc, target)) {
              continue
            }
            let damage = Math.floor((skill.damage * (1 + totalPower / 100)) * (0.9 + Math.random() * 0.2))
            
            const defBuff = target.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
            if (defBuff) damage = Math.floor(damage * (1 - (defBuff.value || 30) / 100))

            target.hp = Math.max(0, target.hp - damage)
            setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}! ${target.name}に${damage}ダメージ!`])
            
            if (skill.dotEffect) {
              target.statusEffects.push({
                type: "debuff",
                name: skill.dotEffect.name,
                duration: skill.dotEffect.duration,
                value: skill.dotEffect.damage
              })
              setBattleLog((logs) => [...logs, `${target.name}に${skill.dotEffect?.name}を付与!`])
            }

            if (target.hp <= 0) {
              target.isEliminated = true
              setBattleLog((logs) => [...logs, `${target.name}が脱落!`])
            }
          } else if (skill.type === "aoe") {
            // NPC AOE attack - hit random enemies
            const maxTargets = skill.maxTargets || 2
            const targets = enemyPlayers.slice(0, Math.min(maxTargets, enemyPlayers.length))
            const stats = getBattleStats(npc)
            const totalPower = stats.power + npc.buffedStats.power
            
            targets.forEach(t => {
              if (triggerAllFather(npc, t)) {
                return
              }
              let damage = Math.floor((skill.damage * (1 + totalPower / 100)) * (0.9 + Math.random() * 0.2))
              const defBuff = t.statusEffects.find(e => e.type === "buff" && e.name === "防御強化")
              if (defBuff) damage = Math.floor(damage * (1 - (defBuff.value || 30) / 100))
              
              t.hp = Math.max(0, t.hp - damage)
              setBattleLog((logs) => [...logs, `${skill.name}が${t.name}に${damage}ダメージ!`])
              
              if (t.hp <= 0) {
                t.isEliminated = true
                setBattleLog((logs) => [...logs, `${t.name}が脱落!`])
              }
            })
          } else if (skill.type === "team_heal") {
            // NPC team heal - heal all alive teammates
            const npcTeam = newTeams.find(t => t.members.includes(npc))
            const aliveTeammates = npcTeam?.members.filter(m => !m.isEliminated) || []
            const healPercent = skill.id === "olympus-blessing" ? 1.0 : 0.5
            
            aliveTeammates.forEach(teammate => {
              const healAmount = Math.floor(teammate.maxHp * healPercent)
              teammate.hp = Math.min(teammate.maxHp, teammate.hp + healAmount)
            })
            setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}! チーム全員回復!`])
          } else if (skill.type === "defense") {
            const defenseEffect = getDefenseSkillEffect(skill.id)
            npc.statusEffects.push({
              type: "buff",
              name: "防御強化",
              duration: defenseEffect.duration,
              value: defenseEffect.reduction
            })
            const defenseLog = defenseEffect.log
            if (defenseLog) {
              setBattleLog((logs) => [...logs, defenseLog])
            } else {
              setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}!`])
            }
          } else if (skill.type === "special") {
            // NPC special skills
            if (skill.id === "bounce-back" || skill.id === "helix-heal") {
              const healAmount = Math.floor(npc.maxHp * 0.25)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}でHP回復!`])
            } else if (skill.id === "static-field" || skill.id === "entangle") {
              if (target && !target.isEliminated) {
                target.statusEffects.push({
                  type: "stun",
                  name: skill.id === "static-field" ? "麻痺" : "拘束",
                  duration: 1
                })
                setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}! ${target.name}は動けなくなった!`])
              }
            } else if (skill.id === "rewind") {
              const healAmount = Math.floor(npc.maxHp * 0.35)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              npc.statusEffects.push({ type: "buff", name: "時間歪曲", duration: 1, value: 100 })
              setBattleLog((logs) => [...logs, `${npc.name}が時を戻した!`])
            } else if (skill.id === "holy-blessing") {
              const healAmount = Math.floor(npc.maxHp * 0.4)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              npc.buffedStats.power += 50
              npc.buffedStats.speed += 50
              npc.buffedStats.grip += 50
              npc.statusEffects.push({ type: "buff", name: "神の祝福", duration: 4, value: 50 })
              setBattleLog((logs) => [...logs, `${npc.name}に神の祝福!`])
            } else if (skill.id === "toxic-cloud") {
              enemyPlayers.forEach(e => {
                e.statusEffects.push({ type: "debuff", name: "毒", duration: 3, value: 10 })
              })
              setBattleLog((logs) => [...logs, `${npc.name}の毒霧!`])
            } else if (skill.id === "moon-blessing") {
              const healAmount = Math.floor(npc.maxHp * 0.4)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              setBattleLog((logs) => [...logs, `${npc.name}は月の加護でHP回復!`])
            } else if (skill.id === "sunlight-heal") {
              const healAmount = Math.floor(npc.maxHp * 0.5)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              npc.buffedStats.power += 25
              npc.statusEffects.push({ type: "buff", name: "太陽の力", duration: 3, value: 25 })
              setBattleLog((logs) => [...logs, `${npc.name}に日光の力!`])
            } else if (skill.id === "hellfire-breath") {
              const burnDamage = 30
              enemyPlayers.forEach(e => {
                e.hp = Math.max(0, e.hp - burnDamage)
                e.statusEffects.push({ type: "dot", name: "炎上", duration: 2, value: 15 })
                if (e.hp <= 0) {
                  e.isEliminated = true
                  setBattleLog((logs) => [...logs, `${e.name}が脱落!`])
                }
              })
              setBattleLog((logs) => [...logs, `${npc.name}の地獄の炎!`])
            } else if (skill.id === "einherjar") {
              const healAmount = Math.floor(npc.maxHp * 0.6)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              npc.statusEffects.push({ type: "buff", name: "勇者の魂", duration: 2, value: 50 })
              setBattleLog((logs) => [...logs, `${npc.name}に勇者の魂!`])
            } else if (skill.id === "all-father") {
              npc.statusEffects.push({ type: "buff", name: "オールファーザー", duration: 1, value: 100 })
              npc.statusEffects.push({ type: "buff", name: "反撃準備", duration: 1, value: 80 })
              setBattleLog((logs) => [...logs, `${npc.name}が全知の力発動!`])
            } else if (skill.id === "end-world") {
              if (target && !target.isEliminated) {
                target.hp = 0
                target.isEliminated = true
                setBattleLog((logs) => [...logs, `${npc.name}の${skill.name}! ${target.name}は世界から消滅した!!`])
              }
            } else if (skill.id === "rebirth") {
              const healAmount = Math.floor(npc.maxHp * 0.7)
              npc.hp = Math.min(npc.maxHp, npc.hp + healAmount)
              setBattleLog((logs) => [...logs, `${npc.name}の不死鳥再生!`])
            } else if (skill.id === "rainbow-aura") {
              npc.buffedStats.power += 20
              npc.buffedStats.speed += 20
              npc.buffedStats.grip += 20
              npc.statusEffects.push({ type: "buff", name: "虹のオーラ", duration: 3, value: 20 })
              setBattleLog((logs) => [...logs, `${npc.name}に虹のオーラ!`])
            }
          }

          if (skill.cooldown > 0) {
            npc.cooldowns = {
              ...npc.cooldowns,
              [skill.id]: skill.cooldown
            }
          }
        }

        // Process status effects at end of turn
        allPlayers.forEach(p => {
          if (p.isEliminated) return
          
          // Apply DoT damage
          const dotEffects = p.statusEffects.filter(e => e.type === "dot")
          dotEffects.forEach(dot => {
            if (dot.value && dot.value > 0) {
              p.hp = Math.max(0, p.hp - dot.value)
              setBattleLog((logs) => [...logs, `${p.name}が${dot.name}で${dot.value}ダメージ!`])
              if (p.hp <= 0) {
                p.isEliminated = true
                setBattleLog((logs) => [...logs, `${p.name}が脱落!`])
              }
            }
          })
          
          // Reduce duration of all status effects
          p.statusEffects = p.statusEffects.map(e => ({ ...e, duration: e.duration - 1 }))
          
          // Remove expired effects and log
          const expiredEffects = p.statusEffects.filter(e => e.duration <= 0)
          expiredEffects.forEach(e => {
            if (e.type === "buff") {
              setBattleLog((logs) => [...logs, `${p.name}の${e.name}効果が切れた!`])
            } else if (e.type === "debuff") {
              setBattleLog((logs) => [...logs, `${p.name}の${e.name}が解除された!`])
            } else if (e.type === "dot") {
              setBattleLog((logs) => [...logs, `${p.name}の${e.name}が治った!`])
            }
          })
          p.statusEffects = p.statusEffects.filter(e => e.duration > 0)
          
          // Update cooldowns
          p.cooldowns = Object.entries(p.cooldowns).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value > 0 ? value - 1 : 0
          }), {})
        })

        // Check team elimination
        newTeams.forEach(team => {
          if (team.members.every(m => m.isEliminated) && !team.isEliminated) {
            team.isEliminated = true
            setBattleLog((logs) => [...logs, `${team.name}が全滅!`])
          }
        })

        const remainingTeams = newTeams.filter(t => !t.isEliminated)
        const playerTeam = newTeams.find(t => t.members.some(m => !m.isNpc))
        const playerChar = allPlayers.find(p => !p.isNpc)

        if (remainingTeams.length === 1) {
          setWinningTeam(remainingTeams[0])
          const isPlayerTeamWinner = remainingTeams[0].members.some(m => !m.isNpc)
          if (isPlayerTeamWinner) {
            setPlayerTeamRank(1)
            addCoins(getTeamRoyaleRewardCoins(1))
            const change = updateTeamRoyaleRank(1)
            setRankChange(change)
          } else {
            // Calculate player team's placement
            const eliminatedTeamsCount = newTeams.filter(t => t.isEliminated && t.id !== playerTeam?.id).length
            const placement = 4 - eliminatedTeamsCount + (playerTeam?.isEliminated ? 1 : 0)
            setPlayerTeamRank(placement)
            addCoins(getTeamRoyaleRewardCoins(placement))
            const change = updateTeamRoyaleRank(placement)
            setRankChange(change)
          }
          setPhase("finished")
          return newTeams
        }

        // Check if player's team is eliminated
        if (playerTeam?.isEliminated && playerChar?.isEliminated) {
          const eliminatedTeamsCount = newTeams.filter(t => t.isEliminated).length
          const placement = 5 - eliminatedTeamsCount
          setPlayerTeamRank(placement)
          addCoins(getTeamRoyaleRewardCoins(placement))
          const change = updateTeamRoyaleRank(placement)
          setRankChange(change)
          setPhase("result")
          return newTeams
        }

        return newTeams
      })

      setRound((r) => r + 1)
      setPhase("select")
    }, 1500)

    return () => clearTimeout(timeout)
  }, [phase, addCoins, updateTeamRoyaleRank, getBattleStats, coinMultiplier])

  const getEnemyPlayers = () => {
    return teams.flatMap(t => t.members).filter(p => p.teamId !== player?.teamId && !p.isEliminated)
  }

  if (!selectedHairRoot) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">チームバトルロワイヤル</h1>
          <div />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">毛根を選択してください</p>
            <Button onClick={() => onNavigate("collection")}>コレクションへ</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">チームバトルロワイヤル</h1>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Trophy className="w-4 h-4" style={{ color: getRankColor(currentRank.tier) }} />
            <span className="text-sm font-medium" style={{ color: getRankColor(currentRank.tier) }}>
              {currentRank.name}
            </span>
          </div>
        </div>
        <div className="text-sm">
          {phase !== "waiting" && phase !== "finished" && (
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded">R{round}</span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center p-4"
            >
              <div className="text-center mb-8">
                <Users className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold text-foreground mb-2">4チーム対抗戦</h2>
                <p className="text-muted-foreground">3人1チームで戦うバトルロワイヤル</p>
              </div>

              <div className="bg-card rounded-xl p-4 mb-6 border border-border w-full max-w-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${RARITY_COLORS[selectedHairRoot.rarity]}20` }}
                  >
                    {selectedHairRoot.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selectedHairRoot.name}</p>
                    <p className="text-sm text-muted-foreground">Lv.{selectedHairRoot.level}</p>
                  </div>
                </div>
              </div>

              <Button onClick={startBattle} size="lg" className="w-full max-w-sm bg-primary">
                チーム戦開始
              </Button>
            </motion.div>
          )}

          {(phase === "select" || phase === "action") && (
            <motion.div
              key="battle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col p-4"
            >
              {/* Teams Display */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`bg-card rounded-lg p-2 border-2 ${team.isEliminated ? "opacity-50" : ""}`}
                    style={{ borderColor: team.color }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: team.color }}>{team.name}</p>
                    <div className="space-y-1">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className={`flex items-center gap-1 text-xs ${member.isEliminated ? "line-through opacity-50" : ""}`}
                        >
                          <span>{member.hairRoot.emoji}</span>
                          {member.hairRoot.element && (
                            <span 
                              className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: ELEMENT_COLORS[member.hairRoot.element] }}
                            >
                              {ELEMENT_NAMES[member.hairRoot.element][0]}
                            </span>
                          )}
                          <span className={`truncate ${!member.isNpc ? "text-primary font-bold" : "text-foreground"}`}>
                            {member.name}
                          </span>
                          <span className="ml-auto text-muted-foreground">{member.hp}/{member.maxHp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Battle Log */}
              <div
                ref={logRef}
                className="bg-card rounded-lg p-3 mb-4 max-h-32 overflow-y-auto border border-border"
              >
                <div className="space-y-1">
                  {battleLog.map((log, i) => (
                    <p
                      key={i}
                      className={`text-xs ${
                        log.includes("脱落") || log.includes("全滅") ? "text-destructive font-medium" :
                        log.includes("回復") ? "text-accent font-medium" :
                        log.includes(playerName) ? "text-primary" :
                        "text-muted-foreground"
                      }`}
                    >
                      <span className="text-muted-foreground/50 mr-1">[{i + 1}]</span>
                      {log}
                    </p>
                  ))}
                </div>
              </div>

              {/* Player Actions */}
              {phase === "select" && player && !player.isEliminated && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">アクション選択:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Normal Attack */}
                    <Button
                      variant={selectedSkill?.id === "normal-attack" ? "default" : "outline"}
                      className={`h-auto py-2 px-3 text-left ${selectedSkill?.id === "normal-attack" ? "" : "bg-transparent"}`}
                      onClick={() => setSelectedSkill({
                        id: "normal-attack",
                        name: "通常攻撃",
                        description: "基本的な攻撃",
                        damage: 15,
                        cooldown: 0,
                        type: "attack"
                      })}
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-1 mb-1">
                          <Swords className="w-3 h-3" />
                          <span className="text-xs font-medium">通常攻撃</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">威力: 15</span>
                      </div>
                    </Button>
                    
                    {/* Normal Defense */}
                    <Button
                      variant={selectedSkill?.id === "normal-defense" ? "default" : "outline"}
                      className={`h-auto py-2 px-3 text-left ${selectedSkill?.id === "normal-defense" ? "" : "bg-transparent"}`}
                      onClick={() => setSelectedSkill({
                        id: "normal-defense",
                        name: "通常防御",
                        description: "基本的な防御",
                        damage: 0,
                        cooldown: 0,
                        type: "defense"
                      })}
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-1 mb-1">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs font-medium">通常防御</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">軽減: 20%</span>
                      </div>
                    </Button>
                    
                    {/* Skills */}
                    {player.hairRoot.skills.map((skill) => {
                      const isOnCooldown = (player.cooldowns[skill.id] || 0) > 0
                      return (
                        <Button
                          key={skill.id}
                          variant={selectedSkill?.id === skill.id ? "default" : "outline"}
                          className={`h-auto py-2 px-3 text-left ${selectedSkill?.id === skill.id ? "" : "bg-transparent"}`}
                          disabled={isOnCooldown}
                          onClick={() => setSelectedSkill(skill)}
                        >
                          <div className="w-full">
                            <div className="flex items-center gap-1 mb-1">
                              {(skill.type === "attack" || skill.type === "aoe" || skill.type === "dot") && <Swords className="w-3 h-3" />}
                              {skill.type === "defense" && <Shield className="w-3 h-3" />}
                              {(skill.type === "special" || skill.type === "team_heal") && <Zap className="w-3 h-3" />}
                              <span className="text-xs font-medium">{skill.name}</span>
                            </div>
                            {isOnCooldown ? (
                              <span className="text-xs text-destructive">CT: {player.cooldowns[skill.id]}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {skill.type === "attack" && `威力: ${skill.damage}`}
                                {skill.type === "aoe" && `範囲${skill.maxTargets}体`}
                                {skill.type === "dot" && `${skill.damage}+${skill.dotEffect?.name}`}
                                {skill.type === "defense" && "防御"}
                                {skill.type === "team_heal" && "味方回復"}
                                {skill.type === "special" && "特殊"}
                              </span>
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>

                  {/* Skill Detail Box */}
                  {selectedSkill && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        {selectedSkill.type === "attack" || selectedSkill.type === "aoe" || selectedSkill.type === "dot" ? <Swords className="w-4 h-4 text-destructive" /> : 
                         selectedSkill.type === "defense" ? <Shield className="w-4 h-4 text-primary" /> : 
                         <Zap className="w-4 h-4 text-accent" />}
                        <span className="font-bold text-sm text-foreground">{selectedSkill.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{selectedSkill.description}</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {selectedSkill.damage > 0 && (
                          <span className="bg-destructive/20 text-destructive px-2 py-0.5 rounded">威力: {selectedSkill.damage}</span>
                        )}
                        {selectedSkill.cooldown > 0 && (
                          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded">CT: {selectedSkill.cooldown}ターン</span>
                        )}
                        {selectedSkill.type === "aoe" && (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">範囲: 最大{selectedSkill.maxTargets || 3}体</span>
                        )}
                        {selectedSkill.type === "dot" && selectedSkill.dotEffect && (
                          <span className="bg-accent/20 text-accent px-2 py-0.5 rounded">{selectedSkill.dotEffect.name}: {selectedSkill.dotEffect.damage}/ターン x{selectedSkill.dotEffect.duration}</span>
                        )}
                        {selectedSkill.type === "defense" && (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">ダメージ軽減</span>
                        )}
                        {selectedSkill.type === "team_heal" && (
                          <span className="bg-accent/20 text-accent px-2 py-0.5 rounded">味方全体回復</span>
                        )}
                        {selectedSkill.type === "special" && (
                          <span className="bg-accent/20 text-accent px-2 py-0.5 rounded">特殊効果</span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedSkill && (selectedSkill.type === "attack" || selectedSkill.type === "dot") && (
                    <>
                      <p className="text-sm font-medium text-foreground">ターゲット選択:</p>
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {getEnemyPlayers().map((enemy) => (
                          <Button
                            key={enemy.id}
                            variant={selectedTarget === enemy.id ? "default" : "outline"}
                            className={`h-auto py-2 ${selectedTarget === enemy.id ? "" : "bg-transparent"}`}
                            onClick={() => setSelectedTarget(enemy.id)}
                          >
                            <div className="text-center w-full">
                              <div className="text-lg">{enemy.hairRoot.emoji}</div>
                              <p className="text-xs truncate">{enemy.name}</p>
                              <p className="text-xs text-muted-foreground">{enemy.hp}HP</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedSkill && selectedSkill.type === "aoe" && (
                    <>
                      <p className="text-sm font-medium text-foreground">ターゲット選択 (最大{selectedSkill.maxTargets}体):</p>
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {getEnemyPlayers().map((enemy) => (
                          <Button
                            key={enemy.id}
                            variant={selectedTargets.includes(enemy.id) ? "default" : "outline"}
                            className={`h-auto py-2 ${selectedTargets.includes(enemy.id) ? "" : "bg-transparent"}`}
                            onClick={() => {
                              setSelectedTargets(prev => {
                                if (prev.includes(enemy.id)) {
                                  return prev.filter(id => id !== enemy.id)
                                }
                                if (prev.length >= (selectedSkill.maxTargets || 2)) {
                                  return [...prev.slice(1), enemy.id]
                                }
                                return [...prev, enemy.id]
                              })
                            }}
                          >
                            <div className="text-center w-full">
                              <div className="text-lg">{enemy.hairRoot.emoji}</div>
                              <p className="text-xs truncate">{enemy.name}</p>
                              <p className="text-xs text-muted-foreground">{enemy.hp}HP</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </>
                  )}

                  <Button
                    onClick={executePlayerAction}
                    disabled={
                      !selectedSkill || 
                      ((selectedSkill.type === "attack" || selectedSkill.type === "dot") && selectedTarget === null) ||
                      (selectedSkill.type === "aoe" && selectedTargets.length === 0)
                    }
                    className="w-full bg-primary"
                  >
                    実行
                  </Button>
                </div>
              )}

              {phase === "action" && (
                <div className="flex-1 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                  />
                </div>
              )}
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-4"
            >
              <div className="text-center">
                <h2 className="text-3xl font-bold text-destructive mb-4">チーム敗退...</h2>
                <p className="text-xl text-foreground mb-2">第{playerTeamRank}位</p>
                <p className="text-secondary mb-2">
                  +{getTeamRoyaleRewardCoins(playerTeamRank)}コイン獲得!
                </p>
                {rankChange !== null && (
                  <div className="mb-4">
                    <span className="text-lg font-bold" style={{ color: getRankColor(currentRank.tier) }}>
                      {currentRank.name}
                    </span>
                    <span className={`ml-2 font-medium ${rankChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {rankChange >= 0 ? "+" : ""}{rankChange} RP
                    </span>
                  </div>
                )}
                <Button onClick={() => onNavigate("home")} className="mt-6 bg-primary">
                  ホームに戻る
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "finished" && winningTeam && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-4"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
              >
                <Crown className="w-20 h-20 mb-4" style={{ color: winningTeam.color }} />
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {winningTeam.members.some(m => !m.isNpc) ? "優勝!" : `${winningTeam.name}の勝利!`}
              </h2>
              
              {winningTeam.members.some(m => !m.isNpc) ? (
                <>
                  <p className="text-xl text-secondary mt-4">+{getTeamRoyaleRewardCoins(1)}コイン獲得!</p>
                  {rankChange !== null && (
                    <div className="mt-2">
                      <span className="text-lg font-bold" style={{ color: getRankColor(currentRank.tier) }}>
                        {currentRank.name}
                      </span>
                      <span className="ml-2 font-medium text-green-500">+{rankChange} RP</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4">
                  <p className="text-muted-foreground">あなたのチーム順位: 第{playerTeamRank}位</p>
                  <p className="text-secondary mt-1">
                    +{getTeamRoyaleRewardCoins(playerTeamRank)}コイン獲得!
                  </p>
                  {rankChange !== null && (
                    <div className="mt-2">
                      <span className="text-lg font-bold" style={{ color: getRankColor(currentRank.tier) }}>
                        {currentRank.name}
                      </span>
                      <span className={`ml-2 font-medium ${rankChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {rankChange >= 0 ? "+" : ""}{rankChange} RP
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={() => onNavigate("home")} className="mt-8 bg-primary">
                ホームに戻る
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
