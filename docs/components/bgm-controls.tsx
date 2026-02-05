import { Volume2, VolumeX } from "lucide-react"
import { useBGM, type ScreenType } from "@/hooks/use-bgm"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface BGMControlsProps {
  currentScreen: ScreenType
  className?: string
}

export function BGMControls({ currentScreen, className }: BGMControlsProps) {
  const { isPlaying, toggleBGM, setVolume } = useBGM(currentScreen)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleBGM}
        title={isPlaying ? "BGM OFF" : "BGM ON"}
      >
        {isPlaying ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4" />
        )}
      </Button>
      <Slider
        defaultValue={[0.3]}
        min={0}
        max={1}
        step={0.05}
        className="w-24"
        onValueChange={(value) => setVolume(value[0])}
      />
    </div>
  )
}
