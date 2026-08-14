# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-08-14

### Security

- The web dashboard's `POST /api/start` and `POST /api/stop` now require an
  `X-API-Key` header, checked against `STRESSCRAFT_API_KEY` (env var, or a
  random key generated and logged at boot if unset). Previously anyone who
  could reach the API could start a stress test against any host with no
  authentication.
- `/api/start` now validates and bounds `host`, `port`, `count`, `delay`, and
  `buffer`, rejecting out-of-range values with `400` instead of silently
  accepting them.
- Fixed a race condition where two concurrent `/api/start` calls could both
  pass the "not already running" check and leak an untracked instance; the
  running instance is now tracked with an `AtomicReference` + `compareAndSet`.

### Changed

- Docker Compose now requires `STRESSCRAFT_API_KEY` to be set (via `.env`);
  see the README for how to generate one.
- The dashboard has a new "API key" field, stored in `localStorage`, sent on
  start/stop requests.
- CI (`.github/workflows/build.yml`) now runs the test suite before building,
  and no longer uses deprecated/archived GitHub Actions
  (`actions/checkout@v1`, `actions/upload-artifact@v2`,
  `gradle/gradle-build-action@v2`).
- Errors in the bot-spawning loop, the CLI render loop, and the (now-removed)
  tick loop are logged instead of being silently swallowed.

### Removed

- The `--simulate` / web "Simulate Gameplay" option, which was accepted but
  never actually implemented or read anywhere.
- The empty `Module` extension point and its associated no-op tick loop,
  which iterated an always-empty module list on every tick.

### Fixed

- `GET /api/stats` could throw a `SerializationException` at runtime because
  it tried to serialize a `Map<String, Any>` with mixed value types; it now
  builds an explicit JSON object, matching the WebSocket telemetry handler.

### Added

- Test suite (`src/test`) covering `ServerTimer`'s TPS estimation and the web
  API's auth/validation behavior via Ktor's `testApplication`.

## [0.0.1] - Initial release

- Kotlin/Ktor Minecraft stress-testing CLI, web dashboard, and Docker Compose
  stack.
