"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { HAIR_ROOTS, RARITY_COLORS, calculateStats, calculateSkillBonus, getRankColor, getNpcStrengthMultiplier, getRankCoinMultiplier, getElementCombatModifiers, getDefenseSkillEffect, ELEMENT_NAMES, ELEMENT_COLORS, type HairRoot, type Skill, type Element } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Swords, Shield, Zap, Crown, Trophy } from "lucide-react"

interface BattleRoyaleScreenProps {
  onNavigate: (screen: Screen) => void
}

interface StatusEffect {
  type: "stun" | "buff" | "debuff" | "dot"
  name: string
  duration: number // Remaining turns
  value?: number // Damage per turn for dot, stat modifier for buff/debuff
  stat?: "power" | "speed" | "grip" | "all" // Which stat is affected (for buff/debuff)
}

interface BattlePlayer {
  id: number
  name: string
  hairRoot: HairRoot
  hp: number
  maxHp: number
  prevHp: number
  isNpc: boolean
  isEliminated: boolean
  cooldowns: { [skillId: string]: number }
  statusEffects: StatusEffect[]
  buffedStats: { power: number; speed: number; grip: number }
}

const NPC_NAMES = [
  "毛根マスター", "ヘアハンター", "ルートキング", "フォリクル王子",
  "抜け毛戦士", "毛母細胞Z", "ケラチン番長"
]

function generateNpcPlayer(index: number, strengthMultiplier: number, rankTier: string): BattlePlayer {
  // Select hair root based on rank
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
  
  // Apply strength multiplier
  const scaledHairRoot: HairRoot = {
    ...baseHairRoot,
    power: Math.floor(baseHairRoot.power * strengthMultiplier),
    speed: Math.floor(baseHairRoot.speed * strengthMultiplier),
    grip: Math.floor(baseHairRoot.grip * strengthMultiplier),
  }
  
  const stats = calculateStats({ ...scaledHairRoot, level: Math.floor(Math.random() * 5) + 1, exp: 0, count: 1 })
  const maxHp = Math.floor((100 + stats.power + stats.grip) * strengthMultiplier)

  return {
    id: index + 100,
    name: NPC_NAMES[index % NPC_NAMES.length],
    hairRoot: scaledHairRoot,
    hp: maxHp,
    maxHp,
    prevHp: maxHp,
    isNpc: true,
    isEliminated: false,
    cooldowns: {},
    statusEffects: [],
    buffedStats: { power: 0, speed: 0, grip: 0 },
  }
}

type BattlePhase = "waiting" | "selecting" | "action" | "result" | "finished"

