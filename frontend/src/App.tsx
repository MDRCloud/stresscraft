import { useState, useCallback } from "react"
import { Header } from "@/components/dashboard/Header"
import { MetricsGrid } from "@/components/dashboard/MetricsGrid"
import { TelemetryCharts } from "@/components/dashboard/TelemetryCharts"
import { ControlPanel } from "@/components/dashboard/ControlPanel"
import { LiveConsole } from "@/components/dashboard/LiveConsole"
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket"
import { LogEntry, TestConfig } from "@/types"

export function App() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init-1",
      timestamp: new Date().toLocaleTimeString(),
      level: "info",
      message: "StressCraft React Web Dashboard initialized.",
    },
    {
      id: "init-2",
      timestamp: new Date().toLocaleTimeString(),
      level: "warn",
      message: "Ensure target Minecraft server has online-mode=false and connection-throttle=-1.",
    },
  ])

  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleNewLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const updated = [...prev, entry]
      return updated.length > 200 ? updated.slice(updated.length - 200) : updated
    })
  }, [])

  const { telemetry, history, joinRate, isConnected } = useTelemetrySocket(handleNewLog)

  const handleStart = async (config: TestConfig, apiKey: string) => {
    setIsLoading(true)
    handleNewLog({
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level: "info",
      message: `Dispatching start request -> ${config.host}:${config.port} (${config.count} bots)`,
    })

    try {
      const params = new URLSearchParams()
      params.append("host", config.host)
      params.append("port", config.port.toString())
      params.append("count", config.count.toString())
      params.append("delay", config.delay.toString())
      params.append("buffer", config.buffer.toString())
      params.append("prefix", config.prefix)

      const headers: Record<string, string> = {}
      if (apiKey.trim()) {
        headers["X-API-Key"] = apiKey.trim()
      }

      const res = await fetch("/api/start", {
        method: "POST",
        headers,
        body: params,
      })

      if (res.ok) {
        handleNewLog({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: "Engine started successfully. Bots entering join queue.",
        })
      } else {
        const errText = await res.text()
        handleNewLog({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          level: "error",
          message: `Failed to start engine: ${errText}`,
        })
      }
    } catch (err: any) {
      handleNewLog({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: "error",
        message: `Network error while starting test: ${err?.message || err}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async (apiKey: string) => {
    setIsLoading(true)
    handleNewLog({
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level: "warn",
      message: "Sending stop signal to engine...",
    })

    try {
      const headers: Record<string, string> = {}
      if (apiKey.trim()) {
        headers["X-API-Key"] = apiKey.trim()
      }

      const res = await fetch("/api/stop", {
        method: "POST",
        headers,
      })

      if (res.ok) {
        handleNewLog({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: "Engine halted. Active sessions disconnected.",
        })
      } else {
        const errText = await res.text()
        handleNewLog({
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          level: "error",
          message: `Stop failed: ${errText}`,
        })
      }
    } catch (err: any) {
      handleNewLog({
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: "error",
        message: `Network error while stopping: ${err?.message || err}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px]" />
      </div>

      <Header running={telemetry.running} isConnected={isConnected} />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metrics summary cards */}
        <MetricsGrid
          sessionCount={telemetry.sessionCount}
          activeSessions={telemetry.activeSessions}
          chunksLoaded={telemetry.chunksLoaded}
          joinRate={joinRate}
          running={telemetry.running}
        />

        {/* Charts Section */}
        <TelemetryCharts history={history} />

        {/* Control and Console Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ControlPanel
            running={telemetry.running}
            onStart={handleStart}
            onStop={handleStop}
            isLoading={isLoading}
          />
          <LiveConsole logs={logs} onClear={() => setLogs([])} />
        </div>
      </main>
    </div>
  )
}
export default App
