import { useEffect, useRef, useCallback, useState } from "react"

export type ScreenType = 
  | "splash"
  | "home"
  | "gacha"
  | "collection"
  | "ranking"
  | "training"
  | "matchmaking"
  | "battle"
  | "battle-royale"
  | "team-royale"
  | "profile"

// BGMファイルのマッピング
const BGM_MAP: Record<ScreenType, string> = {
  splash: "/bgm/splash.mp3",
  home: "/bgm/home.mp3",
  gacha: "/bgm/gacha.mp3",
  collection: "/bgm/collection.mp3",
  ranking: "/bgm/ranking.mp3",
  training: "/bgm/training.mp3",
  matchmaking: "/bgm/matchmaking.mp3",
  battle: "/bgm/battle.mp3",
  "battle-royale": "/bgm/battle-royale.mp3",
  "team-royale": "/bgm/team-royale.mp3",
  profile: "/bgm/profile.mp3",
}

export interface UseBGMOptions {
  enabled?: boolean
  volume?: number
}

export function useBGM(screen: ScreenType, options: UseBGMOptions = {}) {
  const { enabled = true, volume = 0.3 } = options
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentBGMPath = BGM_MAP[screen]

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio()
      audio.loop = true
      audio.volume = volume
      audioRef.current = audio
    } else {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Change BGM when screen changes
  useEffect(() => {
    if (!enabled || !audioRef.current) return

    // Stop current BGM
    audioRef.current.pause()
    audioRef.current.currentTime = 0

    // Start new BGM
    audioRef.current.src = currentBGMPath
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
      })
      .catch((error) => {
        console.error("Failed to play BGM:", error)
        setIsPlaying(false)
      })

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [currentBGMPath, enabled])

  const toggleBGM = useCallback(() => {
    if (!audioRef.current) return

    if (audioRef.current.paused) {
      audioRef.current.play().catch((error) => {
        console.error("Failed to play BGM:", error)
      })
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume))
    }
  }, [])

  return {
    isPlaying,
    toggleBGM,
    setVolume,
  }
}