export function BattleRoyaleScreen({ onNavigate }: BattleRoyaleScreenProps) {
  const { selectedHairRoot, addCoins, getRoyaleRank, updateRoyaleRank } = useGame()
  const [phase, setPhase] = useState<BattlePhase>("waiting")
  const [players, setPlayers] = useState<BattlePlayer[]>([])
  const [round, setRound] = useState(1)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]) // For AOE skills
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [winner, setWinner] = useState<BattlePlayer | null>(null)
  const [playerRank, setPlayerRank] = useState<number>(0)
  const [rankChange, setRankChange] = useState<number | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const isExecutingRef = useRef(false)
  
  const currentRank = getRoyaleRank()
  const coinMultiplier = getRankCoinMultiplier(currentRank)
  
  // Auto-scroll battle log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [battleLog])
  const strengthMultiplier = getNpcStrengthMultiplier(currentRank)

  const getRoyaleBaseCoins = (placement: number): number => {
    const coinRewards: Record<number, number> = { 1: 500, 2: 300, 3: 150, 4: 80, 5: 50, 6: 30, 7: 15, 8: 5 }
    return coinRewards[placement] || 5
  }

  const getRoyaleRewardCoins = (placement: number): number => {
    return Math.floor(getRoyaleBaseCoins(placement) * coinMultiplier)
  }

  const myPlayer = players.find((p) => !p.isNpc)
  const alivePlayers = players.filter((p) => !p.isEliminated)

  const triggerAllFather = (attacker: BattlePlayer, defender: BattlePlayer): boolean => {
    const allFather = defender.statusEffects.find((e) => e.type === "buff" && e.name === "オールファーザー")
    if (!allFather) return false

    const counter = defender.statusEffects.find((e) => e.type === "buff" && e.name === "反撃準備")
    defender.statusEffects = defender.statusEffects.filter(
      (e) => e.name !== "オールファーザー" && e.name !== "反撃準備"
    )

    setBattleLog((prev) => [...prev, `${defender.name}はオールファーザーで攻撃を完全回避!`])

    const counterValue = counter?.value ?? 0
    if (counterValue > 0) {
      attacker.hp = Math.max(0, attacker.hp - counterValue)
      setBattleLog((prev) => [...prev, `${defender.name}の反撃で${attacker.name}に${counterValue}ダメージ!`])
      if (attacker.hp <= 0) {
        attacker.isEliminated = true
        setBattleLog((prev) => [...prev, `${attacker.name}が脱落!`])
      }
    }

    return true
  }

  const startBattle = useCallback(() => {
    if (!selectedHairRoot) return

    const stats = calculateStats(selectedHairRoot)
    const maxHp = 100 + stats.power + stats.grip

    const myPlayer: BattlePlayer = {
      id: 0,
      name: "あなた",
      hairRoot: selectedHairRoot,
      hp: maxHp,
      maxHp,
      prevHp: maxHp,
      isNpc: false,
      isEliminated: false,
      cooldowns: {},
      statusEffects: [],
      buffedStats: { power: 0, speed: 0, grip: 0 },
    }

    const npcs = Array.from({ length: 7 }, (_, i) => generateNpcPlayer(i, strengthMultiplier, currentRank.tier))
    setPlayers([myPlayer, ...npcs])
    setPhase("selecting")
    setIsExecuting(false)
    setRound(1)
    setBattleLog(["バトルロワイヤル開始!"])
  }, [selectedHairRoot])

  const executePlayerAction = useCallback(() => {
    if (!selectedSkill || !myPlayer || phase !== "selecting" || isExecuting) return
    setIsExecuting(true)
    
    // Check if player is stunned
    const isStunned = myPlayer.statusEffects.some((e) => e.type === "stun")
    if (isStunned) {
      setBattleLog((prev) => [...prev, "あなたは行動不能!"])
      setPhase("action")
      setTimeout(() => {
        setPlayers((prev) => {
          const newPlayers = [...prev]
          const alive = newPlayers.filter((p) => !p.isEliminated)
          
          alive.forEach((player) => {
            if (player.isNpc && !player.isEliminated) {
              const targets = alive.filter((p) => p.id !== player.id && !p.isEliminated)
              if (targets.length === 0) return

              const target = targets[Math.floor(Math.random() * targets.length)]
              const skill = player.hairRoot.skills[Math.floor(Math.random() * 2)]
              
              if (skill.type === "attack" && skill.damage > 0) {
                const damage = Math.floor(skill.damage * (0.8 + Math.random() * 0.4))
                target.hp = Math.max(0, target.hp - damage)
                setBattleLog((prev) => [...prev, `${player.name}の${skill.name}が${target.name}に${damage}ダメージ!`])
                
                if (target.hp <= 0) {
                  target.isEliminated = true
                  setBattleLog((prev) => [...prev, `${target.name}が脱落!`])
                }
              }
            }
          })

          // Process status effects at end of turn
          newPlayers.forEach((p) => {
            if (p.isEliminated) return
            
            // Apply DoT damage
            const dotEffects = p.statusEffects.filter((e) => e.type === "dot")
            dotEffects.forEach((dot) => {
              if (dot.value && dot.value > 0) {
                p.hp = Math.max(0, p.hp - dot.value)
                setBattleLog((prev) => [...prev, `${p.name}が${dot.name}で${dot.value}ダメージ!`])
                if (p.hp <= 0) {
                  p.isEliminated = true
                  setBattleLog((prev) => [...prev, `${p.name}が脱落!`])
                }
              }
            })
            
            // Reduce duration of all status effects
            p.statusEffects = p.statusEffects.map((e) => ({ ...e, duration: e.duration - 1 }))
            
            // Remove expired effects and log
            const expiredEffects = p.statusEffects.filter((e) => e.duration <= 0)
            expiredEffects.forEach((e) => {
              if (e.type === "buff") {
                setBattleLog((prev) => [...prev, `${p.name}の${e.name}効果が切れた!`])
              } else if (e.type === "debuff") {
                setBattleLog((prev) => [...prev, `${p.name}の${e.name}が解除された!`])
              } else if (e.type === "dot") {
                setBattleLog((prev) => [...prev, `${p.name}の${e.name}が治った!`])
              }
            })
            p.statusEffects = p.statusEffects.filter((e) => e.duration > 0)
            
            // Reduce cooldowns
            p.cooldowns = Object.entries(p.cooldowns).reduce((acc, [key, value]) => ({
              ...acc,
              [key]: value > 0 ? value - 1 : 0
            }), {})
          })

          return newPlayers
        })

        // Check win condition
        setTimeout(() => {
          setPlayers((prev) => {
            const alive = prev.filter((p) => !p.isEliminated)
            const player = prev.find((p) => !p.isNpc)
            
            if (alive.length === 1) {
              setWinner(alive[0])
              if (player && !player.isEliminated) {
                // Player won!
                setPlayerRank(1)
                // Delay coin/rank updates to avoid setState during render
                setTimeout(() => {
                  addCoins(getRoyaleRewardCoins(1))
                  const change = updateRoyaleRank(1)
                  setRankChange(change)
                  const exp = getRoyaleRewardExp(1)
                  setAcquiredExp(exp)
                  if (selectedHairRoot) {
                    trainHairRoot(selectedHairRoot.id, exp)
                  }
                }, 0)
              } else if (player) {
                // NPC won, calculate player's final placement
                const playerEliminatedIndex = prev.filter((p) => p.isEliminated).findIndex((p) => p.id === player.id)
                const placement = 8 - playerEliminatedIndex
                setPlayerRank(placement)
                setTimeout(() => {
                  addCoins(getRoyaleRewardCoins(placement))
                  const change = updateRoyaleRank(placement)
                  setRankChange(change)
                  const exp = getRoyaleRewardExp(placement)
                  setAcquiredExp(exp)
                  if (selectedHairRoot) {
                    trainHairRoot(selectedHairRoot.id, exp)
                  }
                }, 0)
              }
            setIsExecuting(false)
            setPhase("finished")
          } else if (player?.isEliminated) {
            const eliminatedBefore = prev.filter((p) => p.isEliminated && p.id !== player.id).length
            const placement = 8 - eliminatedBefore
            setPlayerRank(placement)
            // Coin rewards based on placement
            // Delay coin/rank update to avoid setState during render
            setTimeout(() => {
              addCoins(getRoyaleRewardCoins(placement))
              const change = updateRoyaleRank(placement)
              setRankChange(change)
            }, 0)
            setIsExecuting(false)
            setPhase("result")
          } else {
            setRound((r) => r + 1)
            setPhase("selecting")
            setIsExecuting(false)
          }
            
            return prev
          })
        }, 1500)
      }, 500)
      return
    }

    // For attack skills, target is required
    if (selectedSkill.type === "attack" && selectedTarget === null) return
    // For AOE skills, at least one target is required
    if (selectedSkill.type === "aoe" && selectedTargets.length === 0) return

    setPhase("action")

    setPlayers((prev) => {
      const newPlayers = [...prev]
      const playerIndex = newPlayers.findIndex((p) => !p.isNpc)
      const player = newPlayers[playerIndex]
      const target = selectedTarget !== null ? newPlayers.find((p) => p.id === selectedTarget) : null
      
      if (!player) return prev

      // Save prev HP for rewind
      newPlayers.forEach((p) => { p.prevHp = p.hp })

      const stats = calculateStats({ ...player.hairRoot, level: 1, exp: 0, count: 1 })
      const buffedPower = stats.power + player.buffedStats.power

      // Helper function to get element damage modifier
      const getElementDamageMod = (attackerHairRoot: HairRoot, defenderHairRoot: HairRoot): number => {
        if (!attackerHairRoot.element || !defenderHairRoot.element) return 1.0
        const mods = getElementCombatModifiers(attackerHairRoot.element, defenderHairRoot.element)
        return mods.attackMod
      }

      // Process skill based on type and id
      switch (selectedSkill.type) {
        case "attack": {
          if (target && !target.isEliminated) {
            if (triggerAllFather(player, target)) {
              break
            }
            const baseDamage = selectedSkill.damage
            const elementMod = getElementDamageMod(player.hairRoot, target.hairRoot)
            const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
            target.hp = Math.max(0, target.hp - finalDamage)
            const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
            setBattleLog((prev) => [...prev, `あなたの${selectedSkill.name}が${target.name}に${finalDamage}ダメージ!${elementNote}`])
            if (target.hp <= 0) {
              target.isEliminated = true
              setBattleLog((prev) => [...prev, `${target.name}が脱落!`])
            }
          }
          break
        }
        case "aoe": {
          // AOE attack - hit multiple selected targets
          const targets = selectedTargets
            .map((id) => newPlayers.find((p) => p.id === id))
            .filter((t): t is BattlePlayer => t !== undefined && !t.isEliminated)
          
          if (targets.length > 0) {
            const baseDamage = selectedSkill.damage
            
            targets.forEach((t) => {
              if (triggerAllFather(player, t)) {
                return
              }
              const elementMod = getElementDamageMod(player.hairRoot, t.hairRoot)
              const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
              t.hp = Math.max(0, t.hp - finalDamage)
              const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
              setBattleLog((prev) => [...prev, `${selectedSkill.name}が${t.name}に${finalDamage}ダメージ!${elementNote}`])
              if (t.hp <= 0) {
                t.isEliminated = true
                setBattleLog((prev) => [...prev, `${t.name}が脱落!`])
              }
            })
          }
          break
        }
        case "team_heal": {
          // In solo mode, only heal self
          // Apply skill bonus from training level
          const healSkillBonus = calculateSkillBonus({ ...player.hairRoot, level: player.hairRoot.level || 1, exp: 0, count: 1 })
          const baseHealPercent = selectedSkill.id === "olympus-blessing" ? 1.0 : 0.5
          const healPercent = baseHealPercent * healSkillBonus
          const healAmount = Math.floor(player.maxHp * healPercent)
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          setBattleLog((prev) => [...prev, `${selectedSkill.name}でHP${healAmount}回復!`])
          break
        }
        case "dot": {
          // DOT attack - damage + apply status effect
          if (target && !target.isEliminated) {
            if (triggerAllFather(player, target)) {
              break
            }
            const baseDamage = selectedSkill.damage
            const elementMod = getElementDamageMod(player.hairRoot, target.hairRoot)
            const finalDamage = Math.floor(baseDamage * (1 + buffedPower / 100) * elementMod)
            target.hp = Math.max(0, target.hp - finalDamage)
            const elementNote = elementMod > 1 ? " (属性有利!)" : elementMod < 1 ? " (属性不利)" : ""
            setBattleLog((prev) => [...prev, `あなたの${selectedSkill.name}が${target.name}に${finalDamage}ダメージ!${elementNote}`])
            
            // Apply DOT effect
            if (selectedSkill.dotEffect) {
              target.statusEffects.push({
                type: "dot",
                name: selectedSkill.dotEffect.name,
                duration: selectedSkill.dotEffect.duration,
                value: selectedSkill.dotEffect.damage
              })
              setBattleLog((prev) => [...prev, `${target.name}に${selectedSkill.dotEffect?.name}を付与! (${selectedSkill.dotEffect?.duration}ターン)`])
            }
            
            if (target.hp <= 0) {
              target.isEliminated = true
              setBattleLog((prev) => [...prev, `${target.name}��脱落!`])
            }
          }
          break
        }
        case "defense": {
          // Defense skills - use shared defense mapping
          const skillBonus = calculateSkillBonus({ ...player.hairRoot, level: player.hairRoot.level || 1, exp: 0, count: 1 })
          const defenseEffect = getDefenseSkillEffect(selectedSkill.id)
          const finalDefenseValue = Math.min(100, Math.floor(defenseEffect.reduction * skillBonus))

          player.statusEffects.push({
            type: "buff",
            name: "防御強化",
            duration: defenseEffect.duration,
            value: finalDefenseValue
          })
          if (defenseEffect.log) {
            setBattleLog((prev) => [...prev, defenseEffect.log])
          } else {
            setBattleLog((prev) => [...prev, `${selectedSkill.name}で${finalDefenseValue}%ダメージ軽減!`])
          }
          break
        }
        case "special": {
          // Process special skills based on their id
          // Apply skill bonus from training level
          const specialSkillBonus = calculateSkillBonus({ ...player.hairRoot, level: player.hairRoot.level || 1, exp: 0, count: 1 })
          switch (selectedSkill.id) {
            case "bounce-back":
            case "helix-heal": {
              // Heal skills - bonus increases heal amount
              const baseHealRate = 0.25
              const healAmount = Math.floor(player.maxHp * baseHealRate * specialSkillBonus)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              setBattleLog((prev) => [...prev, `あなたは${selectedSkill.name}でHPを${healAmount}回復!`])
              break
            }
            case "static-field":
            case "entangle": {
              // Stun skills - bonus increases duration
              if (target && !target.isEliminated) {
                const stunDuration = Math.floor(1 * specialSkillBonus)
                target.statusEffects.push({
                  type: "stun",
                  name: selectedSkill.id === "static-field" ? "麻痺" : "拘束",
                  duration: stunDuration
                })
                setBattleLog((prev) => [...prev, `${target.name}は${selectedSkill.name}で動けなくなった!`])
              }
              break
            }
            case "rainbow-aura": {
              // Rainbow aura - moderate buff (bonus increases buff value)
              const buffValue = Math.floor(20 * specialSkillBonus)
              player.buffedStats.power += buffValue
              player.buffedStats.speed += buffValue
              player.buffedStats.grip += buffValue
              player.statusEffects.push({
                type: "buff",
                name: "虹のオーラ",
                duration: 3,
                value: buffValue
              })
              setBattleLog((prev) => [...prev, `虹のオーラで全ステータス+${buffValue}!`])
              break
            }
            case "holy-blessing": {
              // Legendary buff - massive stat boost + heal (bonus increases both)
              const buffValue = Math.floor(50 * specialSkillBonus)
              player.buffedStats.power += buffValue
              player.buffedStats.speed += buffValue
              player.buffedStats.grip += buffValue
              const healAmount = Math.floor(player.maxHp * 0.4 * specialSkillBonus)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              player.statusEffects.push({
                type: "buff",
                name: "神の祝福",
                duration: 4,
                value: buffValue
              })
              setBattleLog((prev) => [...prev, `神の祝福! 全ステータス+${buffValue}、HP${healAmount}回復!`])
              break
            }
            case "rebirth": {
              // Phoenix rebirth - epic heal (70%)
              const healAmount = Math.floor(player.maxHp * 0.7 * specialSkillBonus)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              setBattleLog((prev) => [...prev, `不死鳥の再生! ${healAmount}HP回復!`])
              break
            }
            case "rewind": {
              // Time rewind - restore HP + give invincibility
              const healAmount = Math.floor(player.maxHp * 0.35 * specialSkillBonus)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              player.statusEffects.push({
                type: "buff",
                name: "時間歪曲",
                duration: 1,
                value: 100
              })
              setBattleLog((prev) => [...prev, `時を戻した! HP${healAmount}回復+1ターン無敵!`])
              break
            }
            case "toxic-cloud": {
              // Poison cloud - applies poison to all enemies
              const enemies = newPlayers.filter((p) => p.id !== player.id && !p.isEliminated)
              enemies.forEach((enemy) => {
                enemy.statusEffects.push({
                  type: "debuff",
                  name: "毒",
                  duration: 3,
                  value: 10
                })
              })
              setBattleLog((prev) => [...prev, `毒霧が広がり、全ての敵が毒状態に!`])
              break
            }
            case "moon-blessing": {
              // Moon blessing - heal 40% HP
              const healAmount = Math.floor(player.maxHp * 0.4)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              setBattleLog((prev) => [...prev, `月の加護で${healAmount}HP回復!`])
              break
            }
            case "sunlight-heal": {
              // Sunlight heal - heal 50% HP + attack buff
              const healAmount = Math.floor(player.maxHp * 0.5)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              player.buffedStats.power += 25
              player.statusEffects.push({
                type: "buff",
                name: "太陽の力",
                duration: 3,
                value: 25
              })
              setBattleLog((prev) => [...prev, `日光でHP${healAmount}回復+攻撃力UP!`])
              break
            }
            case "hellfire-breath": {
              // Hellfire breath - burn all enemies
              const enemies = newPlayers.filter((p) => p.id !== player.id && !p.isEliminated)
              const burnDamage = 30
              enemies.forEach((enemy) => {
                enemy.hp = Math.max(0, enemy.hp - burnDamage)
                enemy.statusEffects.push({
                  type: "debuff",
                  name: "炎上",
                  duration: 2,
                  value: 15
                })
                if (enemy.hp <= 0) {
                  enemy.isEliminated = true
                  setBattleLog((prev) => [...prev, `${enemy.name}が脱落!`])
                }
              })
              setBattleLog((prev) => [...prev, `地獄の炎が全員を焼き尽くす! ${burnDamage}ダメージ+炎上!`])
              break
            }
            case "einherjar": {
              // Einherjar - large heal + temporary invincibility
              const healAmount = Math.floor(player.maxHp * 0.6)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              player.statusEffects.push({
                type: "buff",
                name: "勇者の魂",
                duration: 2,
                value: 50
              })
              setBattleLog((prev) => [...prev, `勇者の魂が宿る! HP${healAmount}回復+防御強化!`])
              break
            }
            case "all-father": {
              // Odin's all-father - perfect dodge + counter next attack
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
              setBattleLog((prev) => [...prev, `全知の力発動! 次の攻撃を完全回避+反撃準備!`])
              break
            }
            case "end-world": {
              // Galaktica's end-world - instant kill target
              if (target && !target.isEliminated) {
                target.hp = 0
                target.isEliminated = true
                setBattleLog((prev) => [...prev, `${target.name}は世界から消滅した!!`])
              }
              break
            }
            default:
              setBattleLog((prev) => [...prev, `${selectedSkill.name}発動!`])
          }
          break
        }
      }

      // Update cooldowns
      if (selectedSkill.cooldown > 0) {
        player.cooldowns = {
          ...player.cooldowns,
          [selectedSkill.id]: selectedSkill.cooldown
        }
      }

      return newPlayers
    })

    // NPC actions
    setTimeout(() => {
      setPlayers((prev) => {
        const newPlayers = [...prev]
        const alive = newPlayers.filter((p) => !p.isEliminated)
        
        alive.forEach((player) => {
          player.cooldowns = { ...player.cooldowns }
          if (player.isNpc && !player.isEliminated) {
            // Check if stunned
            const isStunned = player.statusEffects.some((e) => e.type === "stun")
            if (isStunned) {
              setBattleLog((prev) => [...prev, `${player.name}は行動不能!`])
              return
            }

            const targets = alive.filter((p) => p.id !== player.id && !p.isEliminated)
            if (targets.length === 0) return

            const target = targets[Math.floor(Math.random() * targets.length)]
            
            // Choose skill intelligently
            const availableSkills = player.hairRoot.skills.filter(
              (s) => (player.cooldowns[s.id] || 0) <= 0
            )
            const skill = availableSkills.length > 0 
              ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
              : { id: "normal-attack", name: "通常攻撃", damage: 15, cooldown: 0, type: "attack" as const, description: "" }
            
            // Check for defense buff
            const defenseBonus = target.statusEffects.find((e) => e.name === "防御強化")
            const defenseReduction = defenseBonus ? (defenseBonus.value || 0) / 100 : 0

            if (skill.type === "attack" && skill.damage > 0) {
              if (triggerAllFather(player, target)) {
                return
              }
              const baseDamage = Math.floor(skill.damage * (0.8 + Math.random() * 0.4))
              const damage = Math.floor(baseDamage * (1 - defenseReduction))
              target.hp = Math.max(0, target.hp - damage)
              setBattleLog((prev) => [...prev, `${player.name}の${skill.name}が${target.name}に${damage}ダメージ!`])
              
              if (target.hp <= 0) {
                target.isEliminated = true
                setBattleLog((prev) => [...prev, `${target.name}が脱落!`])
              }
              if (skill.cooldown > 0) {
                player.cooldowns = {
                  ...player.cooldowns,
                  [skill.id]: skill.cooldown
                }
              }
            } else if (skill.type === "special") {
              // NPC special skill usage - enhanced for Epic/Legendary
              if (skill.id === "bounce-back" || skill.id === "helix-heal") {
                const healAmount = Math.floor(player.maxHp * 0.25)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                setBattleLog((prev) => [...prev, `${player.name}は${skill.name}でHP回復!`])
              } else if (skill.id === "rebirth") {
                // Epic phoenix heal - 70%
                const healAmount = Math.floor(player.maxHp * 0.7)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                setBattleLog((prev) => [...prev, `${player.name}の不死鳥が再生! 大回復!`])
              } else if (skill.id === "holy-blessing") {
                // Legendary buff + heal
                const healAmount = Math.floor(player.maxHp * 0.4)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                player.buffedStats.power += 50
                player.buffedStats.speed += 50
                player.buffedStats.grip += 50
                player.statusEffects.push({ type: "buff", name: "神の祝福", duration: 4, value: 50 })
                setBattleLog((prev) => [...prev, `${player.name}に神の祝福が降りた!`])
              } else if (skill.id === "rewind") {
                // Time rewind
                const healAmount = Math.floor(player.maxHp * 0.35)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                player.statusEffects.push({ type: "buff", name: "時間歪曲", duration: 1, value: 100 })
                setBattleLog((prev) => [...prev, `${player.name}が時を戻した!`])
              } else if (skill.id === "static-field" || skill.id === "entangle") {
                target.statusEffects.push({ type: "stun", name: "状態異常", duration: 1 })
                setBattleLog((prev) => [...prev, `${target.name}は${skill.name}で動けなくなった!`])
              } else if (skill.id === "rainbow-aura") {
                player.buffedStats.power += 20
                player.buffedStats.speed += 20
                player.buffedStats.grip += 20
                player.statusEffects.push({ type: "buff", name: "虹のオーラ", duration: 3, value: 20 })
                setBattleLog((prev) => [...prev, `${player.name}に虹のオーラ!`])
              } else if (skill.id === "toxic-cloud") {
                // Poison all enemies
                const enemies = alive.filter((p) => p.id !== player.id)
                enemies.forEach((e) => {
                  e.statusEffects.push({ type: "dot", name: "毒", duration: 3, value: 10 })
                })
                setBattleLog((prev) => [...prev, `${player.name}の毒霧が広がった! (3ターン)`])
              } else if (skill.id === "moon-blessing") {
                const healAmount = Math.floor(player.maxHp * 0.4)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                setBattleLog((prev) => [...prev, `${player.name}は月の加護でHP回復!`])
              } else if (skill.id === "sunlight-heal") {
                const healAmount = Math.floor(player.maxHp * 0.5)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                player.buffedStats.power += 25
                player.statusEffects.push({ type: "buff", name: "太陽の力", duration: 3, value: 25 })
                setBattleLog((prev) => [...prev, `${player.name}に日光の力!`])
              } else if (skill.id === "hellfire-breath") {
                const enemies = alive.filter((p) => p.id !== player.id)
                const burnDamage = 30
                enemies.forEach((e) => {
                  e.hp = Math.max(0, e.hp - burnDamage)
                  e.statusEffects.push({ type: "debuff", name: "炎上", duration: 2, value: 15 })
                  if (e.hp <= 0) {
                    e.isEliminated = true
                    setBattleLog((prev) => [...prev, `${e.name}が脱落!`])
                  }
                })
                setBattleLog((prev) => [...prev, `${player.name}の地獄の炎!`])
              } else if (skill.id === "einherjar") {
                const healAmount = Math.floor(player.maxHp * 0.6)
                player.hp = Math.min(player.maxHp, player.hp + healAmount)
                player.statusEffects.push({ type: "buff", name: "勇者の魂", duration: 2, value: 50 })
                setBattleLog((prev) => [...prev, `${player.name}に勇者の魂が宿った!`])
              } else if (skill.id === "all-father") {
                player.statusEffects.push({ type: "buff", name: "オールファーザー", duration: 1, value: 100 })
                player.statusEffects.push({ type: "buff", name: "反撃準備", duration: 1, value: 80 })
                setBattleLog((prev) => [...prev, `${player.name}が全知の力を発動!`])
              } else if (skill.id === "end-world") {
                if (target && !target.isEliminated) {
                  target.hp = 0
                  target.isEliminated = true
                  setBattleLog((prev) => [...prev, `${player.name}の${skill.name}! ${target.name}は世界から消滅した!!`])
                }
              }
              if (skill.cooldown > 0) {
                player.cooldowns = {
                  ...player.cooldowns,
                  [skill.id]: skill.cooldown
                }
              }
            } else if (skill.type === "dot") {
              // NPC DOT attack
              const enemies = alive.filter((p) => p.id !== player.id && !p.isEliminated)
              if (enemies.length > 0) {
                const target = enemies[Math.floor(Math.random() * enemies.length)]
                if (triggerAllFather(player, target)) {
                  return
                }
                const baseDamage = Math.floor(skill.damage * (0.8 + Math.random() * 0.4))
                const def = target.statusEffects.find((e) => e.name === "防御強化")
                const reduction = def ? (def.value || 0) / 100 : 0
                const dmg = Math.floor(baseDamage * (1 - reduction))
                target.hp = Math.max(0, target.hp - dmg)
                setBattleLog((prev) => [...prev, `${player.name}の${skill.name}が${target.name}に${dmg}ダメージ!`])
                
                if (skill.dotEffect) {
                  target.statusEffects.push({
                    type: "dot",
                    name: skill.dotEffect.name,
                    duration: skill.dotEffect.duration,
                    value: skill.dotEffect.damage
                  })
                  setBattleLog((prev) => [...prev, `${target.name}に${skill.dotEffect?.name}を付与! (${skill.dotEffect?.duration}ターン)`])
                }
                
                if (target.hp <= 0) {
                  target.isEliminated = true
                  setBattleLog((prev) => [...prev, `${target.name}が脱落!`])
                }
              }
              if (skill.cooldown > 0) {
                player.cooldowns = {
                  ...player.cooldowns,
                  [skill.id]: skill.cooldown
                }
              }
            } else if (skill.type === "aoe" && skill.damage > 0) {
              // NPC AOE attack
              const maxTargets = skill.maxTargets || 2
              const enemies = alive.filter((p) => p.id !== player.id && !p.isEliminated)
              const aoeTargets = enemies.slice(0, Math.min(maxTargets, enemies.length))
              const baseDamage = Math.floor(skill.damage * (0.8 + Math.random() * 0.4))
              
              aoeTargets.forEach((t) => {
                if (triggerAllFather(player, t)) {
                  return
                }
                const def = t.statusEffects.find((e) => e.name === "防御強化")
                const reduction = def ? (def.value || 0) / 100 : 0
                const dmg = Math.floor(baseDamage * (1 - reduction))
                t.hp = Math.max(0, t.hp - dmg)
                setBattleLog((prev) => [...prev, `${skill.name}が${t.name}に${dmg}ダメージ!`])
                if (t.hp <= 0) {
                  t.isEliminated = true
                  setBattleLog((prev) => [...prev, `${t.name}が脱落!`])
                }
              })
              if (skill.cooldown > 0) {
                player.cooldowns = {
                  ...player.cooldowns,
                  [skill.id]: skill.cooldown
                }
              }
            } else if (skill.type === "team_heal") {
              // In solo mode, NPC only heals self
              const healPercent = skill.id === "olympus-blessing" ? 1.0 : 0.5
              const healAmount = Math.floor(player.maxHp * healPercent)
              player.hp = Math.min(player.maxHp, player.hp + healAmount)
              setBattleLog((prev) => [...prev, `${player.name}の${skill.name}! HP回復!`])
              if (skill.cooldown > 0) {
                player.cooldowns[skill.id] = skill.cooldown
              }
            } else if (skill.type === "defense") {
              // NPC defense skills
              const defenseEffect = getDefenseSkillEffect(skill.id)
              player.statusEffects.push({
                type: "buff",
                name: "防御強化",
                duration: defenseEffect.duration,
                value: defenseEffect.reduction
              })
              if (defenseEffect.log) {
                setBattleLog((prev) => [...prev, defenseEffect.log])
              } else {
                setBattleLog((prev) => [...prev, `${player.name}は${skill.name}で防御!`])
              }
              if (skill.cooldown > 0) {
                player.cooldowns = {
                  ...player.cooldowns,
                  [skill.id]: skill.cooldown
                }
              }
            }
          }

        })

        // Apply debuff damage (poison, burn)
        newPlayers.forEach((p) => {
          if (p.isEliminated) return
          
          p.statusEffects.forEach((effect) => {
            if (effect.type === "debuff" && effect.value && effect.value > 0 && ["毒", "炎上", "凍傷"].includes(effect.name)) {
              const debuffDamage = effect.value
              p.hp = Math.max(0, p.hp - debuffDamage)
              if (effect.name === "毒") {
                setBattleLog((prev) => [...prev, `${p.name}は毒で${debuffDamage}ダメージ!`])
              } else if (effect.name === "炎上") {
                setBattleLog((prev) => [...prev, `${p.name}は炎上で${debuffDamage}ダメージ!`])
              } else if (effect.name === "凍傷") {
                setBattleLog((prev) => [...prev, `${p.name}は凍傷で${debuffDamage}ダメージ!`])
              }
              if (p.hp <= 0) {
                p.isEliminated = true
                setBattleLog((prev) => [...prev, `${p.name}が脱落!`])
              }
            }
          })
        })

        // Reduce cooldowns and status effects
        newPlayers.forEach((p) => {
          Object.keys(p.cooldowns).forEach((skillId) => {
            if (p.cooldowns[skillId] > 0) {
              p.cooldowns[skillId]--
            }
          })
          // Reduce status effect duration
          p.statusEffects = p.statusEffects.filter((effect) => {
            effect.duration--
            if (effect.duration <= 0 && effect.name !== "防御強化") {
              // Remove buff stats when buff expires
              if (effect.type === "buff" && effect.value) {
                p.buffedStats.power = Math.max(0, p.buffedStats.power - effect.value)
                p.buffedStats.speed = Math.max(0, p.buffedStats.speed - effect.value)
                p.buffedStats.grip = Math.max(0, p.buffedStats.grip - effect.value)
              }
            }
            return effect.duration > 0
          })
        })

        return newPlayers
      })

      // Check win condition
      setTimeout(() => {
        setPlayers((prev) => {
          const alive = prev.filter((p) => !p.isEliminated)
          const player = prev.find((p) => !p.isNpc)
          
          if (alive.length === 1) {
            setWinner(alive[0])
            if (player && !player.isEliminated) {
              setPlayerRank(1)
              // Delay coin/rank update to avoid setState during render
              setTimeout(() => {
                addCoins(getRoyaleRewardCoins(1))
                const change = updateRoyaleRank(1)
                setRankChange(change)
              }, 0)
            } else {
              const eliminatedOrder = prev.filter((p) => p.isEliminated)
              const placement = eliminatedOrder.length + 1
              setPlayerRank(placement)
              setTimeout(() => {
                addCoins(getRoyaleRewardCoins(placement))
                const change = updateRoyaleRank(placement)
                setRankChange(change)
              }, 0)
            }
            setIsExecuting(false)
            setPhase("finished")
          } else if (player?.isEliminated) {
            const eliminatedBefore = prev.filter((p) => p.isEliminated && p.id !== player.id).length
            const placement = 8 - eliminatedBefore
            setPlayerRank(placement)
            // Coin rewards based on placement
            // Delay coin/rank update to avoid setState during render
            setTimeout(() => {
              addCoins(getRoyaleRewardCoins(placement))
              const change = updateRoyaleRank(placement)
              setRankChange(change)
            }, 0)
            setPhase("result")
          } else {
            setRound((r) => r + 1)
            setPhase("selecting")
            setIsExecuting(false)
          }
          
          return prev
        })
      }, 1500)
    }, 1000)

    setSelectedSkill(null)
    setSelectedTarget(null)
    setSelectedTargets([])
  }, [selectedSkill, selectedTarget, selectedTargets, phase, isExecuting, addCoins, updateRoyaleRank, coinMultiplier])

  const continueWatching = () => {
    // Simulate remaining battle
    setPhase("action")
    
    const simulateBattle = () => {
      setPlayers((prev) => {
        let newPlayers = [...prev]
        const alive = newPlayers.filter((p) => !p.isEliminated)
        
        if (alive.length <= 1) {
setWinner(alive[0] || null)
            setIsExecuting(false)
            setPhase("finished")
            return newPlayers
        }

        alive.forEach((player) => {
          if (!player.isEliminated) {
            const targets = alive.filter((p) => p.id !== player.id && !p.isEliminated)
            if (targets.length === 0) return

            const target = targets[Math.floor(Math.random() * targets.length)]
            const skill = player.hairRoot.skills[Math.floor(Math.random() * 2)]
            
            if (skill.type === "attack" && skill.damage > 0) {
              const damage = Math.floor(skill.damage * (0.8 + Math.random() * 0.4))
              target.hp = Math.max(0, target.hp - damage)
              
              if (target.hp <= 0) {
                target.isEliminated = true
                setBattleLog((prev) => [...prev.slice(-10), `${target.name}が脱落!`])
              }
            }
          }
        })

        return newPlayers
      })
    }

    const interval = setInterval(() => {
      setPlayers((prev) => {
        const alive = prev.filter((p) => !p.isEliminated)
        if (alive.length <= 1) {
clearInterval(interval)
            setWinner(alive[0] || null)
            setIsExecuting(false)
            setPhase("finished")
            }
        return prev
      })
      simulateBattle()
    }, 500)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">毛根バトルロワイヤル</h1>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Trophy className="w-4 h-4" style={{ color: getRankColor(currentRank.tier) }} />
            <span className="text-sm font-medium" style={{ color: getRankColor(currentRank.tier) }}>
              {currentRank.name}
            </span>
          </div>
        </div>
        <div className="text-sm">
          {phase !== "waiting" && phase !== "finished" && (
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded">
              R{round}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        <AnimatePresence mode="wait">
          {/* Waiting Phase */}
          {phase === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="text-center mb-8">
                <Swords className="w-20 h-20 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">8人バトルロワイヤル</h2>
                <p className="text-muted-foreground">最後の1人になるまで戦い抜け!</p>
              </div>

              {selectedHairRoot ? (
                <div className="bg-card rounded-xl p-6 border border-border mb-6 w-full max-w-sm">
                  <h3 className="text-sm text-muted-foreground mb-3">参戦毛根</h3>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${selectedHairRoot.color}20` }}
                    >
                      {selectedHairRoot.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{selectedHairRoot.name}</p>
                      <p className="text-xs text-muted-foreground">Lv.{selectedHairRoot.level}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedHairRoot.skills.map((skill) => (
                      <div key={skill.id} className="bg-muted rounded-lg p-2 text-xs">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-muted-foreground ml-2">{skill.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-destructive mb-6">毛根を選択してください</p>
              )}

              <Button
                onClick={startBattle}
                disabled={!selectedHairRoot}
                className="bg-gradient-to-r from-primary to-secondary px-8 py-6 text-lg"
              >
                バトル開始
              </Button>
            </motion.div>
          )}

          {/* Battle Phase */}
          {(phase === "selecting" || phase === "action") && (
            <motion.div
              key="battle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Players Grid */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    animate={{
                      opacity: player.isEliminated ? 0.3 : 1,
                      scale: player.isEliminated ? 0.9 : 1,
                    }}
                    className={`
                      relative bg-card rounded-lg p-2 border transition-all
                      ${!player.isNpc ? "border-primary border-2" : "border-border"}
                      ${selectedTarget === player.id || selectedTargets.includes(player.id) ? "ring-2 ring-accent" : ""}
                      ${player.isEliminated ? "grayscale" : ""}
                    `}
                    onClick={() => {
                      if (phase === "selecting" && player.isNpc && !player.isEliminated && selectedSkill) {
                        if (selectedSkill.type === "aoe") {
                          // Toggle target for AOE
                          setSelectedTargets((prev) => {
                            if (prev.includes(player.id)) {
                              return prev.filter((id) => id !== player.id)
                            }
                            const maxTargets = selectedSkill.maxTargets || 3
                            if (prev.length >= maxTargets) {
                              return [...prev.slice(1), player.id]
                            }
                            return [...prev, player.id]
                          })
                        } else {
                          setSelectedTarget(player.id)
                        }
                      }
                    }}
                  >
                    <div className="text-center">
                      <div
                        className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-xl mb-1 relative"
                        style={{ backgroundColor: `${player.hairRoot.color}20` }}
                      >
                        {player.hairRoot.emoji}
                        {player.hairRoot.element && (
                          <span 
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: ELEMENT_COLORS[player.hairRoot.element] }}
                            title={ELEMENT_NAMES[player.hairRoot.element]}
                          >
                            {ELEMENT_NAMES[player.hairRoot.element][0]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">
                        {player.isNpc ? player.name : "あなた"}
                      </p>
                      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all ${player.hp > player.maxHp * 0.3 ? "bg-accent" : "bg-destructive"}`}
                          style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{player.hp}/{player.maxHp}</p>
                      {/* Status effects */}
                      {player.statusEffects.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-1">
                          {player.statusEffects.map((effect, i) => (
                            <span
                              key={i}
                              className={`text-[8px] px-1 rounded ${
                                effect.type === "stun" 
                                  ? "bg-destructive/20 text-destructive" 
                                  : "bg-accent/20 text-accent"
                              }`}
                            >
                              {effect.type === "stun" ? "!" : "+"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {player.isEliminated && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <span className="text-xs text-destructive font-bold">脱落</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Battle Log */}
              <div 
                ref={logRef}
                className="bg-card rounded-lg p-3 mb-4 max-h-40 overflow-y-auto border border-border scroll-smooth"
              >
                <div className="space-y-1">
                  {battleLog.map((log, i) => (
                    <p 
                      key={i} 
                      className={`text-xs ${
                        log.includes("脱落") ? "text-destructive font-medium" :
                        log.includes("回復") ? "text-accent font-medium" :
                        log.includes("あなた") ? "text-primary" :
                        "text-muted-foreground"
                      }`}
                    >
                      <span className="text-muted-foreground/50 mr-1">[{i + 1}]</span>
                      {log}
                    </p>
                  ))}
                  {battleLog.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">バトル開始を待っています...</p>
                  )}
                </div>
              </div>

              {/* Action Panel */}
              {phase === "selecting" && myPlayer && !myPlayer.isEliminated && (
                <div className="bg-card rounded-xl p-4 border border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">アクションを選択</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {/* Normal Attack - always available */}
                    <Button
                      variant={selectedSkill?.id === "normal-attack" ? "default" : "outline"}
                      onClick={() => {
                        setSelectedSkill({
                          id: "normal-attack",
                          name: "通常攻撃",
                          description: "基本的な攻撃",
                          damage: 15,
                          cooldown: 0,
                          type: "attack"
                        })
                        setSelectedTarget(null)
                        setSelectedTargets([])
                      }}
                      className="h-auto py-3 flex-col items-start"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Swords className="w-4 h-4" />
                        <span className="font-medium text-sm">通常攻撃</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">威力: 15</span>
                    </Button>
                    
                    {/* Normal Defense - always available */}
                    <Button
                      variant={selectedSkill?.id === "normal-defense" ? "default" : "outline"}
                      onClick={() => {
                        setSelectedSkill({
                          id: "normal-defense",
                          name: "通常防御",
                          description: "基本的な防御",
                          damage: 0,
                          cooldown: 0,
                          type: "defense"
                        })
                        setSelectedTarget(null)
                        setSelectedTargets([])
                      }}
                      className="h-auto py-3 flex-col items-start"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium text-sm">通常防御</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">軽減: 20%</span>
                    </Button>
                    
                    {/* Skills */}
                    {myPlayer.hairRoot.skills.map((skill) => {
                      const onCooldown = (myPlayer.cooldowns[skill.id] || 0) > 0
                      return (
                        <Button
                          key={skill.id}
                          variant={selectedSkill?.id === skill.id ? "default" : "outline"}
                          disabled={onCooldown}
                          onClick={() => {
                            setSelectedSkill(skill)
                            setSelectedTarget(null)
                            setSelectedTargets([])
                          }}
                          className="h-auto py-3 flex-col items-start"
                        >
                          <div className="flex items-center gap-2 w-full">
                            {skill.type === "attack" || skill.type === "aoe" || skill.type === "dot" ? <Swords className="w-4 h-4" /> : 
                             skill.type === "defense" ? <Shield className="w-4 h-4" /> : 
                             <Zap className="w-4 h-4" />}
                            <span className="font-medium text-xs">{skill.name}</span>
                          </div>
                          {onCooldown ? (
                            <span className="text-xs text-destructive mt-1">
                              CT: {myPlayer.cooldowns[skill.id]}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground mt-1">
                              {skill.type === "attack" && `威力: ${skill.damage}`}
                              {skill.type === "aoe" && `範囲${skill.maxTargets}体`}
                              {skill.type === "dot" && `${skill.damage}+${skill.dotEffect?.name}`}
                              {skill.type === "defense" && "防御"}
                              {skill.type === "team_heal" && "味方回復"}
                              {skill.type === "special" && (
                                ["bounce-back", "helix-heal", "rebirth"].includes(skill.id) ? "回復" :
                                ["static-field", "entangle"].includes(skill.id) ? "状態異常" :
                                ["rainbow-aura", "holy-blessing"].includes(skill.id) ? "強化" :
                                skill.id === "rewind" ? "HP復元" : "特殊"
                              )}
                            </span>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                  
                  {selectedSkill ? (
                    <div className="text-center">
                      {/* Skill Detail Box */}
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
                      <p className="text-xs text-muted-foreground mb-2">
                        {selectedSkill.type === "defense" || selectedSkill.type === "team_heal" || (selectedSkill.type === "special" && !["static-field", "entangle"].includes(selectedSkill.id))
                          ? `${selectedSkill.name}を発動`
                          : selectedSkill.type === "aoe"
                            ? selectedTargets.length > 0
                              ? `${selectedTargets.length}体を攻撃! (最大${selectedSkill.maxTargets || 3}体)`
                              : `ターゲットを選択 (最大${selectedSkill.maxTargets || 3}体)`
                            : selectedTarget !== null 
                              ? "攻撃!" 
                              : "ターゲットを選択してください"}
                      </p>
                      <Button
                        disabled={
                          isExecuting ||
                          (selectedSkill.type === "attack" || selectedSkill.type === "dot" || ["static-field", "entangle"].includes(selectedSkill.id)) && selectedTarget === null ||
                          selectedSkill.type === "aoe" && selectedTargets.length === 0
                        }
                        onClick={executePlayerAction}
                        className="bg-primary"
                      >
                        {isExecuting ? "実行中..." : "実行"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      アクションを選択してください
                    </p>
                  )}
                </div>
              )}

              {phase === "action" && (
                <div className="text-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                    className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"
                  />
                  <p className="text-sm text-muted-foreground mt-2">バトル中...</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Player Eliminated */}
          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="text-center">
                <h2 className="text-3xl font-bold text-destructive mb-4">脱落...</h2>
                <p className="text-xl text-foreground mb-2">第{playerRank}位</p>
<p className="text-secondary mb-2">
                  +{getRoyaleRewardCoins(playerRank)}コイン獲得!
  </p>
                <p className="text-accent mb-2">
                  +{acquiredExp}経験値獲得!
                </p>
                {rankChange !== null && (
                  <div className="mb-4">
                    <span
                      className="text-lg font-bold"
                      style={{ color: getRankColor(currentRank.tier) }}
                    >
                      {currentRank.name}
                    </span>
                    <span className={`ml-2 font-medium ${rankChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {rankChange >= 0 ? "+" : ""}{rankChange} RP
                    </span>
                  </div>
                )}
                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => onNavigate("home")} className="bg-transparent">
                    ホームに戻る
                  </Button>
                  <Button onClick={continueWatching} className="bg-primary">
                    観戦する
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Battle Finished */}
          {phase === "finished" && winner && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                className="mb-6"
              >
                <Crown className="w-20 h-20 text-secondary" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {winner.isNpc ? `${winner.name}の勝利!` : "優勝おめでとう!"}
              </h2>
              
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-4"
                style={{ backgroundColor: `${winner.hairRoot.color}30` }}
              >
                {winner.hairRoot.emoji}
              </div>
              
              <p className="text-lg font-medium" style={{ color: RARITY_COLORS[winner.hairRoot.rarity] }}>
                {winner.hairRoot.name}
              </p>

              {!winner.isNpc && (
                <>
                  <p className="text-xl text-secondary mt-4">+{getRoyaleRewardCoins(1)}コイン獲得!</p>
                  <p className="text-accent mt-1">+{acquiredExp}経験値獲得!</p>
                  {rankChange !== null && (
                    <div className="mt-2">
                      <span
                        className="text-lg font-bold"
                        style={{ color: getRankColor(currentRank.tier) }}
                      >
                        {currentRank.name}
                      </span>
                      <span className="ml-2 font-medium text-green-500">
                        +{rankChange} RP
                      </span>
                    </div>
                  )}
                </>
              )}

              {winner.isNpc && (
                <div className="mt-4">
                  <p className="text-muted-foreground">あなたの順位: 第{playerRank}位</p>
                  <p className="text-secondary mt-1">
                    +{getRoyaleRewardCoins(playerRank)}コイン獲得!
                  </p>
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
