package dev.cubxity.tools.stresscraft.web

import dev.cubxity.tools.stresscraft.StressCraft
import dev.cubxity.tools.stresscraft.StressCraftOptions
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.html.*
import kotlinx.html.*

/**
 * Simple web GUI for StressCraft allowing basic administration through HTTP endpoints.
 */
object StressCraftWeb {
    private var app: StressCraft? = null

    fun start() {
        embeddedServer(Netty, port = 8080) {
            install(ContentNegotiation) {
                json()
            }

            routing {
                get("/") {
                    call.respondHtml {
                        head {
                            title { +"StressCraft" }
                            script {
                                unsafe {
                                    raw(
                                        """
                                        async function refresh() {
                                            const res = await fetch('/stats');
                                            if (res.ok) {
                                                const data = await res.json();
                                                document.getElementById('sessions').innerText = data.sessionCount ?? 0;
                                                document.getElementById('active').innerText = data.activeSessions ?? 0;
                                                document.getElementById('chunks').innerText = data.chunksLoaded ?? 0;
                                            }
                                        }
                                        async function start(event) {
                                            event.preventDefault();
                                            const form = document.getElementById('start-form');
                                            const data = new URLSearchParams(new FormData(form));
                                            await fetch('/start', {method: 'POST', body: data});
                                        }
                                        async function stop() {
                                            await fetch('/stop', {method: 'POST'});
                                        }
                                        setInterval(refresh, 1000);
                                        """
                                    )
                                }
                            }
                        }
                        body {
                            h1 { +"StressCraft Web GUI" }
                            div { +"Sessions: " ; span { id = "sessions"; +"0" } }
                            div { +"Active: " ; span { id = "active"; +"0" } }
                            div { +"Chunks: " ; span { id = "chunks"; +"0" } }
                            form {
                                id = "start-form"
                                onSubmit = "start(event)"
                                p {
                                    +"Host: "
                                    textInput(name = "host") { value = "localhost" }
                                }
                                p {
                                    +"Port: "
                                    numberInput(name = "port") { value = "25565" }
                                }
                                p {
                                    +"Count: "
                                    numberInput(name = "count") { value = "500" }
                                }
                                p {
                                    +"Delay: "
                                    numberInput(name = "delay") { value = "20" }
                                }
                                p {
                                    +"Buffer: "
                                    numberInput(name = "buffer") { value = "20" }
                                }
                                p {
                                    +"Prefix: "
                                    textInput(name = "prefix") { value = "Player" }
                                }
                                p {
                                    +"Simulate: "
                                    checkBoxInput(name = "simulate") { checked = true }
                                }
                                p {
                                    submitInput { value = "Start" }
                                }
                            }
                            button {
                                type = ButtonType.button
                                onClick = "stop()"
                                +"Stop"
                            }
                        }
                    }
                }

                get("/stats") {
                    val running = app
                    if (running == null) {
                        call.respond(mapOf("running" to false))
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

                post("/start") {
                    if (app != null) {
                        call.respondText("Already running", status = io.ktor.http.HttpStatusCode.BadRequest)
                        return@post
                    }
                    val params = call.receiveParameters()
                    val host = params["host"] ?: return@post call.respondText("Missing host", status = io.ktor.http.HttpStatusCode.BadRequest)
                    val port = params["port"]?.toIntOrNull() ?: 25565
                    val count = params["count"]?.toIntOrNull() ?: 500
                    val delay = params["delay"]?.toIntOrNull() ?: 20
                    val buffer = params["buffer"]?.toIntOrNull() ?: 20
                    val prefix = params["prefix"] ?: "Player"
                    val simulate = params["simulate"]?.toBoolean() ?: true

                    val options = StressCraftOptions(count, delay, buffer, prefix, simulate, null)
                    val instance = StressCraft(host, port, options)
                    instance.start()
                    app = instance
                    call.respondText("Started")
                }

                post("/stop") {
                    val running = app
                    if (running == null) {
                        call.respondText("Not running", status = io.ktor.http.HttpStatusCode.BadRequest)
                        return@post
                    }
                    running.stop()
                    app = null
                    call.respondText("Stopped")
                }
            }
        }.start(wait = true)
    }
}

fun main() {
    StressCraftWeb.start()
}

