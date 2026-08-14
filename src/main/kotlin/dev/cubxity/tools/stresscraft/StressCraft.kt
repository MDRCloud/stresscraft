package dev.cubxity.tools.stresscraft

import dev.cubxity.tools.stresscraft.data.StressCraftSession
import kotlinx.coroutines.*
import java.util.*
import java.util.concurrent.atomic.AtomicInteger

class StressCraft(
    val host: String,
    val port: Int,
    val options: StressCraftOptions
) {
    private val coroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var id = 0

    private val _sessions = LinkedList<StressCraftSession>()

    val sessionCount = AtomicInteger()
    val activeSessions = AtomicInteger()
    val chunksLoaded = AtomicInteger()

    val sessions: List<StressCraftSession>
        get() = _sessions

    fun start() {
        Runtime.getRuntime().addShutdownHook(Thread {
            executeShutdownHook()
        })

        coroutineScope.launch {
            while (true) {
                try {
                    val sessions = sessionCount.get()
                    val activeSessions = activeSessions.get()
                    if (sessions < options.count && sessions - activeSessions < options.buffer) {
                        createSession()
                    }
                } catch (error: Throwable) {
                    System.err.println("Error while spawning session:")
                    error.printStackTrace()
                }
                delay(options.delay.toLong())
            }
        }
    }

    fun removeSession(session: StressCraftSession) {
        synchronized(_sessions) {
            _sessions.remove(session)
        }
    }

    fun stop() {
        executeShutdownHook()
    }

    private fun createSession() {
        val name = options.prefix + "${id++}".padStart(4, '0')
        val session = StressCraftSession(this)
        synchronized(_sessions) {
            _sessions.add(session)
        }
        // Connect in its own coroutine so the spawning loop is never blocked
        // by a slow or failing TCP handshake.
        coroutineScope.launch(Dispatchers.IO) {
            session.connect(name)
        }
    }

    private fun executeShutdownHook() {
        coroutineScope.coroutineContext.job.cancel()
    }
}
