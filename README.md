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

### Configure the API key

The backend requires an API key to start/stop stress tests. Create a `.env` file
next to `docker-compose.yml`:

```bash
echo "STRESSCRAFT_API_KEY=$(openssl rand -hex 24)" > .env
```

Paste the same value into the dashboard's "API key" field when you open it — it's
saved in your browser's local storage.

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

### Testing against a local server

Don't point StressCraft at a server you don't own. To sanity-check that
StressCraft itself works before using it against your real server, the stack
includes an optional local Paper server, disabled by default via a Compose
profile:

```bash
docker compose --profile test-server up -d --build
```

Wait for it to come up (first boot downloads Paper and can take a minute or two):

```bash
docker compose logs -f stresscraft-test-server
```

Once it's healthy, open the dashboard and start a test against:

- **Host:** `stresscraft-test-server` (resolves via Docker's internal DNS — no
  `host.docker.internal` needed, since it's on the same Compose network)
- **Port:** `25565`

The test server ships with `online-mode=false`, a high `max-players`, and
`network-compression-threshold=-1` already set via env vars. Two more settings
from the [How to use?](#how-to-use) list above aren't env-var-driven and
default on, so past ~1 bot the server will throttle/reject the rest unless you
disable them once, right after the **first** boot:

```bash
docker exec stresscraft-test-server sed -i 's/connection-throttle: 4000/connection-throttle: -1/' /data/bukkit.yml
docker exec stresscraft-test-server sed -i 's/max-joins-per-tick: 5/max-joins-per-tick: 100/' /data/config/paper-global.yml
docker restart stresscraft-test-server
```

(Verified against Paper 1.21.1 — without this, only the first bot in a run
connects and the rest are silently throttled by Bukkit's per-IP connection
throttle, since every bot originates from the same backend container IP.)

Tear it down (and wipe its world data) with:

```bash
docker compose --profile test-server down -v
```

## Web Dashboard

The dashboard provides:

- **Live metrics** — total bots, active sessions, chunks loaded, join rate/s
- **Real-time charts** — 60-second rolling session load and chunk pressure graphs
- **Control panel** — configure host, port, bot count, join delay, buffer, and prefix
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
