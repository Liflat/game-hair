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
  splash: "/bgm/splash.mp3",
  home: "/bgm/home.mp3",
  gacha: "/bgm/gacha.mp3",
  collection: "/bgm/collection.mp3",
  ranking: "/bgm/ranking.mp3",
  training: "/bgm/training.mp3",
  matchmaking: "/bgm/matchmaking.mp3",
  battle: "/bgm/battle.mp3",
  "battle-royale": "/bgm/battle.mp3",
  "team-royale": "/bgm/team-royale.mp3",
  "boss-raid": "/bgm/battle.mp3",
  tutorial: "/bgm/home.mp3",
  profile: "/bgm/home.mp3",
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
  const resolvedBGMPath = currentBGMPath || "/bgm/home.mp3"

  console.log("[BGM] Hook called - Screen:", screen, "Path:", resolvedBGMPath, "Enabled:", enabled, "Volume:", volume)

  // Initialize audio element
  useEffect(() => {
    console.log("[BGM] Initializing audio element for screen:", screen, "enabled:", enabled)
    if (!audioRef.current) {
      const audio = new Audio()
      audio.loop = true
      audio.volume = volume
      audioRef.current = audio
      console.log("[BGM] Audio element created with volume:", volume)
    } else {
      audioRef.current.volume = volume
      console.log("[BGM] Audio volume updated to:", volume)
    }
  }, [volume, screen, enabled])

  // Unlock autoplay after first user interaction
  useEffect(() => {
    if (!enabled || isUnlocked) return

    const handleUnlock = () => {
      if (!audioRef.current) return

      console.log("[BGM] Unlocking autoplay with:", resolvedBGMPath)
      audioRef.current.src = resolvedBGMPath
      audioRef.current
        .play()
        .then(() => {
          console.log("[BGM] Autoplay unlocked successfully")
          setIsPlaying(true)
          setIsUnlocked(true)
          window.removeEventListener("pointerdown", handleUnlock)
          window.removeEventListener("keydown", handleUnlock)
        })
        .catch((error) => {
          console.error("[BGM] Failed to unlock autoplay:", error)
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
    if (!enabled || !audioRef.current || !isUnlocked) {
      console.log("[BGM] Skipping BGM change - enabled:", enabled, "hasAudio:", !!audioRef.current, "isUnlocked:", isUnlocked)
      return
    }

    console.log("[BGM] Changing BGM to:", resolvedBGMPath)

    // Stop current BGM
    audioRef.current.pause()
    audioRef.current.currentTime = 0

    // Start new BGM
    audioRef.current.src = resolvedBGMPath
    audioRef.current
      .play()
      .then(() => {
        console.log("[BGM] BGM playing successfully:", resolvedBGMPath)
        setIsPlaying(true)
      })
      .catch((error) => {
        console.error("[BGM] Failed to play BGM:", error, "Path:", resolvedBGMPath)
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
