import { useState, useEffect, useRef, useCallback } from "react"
import { TelemetryData, TelemetryHistoryPoint, LogEntry } from "@/types"

const HISTORY_LIMIT = 40

export function useTelemetrySocket(
  onLogMessage?: (entry: LogEntry) => void
) {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    running: false,
    sessionCount: 0,
    activeSessions: 0,
    chunksLoaded: 0,
  })

  const [history, setHistory] = useState<TelemetryHistoryPoint[]>([])
  const [joinRate, setJoinRate] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)

  const prevSessionCount = useRef<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      if (onLogMessage) {
        onLogMessage({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          level,
          message,
        })
      }
    },
    [onLogMessage]
  )

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/api/ws`

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          addLog("Telemetry WebSocket stream connected.", "info")
        }

        ws.onmessage = (event) => {
          try {
            const data: TelemetryData = JSON.parse(event.data)
            setTelemetry(data)

            const currentSessions = data.sessionCount || 0
            const rate = Math.max(0, currentSessions - prevSessionCount.current)
            prevSessionCount.current = currentSessions
            setJoinRate(rate)

            const now = new Date()
            const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
              .getMinutes()
              .toString()
              .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`

            setHistory((prev) => {
              const newPoint: TelemetryHistoryPoint = {
                time: timeLabel,
                sessionCount: data.sessionCount || 0,
                activeSessions: data.activeSessions || 0,
                chunksLoaded: data.chunksLoaded || 0,
                joinRate: rate,
              }
              const updated = [...prev, newPoint]
              return updated.length > HISTORY_LIMIT
                ? updated.slice(updated.length - HISTORY_LIMIT)
                : updated
            })
          } catch {
            // parse error
          }
        }

        ws.onclose = () => {
          setIsConnected(false)
          wsRef.current = null
          addLog("WebSocket disconnected. Retrying in 3s...", "warn")
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch (err) {
        reconnectTimeoutRef.current = setTimeout(connect, 4000)
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [addLog])

  return {
    telemetry,
    history,
    joinRate,
    isConnected,
  }
}
