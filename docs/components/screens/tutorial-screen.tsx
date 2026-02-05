"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight } from "lucide-react"

interface TutorialScreenProps {
  onNavigate: (screen: Screen) => void
}

const tutorials = [
  {
    id: "gacha",
    title: "ガチャ",
    icon: "🎰",
    description: "毛根を引き抜こう",
    details: [
      "コインを消費して毛根を入手できます",
      "シングルガチャ：100コイン（1体）",
      "10連ガチャ：900コイン（10体＋1ボーナス）",
      "レアリティが高いほど強い毛根が手に入ります",
      "同じ毛根を10体集めることで進化できます"
    ]
  },
  {
    id: "collection",
    title: "コレクション",
    icon: "📦",
    description: "毛根図鑑",
    details: [
      "獲得した毛根を管理・編成できます",
      "毛根の詳細ステータス（力・速・握）が確認できます",
      "複数同じ毛根を所有している場合、一覧で表示されます",
      "8毛根のチームを自由に組める",
      "各戦闘モードにあわせて最適なチームを作成しましょう"
    ]
  },
  {
    id: "training",
    title: "育成",
    icon: "💪",
    description: "毛根を育てよう",
    details: [
      "毛根を戦闘で使用するとEXPを獲得します",
      "一定のEXP量でレベルアップし、ステータスが上昇します",
      "高レベルの毛根ほど戦闘で有利になります",
      "同じ毛根を10体集めるとレアリティがアップします",
      "進化するとステータスが大幅に上昇します"
    ]
  },
  {
    id: "matchmaking",
    title: "1vs1対戦",
    icon: "⚔️",
    description: "バトルに挑戦",
    details: [
      "1体の毛根を選んで1対1のバトルに挑戦します",
      "ターンベースで、攻撃・防御・スキルを駆使します",
      "勝利すると対戦ポイントが増加します",
      "対戦ポイントでランクが上がります",
      "ランクに応じて報酬が変わります"
    ]
  },
  {
    id: "battle-royale",
    title: "ソロバトロワ",
    icon: "👑",
    description: "8人で最強決定戦",
    details: [
      "1体の毛根で8人のプレイヤーと戦う生き残り戦です",
      "倒した敵の数に応じてポイントを獲得します",
      "上位入賞するほど多くのポイントを獲得できます",
      "毎月のランキングでランクが変わります",
      "ランクが上がると対局の難易度が上がります"
    ]
  },
  {
    id: "team-royale",
    title: "チームバトロワ",
    icon: "👥",
    description: "4チーム対抗戦",
    details: [
      "8体のチームで4つのチーム同士が激突します",
      "味方と敵が協力・対抗する複雑な戦闘になります",
      "同期型ターン制でテンポよく進行します",
      "チーム全体の力が試されます",
      "チーム編成の工夫が勝敗を大きく左右します"
    ]
  },
  {
    id: "boss-raid",
    title: "魔王討伐",
    icon: "😈",
    description: "ヘアグランドに挑戦",
    details: [
      "5体のチームで超次元毛根魔王ヘアグランドと戦います",
      "通常スキル、防御、必殺スキルを駆使します",
      "ボスは非常に強力な攻撃を繰り出してきます",
      "見事ボスを倒すと、ヘアグランドを仲間にできます",
      "ヘアグランドはボス戦限定の最強毛根です"
    ]
  },
  {
    id: "ranking",
    title: "ランキング",
    icon: "🏆",
    description: "順位を確認",
    details: [
      "全プレイヤーの順位を確認できます",
      "1vs1対戦、ソロバトロワ、チームバトロワのランキング",
      "各モードで独立した順位システムがあります",
      "上位ランカーには特別なタイトルが付与されます",
      "毎月1日にランキングはリセットされます"
    ]
  }
]

export function TutorialScreen({ onNavigate }: TutorialScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const selectedTutorial = tutorials.find(t => t.id === selectedCategory)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-border bg-card sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => selectedCategory ? setSelectedCategory(null) : onNavigate("home")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">チュートリアル</h1>
      </header>

      <div className="p-4 pb-24">
        {!selectedCategory ? (
          // Category List
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-muted-foreground mb-4">各機能の説明を選択してください</p>
            {tutorials.map((tutorial, index) => (
              <motion.button
                key={tutorial.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCategory(tutorial.id)}
                className="w-full bg-card border border-border rounded-xl p-4 text-left hover:bg-muted/50 transition-colors active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{tutorial.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{tutorial.title}</h3>
                    <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : selectedTutorial ? (
          // Detail View
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">{selectedTutorial.icon}</div>
              <div>
                <h2 className="text-3xl font-bold">{selectedTutorial.title}</h2>
                <p className="text-muted-foreground">{selectedTutorial.description}</p>
              </div>
            </div>

            {/* Details */}
            <div className="bg-card rounded-xl p-6 border border-border space-y-4">
              {selectedTutorial.details.map((detail, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-foreground leading-relaxed">{detail}</p>
                </motion.div>
              ))}
            </div>

            {/* Action Button */}
            <Button
              onClick={() => {
                const screenMap: Record<string, Screen> = {
                  "gacha": "gacha",
                  "collection": "collection",
                  "training": "training",
                  "matchmaking": "matchmaking",
                  "battle-royale": "battle-royale",
                  "team-royale": "team-royale",
                  "boss-raid": "boss-raid",
                  "ranking": "ranking"
                }
                const screen = screenMap[selectedTutorial.id]
                if (screen) onNavigate(screen)
              }}
              className="w-full h-12"
            >
              {selectedTutorial.title}を開く
            </Button>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
