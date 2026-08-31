import React from "react"
import { Badge } from "@/components/ui/badge"
import { Zap, Wifi, WifiOff } from "lucide-react"

interface HeaderProps {
  running: boolean
  isConnected: boolean
}

export const Header: React.FC<HeaderProps> = ({ running, isConnected }) => {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-[0_0_20px_rgba(0,245,196,0.2)]">
          <Zap className="h-5 w-5 fill-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              StressCraft
            </h1>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary font-mono">
              v0.1.0-react
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Minecraft Stress Testing & Telemetry Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* WebSocket Stream Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs">
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">WS Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-rose-400 font-medium">Reconnecting</span>
            </>
          )}
        </div>

        {/* Engine Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs font-medium">
          <span
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              running
                ? "bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"
                : "bg-muted-foreground/40"
            }`}
          />
          <span className={running ? "text-foreground font-semibold" : "text-muted-foreground"}>
            {running ? "ENGINE ACTIVE" : "ENGINE IDLE"}
          </span>
        </div>
      </div>
    </header>
  )
}
