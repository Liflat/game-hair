"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(onComplete, 500)
          return 100
        }
        return prev + 2
      })
    }, 50)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ opacity: 0, y: -50 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [0, 800],
            }}
            transition={{
              duration: 3,
              delay: i * 0.2,
              repeat: Number.POSITIVE_INFINITY,
            }}
            style={{
              left: `${(i * 5) % 100}%`,
            }}
          >
            {"~"}
          </motion.div>
        ))}
      </div>

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 1 }}
        className="relative mb-8"
      >
        <div className="w-40 h-40 bg-card rounded-full flex items-center justify-center border-4 border-primary shadow-2xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-2 border-2 border-dashed border-secondary rounded-full"
          />
          <div className="text-6xl">
            <svg viewBox="0 0 100 100" className="w-24 h-24">
              <motion.path
                d="M50 85 Q50 50 50 25 Q40 15 50 10 Q60 15 50 25"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-primary"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              <motion.circle
                cx="50"
                cy="88"
                r="8"
                className="fill-secondary"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5 }}
              />
              <motion.path
                d="M42 88 Q35 92 30 88 M58 88 Q65 92 70 88"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-secondary"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 2 }}
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-2 text-center"
      >
        毛根伝説
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-muted-foreground text-lg mb-12"
      >
        〜抜いて育てて絡めて戦え〜
      </motion.p>

      {/* Loading bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 1 }}
        className="w-64 h-3 bg-muted rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-muted-foreground text-sm mt-4"
      >
        {progress < 100 ? "毛根を準備中..." : "タップしてスタート"}
      </motion.p>

      {/* Tap to start overlay */}
      <AnimatePresence>
        {progress >= 100 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onComplete}
            className="absolute inset-0 cursor-pointer"
            aria-label="ゲームを開始"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
