"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import {
  type CollectedHairRoot,
  type GameState,
  type RankInfo,
  INITIAL_GAME_STATE,
  pullGacha,
  LEVEL_UP_EXP,
  HAIR_ROOTS,
  EVOLUTION_COST,
  getRankFromPoints,
  calculatePointsChange,
  BOSS_HAIR_ROOT,
  BOSS_RAID_CONFIG,
} from "./game-data"

const STORAGE_KEY = "game-hair-save-data"

interface GameContextType extends GameState {
  pullSingle: () => CollectedHairRoot | null
  pullTen: () => CollectedHairRoot[]
  addCoins: (amount: number) => void
  trainHairRoot: (id: number, exp: number) => void
  selectHairRoot: (hairRoot: CollectedHairRoot | null) => void
  getCollectedById: (id: number) => CollectedHairRoot | undefined
  evolveHairRoot: (id: number) => CollectedHairRoot | null
  canEvolve: (id: number) => boolean
  getBattleRank: () => RankInfo
  getRoyaleRank: () => RankInfo
  getTeamRoyaleRank: () => RankInfo
  updateBattleRank: (won: boolean) => number
  updateRoyaleRank: (placement: number) => number
  updateTeamRoyaleRank: (teamPlacement: number) => number
  updateProfile: (name: string, title: string) => void
  setBgmEnabled: (enabled: boolean) => void
  setBgmVolume: (volume: number) => void
  setBrightness: (brightness: number) => void
  defeatBossRaid: () => void
  resetGameData: () => void
  exportGameData: () => string
  importGameData: (data: string) => boolean
}

const GameContext = createContext<GameContextType | null>(null)

// Load game state from localStorage
function loadGameState(): GameState {
  if (typeof window === "undefined") return INITIAL_GAME_STATE
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return INITIAL_GAME_STATE
    
    const parsed = JSON.parse(saved)
    // Merge with INITIAL_GAME_STATE to ensure all new fields exist
    return {
      ...INITIAL_GAME_STATE,
      ...parsed,
    }
  } catch (error) {
    console.error("Failed to load game data:", error)
    return INITIAL_GAME_STATE
  }
}

