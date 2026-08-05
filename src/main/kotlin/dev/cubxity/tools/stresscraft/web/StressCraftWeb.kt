package dev.cubxity.tools.stresscraft.web

import dev.cubxity.tools.stresscraft.StressCraft
import dev.cubxity.tools.stresscraft.StressCraftOptions
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.websocket.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * StressCraft Web API — serves a REST/WebSocket API backend.
 * The modern frontend dashboard is served separately by Nginx.
 *
 * Routes:
 *   GET  /api/stats          → current telemetry snapshot (JSON)
 *   POST /api/start          → start a stress-test session
 *   POST /api/stop           → stop the running session
 *   WS   /api/ws             → real-time telemetry stream (1 s ticks)
 */
object StressCraftWeb {
    @Volatile
    private var app: StressCraft? = null

    fun start() {
        embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
            install(ContentNegotiation) { json() }
            install(WebSockets) {
                pingPeriodMillis = 15_000
                timeoutMillis = 30_000
            }

            routing {
                // ── REST ────────────────────────────────────────────────────
                get("/api/stats") {
                    val running = app
                    if (running == null) {
                        call.respond(
                            mapOf(
                                "running" to false,
                                "sessionCount" to 0,
                                "activeSessions" to 0,
                                "chunksLoaded" to 0
                            )
                        )
                    } else {
                        call.respond(
                            mapOf(
                                "running" to true,
                                "sessionCount" to running.sessionCount.get(),
                                "activeSessions" to running.activeSessions.get(),
                                "chunksLoaded" to running.chunksLoaded.get()
                            )
                        )
                    }
                }

                post("/api/start") {
                    if (app != null) {
                        call.respondText("Already running", status = HttpStatusCode.BadRequest)
                        return@post
                    }
                    val params = call.receiveParameters()
                    val host = params["host"]
                        ?: return@post call.respondText("Missing host", status = HttpStatusCode.BadRequest)
                    val port = params["port"]?.toIntOrNull() ?: 25565
                    val count = params["count"]?.toIntOrNull() ?: 500
                    val delay = params["delay"]?.toIntOrNull() ?: 20
                    val buffer = params["buffer"]?.toIntOrNull() ?: 20
                    val prefix = params["prefix"] ?: "Player"
                    val simulate = params["simulate"]?.let { it == "on" || it == "true" } ?: true

                    val options = StressCraftOptions(count, delay, buffer, prefix, simulate, null)
                    val instance = StressCraft(host, port, options)
                    instance.start()
                    app = instance
                    call.respondText("Started")
                }

                post("/api/stop") {
                    val running = app ?: run {
                        call.respondText("Not running", status = HttpStatusCode.BadRequest)
                        return@post
                    }
                    running.stop()
                    app = null
                    call.respondText("Stopped")
                }

                // ── WebSocket telemetry stream ────────────────────────────
                webSocket("/api/ws") {
                    try {
                        while (isActive) {
                            val running = app
                            val payload = buildJsonObject {
                                put("running", running != null)
                                put("sessionCount", running?.sessionCount?.get() ?: 0)
                                put("activeSessions", running?.activeSessions?.get() ?: 0)
                                put("chunksLoaded", running?.chunksLoaded?.get() ?: 0)
                                put("ts", System.currentTimeMillis())
                            }
                            send(Frame.Text(Json.encodeToString(payload)))
                            delay(1_000)
                        }
                    } catch (_: Exception) {
                        // client disconnected — normal teardown
                    }
                }

                // ── Health-check (for Docker) ─────────────────────────────
                get("/health") {
                    call.respondText("OK")
                }
            }
        }.start(wait = true)
    }
}

fun main() {
    StressCraftWeb.start()
}
