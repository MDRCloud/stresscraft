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
import java.security.SecureRandom
import java.util.Base64
import java.util.concurrent.atomic.AtomicReference

/**
 * StressCraft Web API — serves a REST/WebSocket API backend.
 * The modern frontend dashboard is served separately by Nginx.
 *
 * Routes:
 *   GET  /api/stats          → current telemetry snapshot (JSON)
 *   POST /api/start          → start a stress-test session (requires X-API-Key)
 *   POST /api/stop           → stop the running session (requires X-API-Key)
 *   WS   /api/ws             → real-time telemetry stream (1 s ticks)
 */
object StressCraftWeb {
    internal val app = AtomicReference<StressCraft?>(null)

    /** Visible/settable internally so tests can pin a known key. */
    internal var apiKey: String = resolveApiKey()

    fun start() {
        embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::stressCraftModule)
            .start(wait = true)
    }
}

private fun resolveApiKey(): String =
    System.getenv("STRESSCRAFT_API_KEY")?.takeIf { it.isNotBlank() } ?: run {
        val bytes = ByteArray(24).also { SecureRandom().nextBytes(it) }
        val generated = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        println("=".repeat(60))
        println("No STRESSCRAFT_API_KEY set — generated one for this run:")
        println(generated)
        println("Pass it as the X-API-Key header to /api/start and /api/stop.")
        println("=".repeat(60))
        generated
    }

fun Application.stressCraftModule() {
    install(ContentNegotiation) { json() }
    install(WebSockets) {
        pingPeriodMillis = 15_000
        timeoutMillis = 30_000
    }

    routing {
        // ── REST ────────────────────────────────────────────────────
        get("/api/stats") {
            val running = StressCraftWeb.app.get()
            val payload = buildJsonObject {
                put("running", running != null)
                put("sessionCount", running?.sessionCount?.get() ?: 0)
                put("activeSessions", running?.activeSessions?.get() ?: 0)
                put("chunksLoaded", running?.chunksLoaded?.get() ?: 0)
            }
            call.respondText(Json.encodeToString(payload), ContentType.Application.Json)
        }

        post("/api/start") {
            if (call.request.headers["X-API-Key"] != StressCraftWeb.apiKey) {
                call.respondText("Unauthorized", status = HttpStatusCode.Unauthorized)
                return@post
            }

            val params = call.receiveParameters()
            val host = params["host"]?.trim()
            if (host.isNullOrBlank()) {
                call.respondText("Missing host", status = HttpStatusCode.BadRequest)
                return@post
            }
            val port = params["port"]?.toIntOrNull() ?: 25565
            if (port !in 1..65535) {
                call.respondText("port must be between 1 and 65535", status = HttpStatusCode.BadRequest)
                return@post
            }
            val count = params["count"]?.toIntOrNull() ?: 500
            if (count !in 1..2000) {
                call.respondText("count must be between 1 and 2000", status = HttpStatusCode.BadRequest)
                return@post
            }
            val delay = params["delay"]?.toIntOrNull() ?: 20
            if (delay < 1) {
                call.respondText("delay must be at least 1", status = HttpStatusCode.BadRequest)
                return@post
            }
            val buffer = params["buffer"]?.toIntOrNull() ?: 20
            if (buffer !in 1..200) {
                call.respondText("buffer must be between 1 and 200", status = HttpStatusCode.BadRequest)
                return@post
            }
            val prefix = params["prefix"] ?: "Player"

            val options = StressCraftOptions(count, delay, buffer, prefix, null)
            val instance = StressCraft(host, port, options)
            if (!StressCraftWeb.app.compareAndSet(null, instance)) {
                call.respondText("Already running", status = HttpStatusCode.BadRequest)
                return@post
            }
            instance.start()
            call.respondText("Started")
        }

        post("/api/stop") {
            if (call.request.headers["X-API-Key"] != StressCraftWeb.apiKey) {
                call.respondText("Unauthorized", status = HttpStatusCode.Unauthorized)
                return@post
            }

            val running = StressCraftWeb.app.getAndSet(null) ?: run {
                call.respondText("Not running", status = HttpStatusCode.BadRequest)
                return@post
            }
            running.stop()
            call.respondText("Stopped")
        }

        // ── WebSocket telemetry stream ────────────────────────────
        webSocket("/api/ws") {
            try {
                while (isActive) {
                    val running = StressCraftWeb.app.get()
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
}

fun main() {
    StressCraftWeb.start()
}
