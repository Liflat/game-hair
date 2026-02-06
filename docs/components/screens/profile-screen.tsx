"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useGame } from "@/lib/game-context"
import { getRankColor } from "@/lib/game-data"
import type { Screen } from "@/lib/screens"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, User, Trophy, Swords, Crown, Users, Check, Edit2, Volume2, Sun, Download, Upload, Trash2 } from "lucide-react"

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void
}

const TITLES = [
  "駆け出し育毛士",
  "毛根マスター",
  "頭皮の守護者",
  "抜毛の達人",
  "伝説の毛根使い",
  "不毛の覇者",
  "毛根コレクター",
  "バトルヘアー",
  "神の毛根",
]

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const { 
    playerName, 
    playerTitle, 
    updateProfile, 
    collection, 
    coins,
    bgmEnabled,
    bgmVolume,
    brightness,
    setBgmEnabled,
    setBgmVolume,
    setBrightness,
    getBattleRank,
    getRoyaleRank,
    getTeamRoyaleRank,
    resetGameData,
    exportGameData,
    importGameData,
  } = useGame()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(playerName)
  const [editTitle, setEditTitle] = useState(playerTitle)
  
  const battleRank = getBattleRank()
  const royaleRank = getRoyaleRank()
  const teamRoyaleRank = getTeamRoyaleRank()

  const handleSave = () => {
    if (editName.trim()) {
      updateProfile(editName.trim(), editTitle)
      setIsEditing(false)
    }
  }

  const handleExport = () => {
    const data = exportGameData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `game-hair-save-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        const data = event.target?.result as string
        if (importGameData(data)) {
          alert("データをインポートしました！")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("home")}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">プロフィール</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          {isEditing ? <Check className="w-6 h-6" /> : <Edit2 className="w-6 h-6" />}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold mb-2"
                  placeholder="名前を入力"
                  maxLength={12}
                />
              ) : (
                <h2 className="text-xl font-bold text-foreground">{playerName}</h2>
              )}
              <p className="text-sm text-muted-foreground">{playerTitle}</p>
            </div>
          </div>

          {/* Title Selection */}
          {isEditing && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-3">称号を選択</h3>
              <div className="flex flex-wrap gap-2">
                {TITLES.map((title) => (
                  <Button
                    key={title}
                    variant={editTitle === title ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditTitle(title)}
                    className={editTitle !== title ? "bg-transparent" : ""}
                  >
                    {title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{collection.length}</p>
              <p className="text-xs text-muted-foreground">コレクション数</p>
            </div>
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-secondary">{coins}</p>
              <p className="text-xs text-muted-foreground">所持コイン</p>
            </div>
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h3 className="text-lg font-bold text-foreground mb-4">設定</h3>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">BGM</span>
              </div>
              <Switch checked={bgmEnabled} onCheckedChange={setBgmEnabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">音量</span>
                <span className="text-foreground">{Math.round(bgmVolume * 100)}%</span>
              </div>
              <Slider
                value={[bgmVolume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(value) => setBgmVolume(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  明るさ
                </span>
                <span className="text-foreground">{Math.round(brightness * 100)}%</span>
              </div>
              <Slider
                value={[brightness]}
                min={0.6}
                max={1.4}
                step={0.05}
                onValueChange={(value) => setBrightness(value[0])}
              />
            </div>
          </div>
        </motion.div>

        {/* Rank Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            ランク情報
          </h3>
          
          <div className="space-y-4">
            {/* Battle Rank */}
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">1vs1 対戦</span>
                </div>
                <span 
                  className="font-bold text-lg"
                  style={{ color: getRankColor(battleRank.tier) }}
                >
                  {battleRank.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${(battleRank.points % 100)}%`,
                      backgroundColor: getRankColor(battleRank.tier)
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {battleRank.points} RP
                </span>
              </div>
            </div>

            {/* Royale Rank */}
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-secondary" />
                  <span className="font-medium text-foreground">ソロバトロワ</span>
                </div>
                <span 
                  className="font-bold text-lg"
                  style={{ color: getRankColor(royaleRank.tier) }}
                >
                  {royaleRank.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${(royaleRank.points % 100)}%`,
                      backgroundColor: getRankColor(royaleRank.tier)
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {royaleRank.points} RP
                </span>
              </div>
            </div>

            {/* Team Royale Rank */}
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  <span className="font-medium text-foreground">チームバトロワ</span>
                </div>
                <span 
                  className="font-bold text-lg"
                  style={{ color: getRankColor(teamRoyaleRank.tier) }}
                >
                  {teamRoyaleRank.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${(teamRoyaleRank.points % 100)}%`,
                      backgroundColor: getRankColor(teamRoyaleRank.tier)
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {teamRoyaleRank.points} RP
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Collection Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h3 className="text-lg font-bold text-foreground mb-4">コレクション統計</h3>
          
          <div className="space-y-3">
            {[
              { name: "コモン", color: "#9CA3AF", count: collection.filter(h => h.rarity === "common").length },
              { name: "アンコモン", color: "#10B981", count: collection.filter(h => h.rarity === "uncommon").length },
              { name: "レア", color: "#3B82F6", count: collection.filter(h => h.rarity === "rare").length },
              { name: "エピック", color: "#8B5CF6", count: collection.filter(h => h.rarity === "epic").length },
              { name: "レジェンド", color: "#F59E0B", count: collection.filter(h => h.rarity === "legendary").length },
              { name: "コズミック", color: "#FF1493", count: collection.filter(h => h.rarity === "cosmic").length },
            ].map((rarity) => (
              <div key={rarity.name} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: rarity.color }}
                />
                <span className="text-sm text-muted-foreground flex-1">{rarity.name}</span>
                <span className="text-sm font-medium text-foreground">{rarity.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h3 className="text-lg font-bold text-foreground mb-4">データ管理</h3>
          
          <div className="space-y-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Download className="w-4 h-4" />
              データをエクスポート
            </Button>
            
            <Button
              onClick={handleImport}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Upload className="w-4 h-4" />
              データをインポート
            </Button>
            
            <Button
              onClick={resetGameData}
              variant="destructive"
              className="w-full justify-start gap-2"
            >
              <Trash2 className="w-4 h-4" />
              データをリセット
            </Button>
            
            <p className="text-xs text-muted-foreground mt-2">
              ※ データは自動的にブラウザに保存されます。<br />
              エクスポートで他の端末にデータを移行できます。
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
