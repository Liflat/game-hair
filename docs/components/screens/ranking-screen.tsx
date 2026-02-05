"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { RARITY_COLORS, calculateStats } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Medal, Award, Crown } from "lucide-react"

interface RankingScreenProps {
  onNavigate: (screen: Screen) => void
}

// Mock ranking data
const mockPlayers = [
  { id: 1, name: "毛根マスター", score: 15420, wins: 142, hairRootName: "神の毛根", emoji: "👑" },
  { id: 2, name: "脱毛王", score: 14230, wins: 128, hairRootName: "ブラックホール毛根", emoji: "🕳️" },
  { id: 3, name: "根っこハンター", score: 12890, wins: 115, hairRootName: "鳳凰毛根", emoji: "🦅" },
  { id: 4, name: "毛根コレクター", score: 11560, wins: 98, hairRootName: "ネビュラ毛根", emoji: "🌌" },
  { id: 5, name: "引き抜きの達人", score: 10340, wins: 87, hairRootName: "ドラゴン毛根", emoji: "🐉" },
  { id: 6, name: "毛穴探検家", score: 9870, wins: 82, hairRootName: "金の毛根", emoji: "🥇" },
  { id: 7, name: "育毛剤", score: 8920, wins: 76, hairRootName: "クリスタル毛根", emoji: "💎" },
  { id: 8, name: "フサフサ職人", score: 8450, wins: 71, hairRootName: "深海毛根", emoji: "🐙" },
  { id: 9, name: "毛根バトラー", score: 7890, wins: 65, hairRootName: "メタル毛根", emoji: "🔩" },
  { id: 10, name: "ヘアルート侍", score: 7340, wins: 58, hairRootName: "レインボー毛根", emoji: "🌈" },
]

export function RankingScreen({ onNavigate }: RankingScreenProps) {
  const { collection, selectedHairRoot } = useGame()

  const myScore = useMemo(() => {
    const totalPower = collection.reduce((sum, h) => {
      const stats = calculateStats(h)
      return sum + stats.power + stats.speed + stats.grip
    }, 0)
    return totalPower * 10
  }, [collection])

  const myRank = useMemo(() => {
    const position = mockPlayers.filter((p) => p.score > myScore).length + 1
    return position
  }, [myScore])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{rank}</span>
    }
  }

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500"
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400"
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600"
      default:
        return "bg-card border-border"
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">ランキング</h1>
        <Trophy className="w-6 h-6 text-secondary" />
      </header>

      {/* My Rank Card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="m-4 p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl border border-primary"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center">
            {selectedHairRoot ? (
              <span className="text-3xl">{selectedHairRoot.emoji}</span>
            ) : (
              <span className="text-2xl text-muted-foreground">?</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">あなたの順位</p>
            <p className="text-3xl font-bold text-foreground">
              {myRank > 100 ? "100+" : myRank}位
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">スコア</p>
            <p className="text-xl font-bold text-secondary">{myScore.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Top 3 Podium */}
      <div className="px-4 mb-6">
        <div className="flex items-end justify-center gap-2 h-48">
          {/* 2nd Place */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-400/20 border-2 border-gray-400 flex items-center justify-center text-2xl">
              {mockPlayers[1].emoji}
            </div>
            <p className="text-xs text-muted-foreground truncate">{mockPlayers[1].name}</p>
            <div className="h-24 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">2</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-28 text-center"
          >
            <Crown className="w-8 h-8 mx-auto text-yellow-400 mb-1" />
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center text-3xl">
              {mockPlayers[0].emoji}
            </div>
            <p className="text-sm text-foreground font-medium truncate">{mockPlayers[0].name}</p>
            <div className="h-32 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-white font-bold text-3xl">1</span>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-24 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-amber-600/20 border-2 border-amber-600 flex items-center justify-center text-2xl">
              {mockPlayers[2].emoji}
            </div>
            <p className="text-xs text-muted-foreground truncate">{mockPlayers[2].name}</p>
            <div className="h-20 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">3</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Ranking List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">全体ランキング</h2>
        <div className="space-y-2">
          {mockPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg(index + 1)}`}
            >
              {getRankIcon(index + 1)}
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                {player.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.hairRootName}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{player.score.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{player.wins}勝</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
