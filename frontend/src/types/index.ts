export interface TelemetryData {
  running: boolean
  sessionCount: number
  activeSessions: number
  chunksLoaded: number
  ts?: number
}

export interface TelemetryHistoryPoint {
  time: string
  sessionCount: number
  activeSessions: number
  chunksLoaded: number
  joinRate: number
}

export interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
}

export interface TestConfig {
  host: string
  port: number
  count: number
  delay: number
  buffer: number
  prefix: string
  simulate: boolean
}
