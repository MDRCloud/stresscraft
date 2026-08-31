import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Users, Map, Activity } from "lucide-react"

interface MetricsGridProps {
  sessionCount: number
  activeSessions: number
  chunksLoaded: number
  joinRate: number
  running: boolean
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  sessionCount,
  activeSessions,
  chunksLoaded,
  joinRate,
  running,
}) => {
  const activePercent = sessionCount > 0 ? ((activeSessions / sessionCount) * 100).toFixed(1) : "0"
  const chunksPerBot = activeSessions > 0 ? (chunksLoaded / activeSessions).toFixed(1) : "0"

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Sessions Card */}
      <Card className="relative overflow-hidden border-border/60 hover:border-primary/40 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-cyan-500" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Bots Spawned
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {sessionCount.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {running ? "Connections initiated" : "Ready to launch"}
          </p>
        </CardContent>
      </Card>

      {/* Active In-Game Sessions */}
      <Card className="relative overflow-hidden border-border/60 hover:border-emerald-500/40 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active In-Game
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-400 font-mono">
              {activeSessions.toLocaleString()}
            </span>
            {sessionCount > 0 && (
              <span className="text-xs text-muted-foreground">({activePercent}%)</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Fully logged in & ticking
          </p>
        </CardContent>
      </Card>

      {/* Chunks Loaded */}
      <Card className="relative overflow-hidden border-border/60 hover:border-purple-500/40 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-400" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chunks Tracked
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Map className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-purple-400 font-mono">
              {chunksLoaded.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{chunksPerBot} chunks / active bot
          </p>
        </CardContent>
      </Card>

      {/* Join Rate /s */}
      <Card className="relative overflow-hidden border-border/60 hover:border-amber-500/40 group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Throughput
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-400 font-mono">
              {joinRate}
            </span>
            <span className="text-xs text-muted-foreground">conn/sec</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Current connection rate
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
