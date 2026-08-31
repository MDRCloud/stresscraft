import React, { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Square, AlertTriangle, Sliders } from "lucide-react"
import { TestConfig } from "@/types"

interface ControlPanelProps {
  running: boolean
  onStart: (config: TestConfig, apiKey: string) => Promise<void>
  onStop: (apiKey: string) => Promise<void>
  isLoading: boolean
}

const PRESETS: Record<string, Partial<TestConfig>> = {
  light: { count: 25, delay: 100, buffer: 10, prefix: "Lite" },
  medium: { count: 150, delay: 30, buffer: 20, prefix: "Bot" },
  extreme: { count: 500, delay: 5, buffer: 50, prefix: "Doom" },
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  running,
  onStart,
  onStop,
  isLoading,
}) => {
  const [activePreset, setActivePreset] = useState<string>("medium")
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("stresscraft_api_key") || "")
  const [config, setConfig] = useState<TestConfig>({
    host: "host.docker.internal",
    port: 25565,
    count: 150,
    delay: 30,
    buffer: 20,
    prefix: "Bot",
    simulate: true,
  })

  const isLocalhost =
    config.host.trim().toLowerCase() === "localhost" ||
    config.host.trim() === "127.0.0.1"

  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey)
    if (PRESETS[presetKey]) {
      setConfig((prev) => ({
        ...prev,
        ...PRESETS[presetKey],
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("stresscraft_api_key", apiKey)
    onStart(config, apiKey)
  }

  const handleStopClick = () => {
    localStorage.setItem("stresscraft_api_key", apiKey)
    onStop(apiKey)
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Control Center & Presets
          </CardTitle>
          <Tabs value={activePreset} onValueChange={handlePresetSelect}>
            <TabsList className="h-7 bg-secondary/80">
              <TabsTrigger value="light" className="text-[11px] px-2.5 py-0.5">
                Light (25)
              </TabsTrigger>
              <TabsTrigger value="medium" className="text-[11px] px-2.5 py-0.5">
                Medium (150)
              </TabsTrigger>
              <TabsTrigger value="extreme" className="text-[11px] px-2.5 py-0.5">
                Extreme (500)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* API Key field */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="apiKey">Backend API Key (STRESSCRAFT_API_KEY)</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter secret API key"
                disabled={isLoading}
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>

            {/* Host field */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="host">Target Host</Label>
              <Input
                id="host"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="mc.server.net or host.docker.internal"
                disabled={running || isLoading}
                required
                className="bg-secondary/40 font-mono text-xs"
              />
              {isLocalhost && (
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mt-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Use <code className="font-mono bg-amber-500/20 px-1 rounded">host.docker.internal</code> if targeting Minecraft on this host machine.
                  </span>
                </div>
              )}
            </div>

            {/* Port */}
            <div className="space-y-1.5">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 25565 })}
                disabled={running || isLoading}
                required
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>

            {/* Count */}
            <div className="space-y-1.5">
              <Label htmlFor="count">Bot Target Count</Label>
              <Input
                id="count"
                type="number"
                value={config.count}
                onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) || 1 })}
                disabled={running || isLoading}
                required
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>

            {/* Join Delay */}
            <div className="space-y-1.5">
              <Label htmlFor="delay">Join Interval (ms)</Label>
              <Input
                id="delay"
                type="number"
                value={config.delay}
                onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) || 0 })}
                disabled={running || isLoading}
                required
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>

            {/* Buffer */}
            <div className="space-y-1.5">
              <Label htmlFor="buffer">Join Buffer</Label>
              <Input
                id="buffer"
                type="number"
                value={config.buffer}
                onChange={(e) => setConfig({ ...config, buffer: parseInt(e.target.value) || 1 })}
                disabled={running || isLoading}
                required
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>

            {/* Prefix */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prefix">Player Name Prefix</Label>
              <Input
                id="prefix"
                value={config.prefix}
                onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                disabled={running || isLoading}
                required
                className="bg-secondary/40 font-mono text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={running || isLoading}
              className="flex-1 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-semibold shadow-[0_0_20px_rgba(0,245,196,0.3)] hover:opacity-95"
            >
              <Play className="h-4 w-4 mr-2 fill-current" />
              Start Stress Test
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!running || isLoading}
              onClick={handleStopClick}
              className="px-6 font-semibold"
            >
              <Square className="h-4 w-4 mr-2 fill-current" />
              Stop Test
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