// Save game state to localStorage
function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error("Failed to save game data:", error)
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(loadGameState)
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveGameState(state)
  }, [state])

  const pullSingle = useCallback((): CollectedHairRoot | null => {
    if (state.coins < 10) return null
    
    const pulled = pullGacha()
    let result: CollectedHairRoot | null = null
    
    setState((prev) => {
      const existing = prev.collection.find((h) => h.id === pulled.id)
      if (existing) {
        const updated = { ...existing, count: existing.count + 1 }
        result = updated
        return {
          ...prev,
          coins: prev.coins - 10,
          collection: prev.collection.map((h) => h.id === pulled.id ? updated : h),
        }
      } else {
        const newHairRoot: CollectedHairRoot = {
          ...pulled,
          level: 1,
          exp: 0,
          count: 1,
        }
        result = newHairRoot
        return {
          ...prev,
          coins: prev.coins - 10,
          collection: [...prev.collection, newHairRoot],
        }
      }
    })
    
    return result
  }, [state.coins])

  const pullTen = useCallback((): CollectedHairRoot[] => {
    if (state.coins < 100) return []
    
    const pulledItems: ReturnType<typeof pullGacha>[] = []
    for (let i = 0; i < 10; i++) {
      pulledItems.push(pullGacha())
    }
    
    // Build results outside of setState to avoid closure issues
    const results: CollectedHairRoot[] = []
    let tempCollection = [...state.collection]
    
    for (const pulled of pulledItems) {
      const existingIndex = tempCollection.findIndex((h) => h.id === pulled.id)
      if (existingIndex >= 0) {
        const existing = tempCollection[existingIndex]
        const updated = { ...existing, count: existing.count + 1 }
        tempCollection[existingIndex] = updated
        results.push(updated)
      } else {
        const newHairRoot: CollectedHairRoot = {
          ...pulled,
          level: 1,
          exp: 0,
          count: 1,
        }
        tempCollection = [...tempCollection, newHairRoot]
        results.push(newHairRoot)
      }
    }
    
    setState((prev) => ({
      ...prev,
      coins: prev.coins - 100,
      collection: tempCollection,
    }))
    
    return results
  }, [state.coins, state.collection])

  const addCoins = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, coins: prev.coins + amount }))
  }, [])

  const trainHairRoot = useCallback((id: number, expGain: number) => {
    setState((prev) => {
      let updatedSelected: CollectedHairRoot | null = prev.selectedHairRoot
      const updated = prev.collection.map((h) => {
        if (h.id !== id) return h
        
        let newExp = h.exp + expGain
        let newLevel = h.level
        
        while (newLevel < 10 && newExp >= LEVEL_UP_EXP[newLevel]) {
          newExp -= LEVEL_UP_EXP[newLevel]
          newLevel++
        }
        
        if (newLevel >= 10) {
          newLevel = 10
          newExp = 0
        }
        
        const updatedHair = { ...h, exp: newExp, level: newLevel }
        if (prev.selectedHairRoot?.id === id) {
          updatedSelected = updatedHair
        }
        return updatedHair
      })
      return { ...prev, collection: updated, selectedHairRoot: updatedSelected }
    })
  }, [])

  const selectHairRoot = useCallback((hairRoot: CollectedHairRoot | null) => {
    setState((prev) => ({ ...prev, selectedHairRoot: hairRoot }))
  }, [])

  const getCollectedById = useCallback(
    (id: number) => state.collection.find((h) => h.id === id),
    [state.collection]
  )

  const canEvolve = useCallback(
    (id: number): boolean => {
      const hairRoot = state.collection.find((h) => h.id === id)
      if (!hairRoot) return false
      const baseHairRoot = HAIR_ROOTS.find((h) => h.id === id)
      if (!baseHairRoot?.evolvesTo) return false
      return hairRoot.count >= EVOLUTION_COST
    },
    [state.collection]
  )

  const getBattleRank = useCallback(
    () => getRankFromPoints(state.battleRankPoints),
    [state.battleRankPoints]
  )

  const getRoyaleRank = useCallback(
    () => getRankFromPoints(state.royaleRankPoints),
    [state.royaleRankPoints]
  )

  const updateBattleRank = useCallback((won: boolean): number => {
    const currentRank = getRankFromPoints(state.battleRankPoints)
    const pointsChange = calculatePointsChange(won, currentRank)
    setState((prev) => ({
      ...prev,
      battleRankPoints: Math.max(0, prev.battleRankPoints + pointsChange),
    }))
    return pointsChange
  }, [state.battleRankPoints])

  const updateRoyaleRank = useCallback((placement: number): number => {
    const currentRank = getRankFromPoints(state.royaleRankPoints)
    const pointsChange = calculatePointsChange(placement <= 3, currentRank, placement)
    setState((prev) => ({
      ...prev,
      royaleRankPoints: Math.max(0, prev.royaleRankPoints + pointsChange),
    }))
    return pointsChange
  }, [state.royaleRankPoints])

  const getTeamRoyaleRank = useCallback(
    () => getRankFromPoints(state.teamRoyaleRankPoints),
    [state.teamRoyaleRankPoints]
  )

  const updateTeamRoyaleRank = useCallback((teamPlacement: number): number => {
    const currentRank = getRankFromPoints(state.teamRoyaleRankPoints)
    // Team placement 1-4 (4 teams)
    const pointsChange = calculatePointsChange(teamPlacement <= 2, currentRank, teamPlacement)
    setState((prev) => ({
      ...prev,
      teamRoyaleRankPoints: Math.max(0, prev.teamRoyaleRankPoints + pointsChange),
    }))
    return pointsChange
  }, [state.teamRoyaleRankPoints])

  const updateProfile = useCallback((name: string, title: string) => {
    setState((prev) => ({
      ...prev,
      playerName: name || prev.playerName,
      playerTitle: title || prev.playerTitle,
    }))
  }, [])

  const setBgmEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      bgmEnabled: enabled,
    }))
  }, [])

  const setBgmVolume = useCallback((volume: number) => {
    const nextVolume = Math.max(0, Math.min(1, volume))
    setState((prev) => ({
      ...prev,
      bgmVolume: nextVolume,
    }))
  }, [])

  const setBrightness = useCallback((brightness: number) => {
    const nextBrightness = Math.max(0.6, Math.min(1.4, brightness))
    setState((prev) => ({
      ...prev,
      brightness: nextBrightness,
    }))
  }, [])

  const defeatBossRaid = useCallback(() => {
    setState((prev) => {
      const existingCosmicHair = prev.collection.find((h) => h.id === BOSS_HAIR_ROOT.id)
      let newCollection = [...prev.collection]
      
      if (existingCosmicHair) {
        newCollection = newCollection.map((h) =>
          h.id === BOSS_HAIR_ROOT.id
            ? { ...h, count: h.count + 1 }
            : h
        )
      } else {
        const newHairRoot: CollectedHairRoot = {
          ...BOSS_HAIR_ROOT,
          level: 1,
          exp: 0,
          count: 1,
        }
        newCollection = [...newCollection, newHairRoot]
      }

      return {
        ...prev,
        coins: prev.coins + BOSS_RAID_CONFIG.defeatReward.coins,
        collection: newCollection,
      }
    })
  }, [])

  const evolveHairRoot = useCallback(
    (id: number): CollectedHairRoot | null => {
      const hairRoot = state.collection.find((h) => h.id === id)
      if (!hairRoot) return null
      const baseHairRoot = HAIR_ROOTS.find((h) => h.id === id)
      if (!baseHairRoot?.evolvesTo) return null
      if (hairRoot.count < EVOLUTION_COST) return null

      const evolvedBase = HAIR_ROOTS.find((h) => h.id === baseHairRoot.evolvesTo)
      if (!evolvedBase) return null

      let result: CollectedHairRoot | null = null

      setState((prev) => {
        const existingEvolved = prev.collection.find((h) => h.id === evolvedBase.id)
        let newCollection: CollectedHairRoot[]

        // Calculate evolution bonus based on source hair root's level and existing bonuses
        const sourceBonus = hairRoot.evolutionBonus || 0
        const sourceSkillBonus = hairRoot.skillBonus || 0
        // Each evolution adds +1 to bonuses (max 3)
        const newEvolutionBonus = Math.min(3, sourceBonus + 1)
        const newSkillBonus = Math.min(3, sourceSkillBonus + 1)

        if (existingEvolved) {
          newCollection = prev.collection.map((h) => {
            if (h.id === id) return { ...h, count: h.count - EVOLUTION_COST }
            if (h.id === evolvedBase.id) {
              // Keep the higher bonus between existing and new
              const updated = { 
                ...h, 
                count: h.count + 1,
                evolutionBonus: Math.max(h.evolutionBonus || 0, newEvolutionBonus),
                skillBonus: Math.max(h.skillBonus || 0, newSkillBonus),
              }
              result = updated
              return updated
            }
            return h
          })
        } else {
          const newHairRoot: CollectedHairRoot = {
            ...evolvedBase,
            level: 1,
            exp: 0,
            count: 1,
            evolutionBonus: newEvolutionBonus,
            skillBonus: newSkillBonus,
          }
          result = newHairRoot
          newCollection = [
            ...prev.collection.map((h) =>
              h.id === id ? { ...h, count: h.count - EVOLUTION_COST } : h
            ),
            newHairRoot,
          ]
        }

        return { ...prev, collection: newCollection }
      })

      return result
    },
    [state.collection]
  )

  const resetGameData = useCallback(() => {
    if (typeof window === "undefined") return
    
    if (confirm("すべてのデータをリセットしますか？この操作は取り消せません。")) {
      setState(INITIAL_GAME_STATE)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const exportGameData = useCallback((): string => {
    return JSON.stringify(state, null, 2)
  }, [state])

  const importGameData = useCallback((data: string): boolean => {
    try {
      const parsed = JSON.parse(data)
      // Validate that it has the required structure
      if (typeof parsed.coins !== "number" || !Array.isArray(parsed.collection)) {
        throw new Error("Invalid game data format")
      }
      
      setState({
        ...INITIAL_GAME_STATE,
        ...parsed,
      })
      return true
    } catch (error) {
      console.error("Failed to import game data:", error)
      alert("データのインポートに失敗しました。正しいフォーマットか確認してください。")
      return false
    }
  }, [])

  return (
    <GameContext.Provider
      value={{
        ...state,
        pullSingle,
        pullTen,
        addCoins,
        trainHairRoot,
        selectHairRoot,
        getCollectedById,
        evolveHairRoot,
        canEvolve,
        getBattleRank,
        getRoyaleRank,
        getTeamRoyaleRank,
        updateBattleRank,
        updateRoyaleRank,
        updateTeamRoyaleRank,
        updateProfile,
        setBgmEnabled,
        setBgmVolume,
        setBrightness,
        defeatBossRaid,
        resetGameData,
        exportGameData,
        importGameData,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
