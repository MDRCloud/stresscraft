# StressCraft (work in progress)

[![License](https://img.shields.io/github/license/Cubxity/stresscraft?style=flat-square)](COPYING)
[![Discord](https://img.shields.io/badge/join-discord-blue?style=flat-square)](https://discord.gg/vxecYcWXyf)

State-of-the-art Minecraft stress testing software written in Kotlin.

## Disclaimer

StressCraft should **ONLY** be used in your own server environment. We do not endorse the use of StressCraft for any other purposes than testing your own infrastructure.

Please be aware that attempting to execute this with an external server as a target can be seen as **illegal** as it simulates a layer 7 DoS (denial-of-service) attack, which is against the law in most countries.

## How to use?

> **NOTE:** DO NOT DO THIS IN PRODUCTION, EVER.

- Ensure `max-players` (server.properties) is high enough for the number of bots you're planning to test
- Set `online-mode` (server.properties) to `false`
- Set `network-compression-threshold` (server.properties) to `-1`
- Set `connection-throttle` (bukkit.yml) to `-1`
- Increase `max-joins-per-tick` (paper.yml) to your liking

If you're on Velocity, you may also need to set `login-ratelimit` (velocity.toml) to `0`

## Docker Compose Stack

This repository ships a full **two-container Docker Compose stack**:

| Container | Role | Image |
|---|---|---|
| `stresscraft-backend` | Ktor/JVM REST + WebSocket API | built from `Dockerfile` |
| `stresscraft-frontend` | Nginx static UI + reverse proxy | `nginx:1.27-alpine` |

### Start the stack

```bash
docker compose up --build
```

The web dashboard will be available at **[http://localhost:8282](http://localhost:8282)**.

### Run in the background

```bash
docker compose up -d --build
```

### Stop the stack

```bash
docker compose down
```

### Architecture

```
Browser → :8282 Nginx → /api/* → :8080 Ktor backend → Minecraft server
                       /api/ws  →  WebSocket telemetry stream
                       /        →  Static dashboard assets
```

## Web Dashboard

The dashboard provides:

- **Live metrics** — total bots, active sessions, chunks loaded, join rate/s
- **Real-time charts** — 60-second rolling session load and chunk pressure graphs
- **Control panel** — configure host, port, bot count, join delay, buffer, prefix, and simulation mode
- **Presets** — Light / Medium / Extreme one-click load profiles
- **Event log** — live terminal view of test lifecycle events
- **Toast notifications** — contextual start/stop feedback

## Who needs this?

- Michael
- "Cloud-native Minecraft" enthusiasts
- Reliability engineers

## Roadmap

*(in no particular order)*

- [x] Performant stresser
- [ ] Chat flooder
- [ ] Scripting?
- [ ] Physics simulation
- [ ] Random movements
- [ ] Non-TTY support
- [ ] Velocity forwarding?
- [x] Dockerfile
- [x] Docker Compose stack
- [x] Web dashboard (glassmorphic dark UI, real-time WebSocket telemetry)
- [ ] Helm chart?
- [ ] Prometheus exporter?
