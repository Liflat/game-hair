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
      "単発ガチャ：50コイン（1体）",
      "10連ガチャ：500コイン（10体）",
      "排出率：N49.9%/R30%/SR14%/SSR5%/LR1%/CH0.1%",
      "レアリティが高いほどステータスが高めです",
      "同じ毛根を10体集めることで進化できます"
    ]
  },
  {
    id: "elements",
    title: "属性相性",
    icon: "⚡",
    description: "バトルの有利不利",
    details: [
      "🔥炎 → 🌪️風 → 💧水 → 🔥炎（三すくみ）",
      "有利な相性：ダメージ1.3倍、不利な相性：ダメージ0.7倍",
      "☀️光 ⇔ 🌙闇：お互いに有利（1.3倍）",
      "✨神 → 🔥炎/💧水/🌪️風に有利（1.3倍）",
      "☀️光/🌙闇 → ✨神に有利（1.3倍）",
      "属性相性は攻撃・防御の両方に影響します"
    ]
  },
  {
    id: "collection",
    title: "コレクション",
    icon: "📦",
    description: "毛根図鑑",
    details: [
      "獲得した毛根の一覧と進捗を確認できます",
      "詳細でステータス・スキル・所持数を確認できます",
      "選択した毛根が1vs1/バトロワ/チームバトロワで使用されます",
      "同じ毛根を10体集めると進化できます",
      "進化ボーナスでステータスとスキル威力が強化されます",
      "進化後も元の毛根は図鑑に残ります"
    ]
  },
  {
    id: "training",
    title: "育毛",
    icon: "💪",
    description: "毛根を育てよう",
    details: [
      "コインを使ってトレーニングしEXPを獲得します",
      "軽い:+20EXP/5コイン、通常:+50EXP/15コイン、ハード:+120EXP/40コイン",
      "一定のEXP量でレベルアップし、ステータスが上昇します",
      "レベルは最大10です",
      "バトルではEXPは増えません"
    ]
  },
  {
    id: "matchmaking",
    title: "1vs1対戦",
    icon: "⚔️",
    description: "バトルに挑戦",
    details: [
      "選択中の毛根で1vs1の引っ張り勝負をします",
      "絡み合いの後、10秒間のタップ勝負が始まります",
      "属性相性で引きの強さが変化します",
      "勝利+50/敗北+10/引き分け+20コイン",
      "勝敗でランクポイントが増減します"
    ]
  },
  {
    id: "battle-royale",
    title: "ソロバトロワ",
    icon: "👑",
    description: "8人で最強決定戦",
    details: [
      "あなた+NPC7体の8人バトロワです",
      "ターン制でスキルを選択して戦います",
      "状態異常やCTのあるスキルがあります",
      "脱落順で順位が決まります",
      "順位に応じてコイン報酬とランクポイントが変動します"
    ]
  },
  {
    id: "team-royale",
    title: "チームバトロワ",
    icon: "👥",
    description: "4チーム対抗戦",
    details: [
      "4チーム12人のチーム戦（1人+NPC2人が味方）",
      "ターン制でスキルを選択して戦います",
      "チームが全滅すると脱落します",
      "順位に応じてコイン報酬がもらえます",
      "上位2チームでランクポイントが変動します"
    ]
  },
  {
    id: "boss-raid",
    title: "魔王討伐",
    icon: "😈",
    description: "ヘアグランドに挑戦",
    details: [
      "5体のチームで超次元毛根魔王ヘアグランドと戦います",
      "通常攻撃・通常防御・スキルを使うターン制バトルです",
      "スキルにはCTがあり連発できません",
      "全員が倒れると敗北します",
      "勝利するとヘアグランドが仲間に入ります"
    ]
  },
  {
    id: "ranking",
    title: "ランキング",
    icon: "🏆",
    description: "順位を確認",
    details: [
      "あなたのスコアは所持毛根の合計ステータスから算出されます",
      "順位はスコアに基づいて表示されます",
      "上位プレイヤーの一覧はサンプル表示です",
      "毛根を集めて育毛するとスコアが上がります"
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
                  "elements": "collection",
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
              {selectedTutorial.id === "elements" ? "コレクションを開く" : `${selectedTutorial.title}を開く`}
            </Button>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
