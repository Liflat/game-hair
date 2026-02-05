"use client"

import { useState, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import { GameProvider } from "@/lib/game-context"
import type { Screen } from "@/lib/screens"
import type { HairRoot } from "@/lib/game-data"
import { SplashScreen } from "@/components/screens/splash-screen"
import { HomeScreen } from "@/components/screens/home-screen"
import { GachaScreen } from "@/components/screens/gacha-screen"
import { CollectionScreen } from "@/components/screens/collection-screen"
import { RankingScreen } from "@/components/screens/ranking-screen"
import { TrainingScreen } from "@/components/screens/training-screen"
import { MatchmakingScreen } from "@/components/screens/matchmaking-screen"
import { BattleScreen } from "@/components/screens/battle-screen"
import { BattleRoyaleScreen } from "@/components/screens/battle-royale-screen"
import { TeamRoyaleScreen } from "@/components/screens/team-royale-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"

function GameApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash")
  const [battleOpponent, setBattleOpponent] = useState<{ name: string; hairRoot: HairRoot } | null>(null)

  const handleNavigate = useCallback((screen: Screen) => {
    setCurrentScreen(screen)
  }, [])

  const handleBattleStart = useCallback((opponent: { name: string; hairRoot: HairRoot }) => {
    setBattleOpponent(opponent)
    setCurrentScreen("battle")
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {currentScreen === "splash" && (
          <SplashScreen key="splash" onComplete={() => handleNavigate("home")} />
        )}
        {currentScreen === "home" && (
          <HomeScreen key="home" onNavigate={handleNavigate} />
        )}
        {currentScreen === "gacha" && (
          <GachaScreen key="gacha" onNavigate={handleNavigate} />
        )}
        {currentScreen === "collection" && (
          <CollectionScreen key="collection" onNavigate={handleNavigate} />
        )}
        {currentScreen === "ranking" && (
          <RankingScreen key="ranking" onNavigate={handleNavigate} />
        )}
        {currentScreen === "training" && (
          <TrainingScreen key="training" onNavigate={handleNavigate} />
        )}
        {currentScreen === "matchmaking" && (
          <MatchmakingScreen
            key="matchmaking"
            onNavigate={handleNavigate}
            onBattleStart={handleBattleStart}
          />
        )}
        {currentScreen === "battle" && (
          <BattleScreen
            key="battle"
            onNavigate={handleNavigate}
            opponent={battleOpponent}
          />
        )}
        {currentScreen === "battle-royale" && (
          <BattleRoyaleScreen key="battle-royale" onNavigate={handleNavigate} />
        )}
        {currentScreen === "team-royale" && (
          <TeamRoyaleScreen key="team-royale" onNavigate={handleNavigate} />
        )}
        {currentScreen === "profile" && (
          <ProfileScreen key="profile" onNavigate={handleNavigate} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Page() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  )
}
