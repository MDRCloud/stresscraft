import React, { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Terminal, Trash2, Pause, Play } from "lucide-react"
import { LogEntry } from "@/types"

interface LiveConsoleProps {
  logs: LogEntry[]
  onClear: () => void
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({ logs, onClear }) => {
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isPaused])

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "text-rose-400"
      case "warn":
        return "text-amber-400"
      case "info":
        return "text-primary"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <Card className="border-border/60 flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            Live Event Stream
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              {isPaused ? (
                <>
                  <Play className="h-3 w-3 mr-1" /> Resume
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3 mr-1" /> Pause
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        <div className="h-[340px] w-full rounded-lg bg-black/70 border border-border/80 p-3 font-mono text-xs overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground/50 italic p-2">
              Awaiting session events and telemetry updates...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-muted-foreground/40 select-none">
                  [{log.timestamp}]
                </span>
                <span className={`font-medium ${getLevelColor(log.level)}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-foreground/90 break-all">{log.message}</span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </CardContent>
    </Card>
  )
}
