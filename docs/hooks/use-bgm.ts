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
  | "boss-raid"
  | "tutorial"
  | "profile"

// BGMファイルのマッピング
const BGM_MAP: Record<ScreenType, string> = {
  splash: "/game-hair/bgm/splash.mp3",
  home: "/game-hair/bgm/home.mp3",
  gacha: "/game-hair/bgm/gacha.mp3",
  collection: "/game-hair/bgm/collection.mp3",
  ranking: "/game-hair/bgm/ranking.mp3",
  training: "/game-hair/bgm/training.mp3",
  matchmaking: "/game-hair/bgm/matchmaking.mp3",
  battle: "/game-hair/bgm/battle.mp3",
  "battle-royale": "/game-hair/bgm/battle.mp3",
  "team-royale": "/game-hair/bgm/team-royale.mp3",
  "boss-raid": "/game-hair/bgm/battle.mp3",
  tutorial: "/game-hair/bgm/home.mp3",
  profile: "/game-hair/bgm/home.mp3",
}

export interface UseBGMOptions {
  enabled?: boolean
  volume?: number
}

export function useBGM(screen: ScreenType, options: UseBGMOptions = {}) {
  const { enabled = true, volume = 0.3 } = options
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const currentBGMPath = BGM_MAP[screen]
  const resolvedBGMPath = currentBGMPath || "/game-hair/bgm/home.mp3"

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

  // Unlock autoplay after first user interaction
  useEffect(() => {
    if (!enabled || isUnlocked) return

    const handleUnlock = () => {
      if (!audioRef.current) return

      audioRef.current.src = resolvedBGMPath
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          setIsUnlocked(true)
          window.removeEventListener("pointerdown", handleUnlock)
          window.removeEventListener("keydown", handleUnlock)
        })
        .catch(() => {
          setIsPlaying(false)
        })
    }

    window.addEventListener("pointerdown", handleUnlock)
    window.addEventListener("keydown", handleUnlock)

    return () => {
      window.removeEventListener("pointerdown", handleUnlock)
      window.removeEventListener("keydown", handleUnlock)
    }
  }, [resolvedBGMPath, enabled, isUnlocked])

  // Change BGM when screen changes
  useEffect(() => {
    if (!enabled || !audioRef.current || !isUnlocked) return

    // Stop current BGM
    audioRef.current.pause()
    audioRef.current.currentTime = 0

    // Start new BGM
    audioRef.current.src = resolvedBGMPath
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
  }, [resolvedBGMPath, enabled, isUnlocked])

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
