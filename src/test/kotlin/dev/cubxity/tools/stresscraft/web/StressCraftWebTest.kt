package dev.cubxity.tools.stresscraft.web

import io.ktor.client.request.forms.FormDataContent
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.http.Parameters
import io.ktor.server.testing.testApplication
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Only exercises paths that reject the request before a real StressCraft
 * instance would be started — a genuinely successful /api/start would open
 * real network connections to the given host, which tests must never do.
 */
class StressCraftWebTest {
    private val testKey = "test-api-key"
    private lateinit var originalKey: String

    @BeforeTest
    fun setup() {
        originalKey = StressCraftWeb.apiKey
        StressCraftWeb.apiKey = testKey
        StressCraftWeb.app.set(null)
    }

    @AfterTest
    fun tearDown() {
        StressCraftWeb.apiKey = originalKey
        StressCraftWeb.app.set(null)
    }

    @Test
    fun `health endpoint responds without auth`() = testApplication {
        application { stressCraftModule() }
        val response = client.get("/health")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("OK", response.bodyAsText())
    }

    @Test
    fun `stats endpoint reports not running without auth`() = testApplication {
        application { stressCraftModule() }
        val response = client.get("/api/stats")
        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.bodyAsText().contains("\"running\":false"))
    }

    @Test
    fun `start without an api key is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/start") {
            setBody(FormDataContent(Parameters.build { append("host", "example.com") }))
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `start with the wrong api key is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/start") {
            header("X-API-Key", "not-the-right-key")
            setBody(FormDataContent(Parameters.build { append("host", "example.com") }))
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun `start without a host is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/start") {
            header("X-API-Key", testKey)
            setBody(FormDataContent(Parameters.build { }))
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `start with an out-of-range count is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/start") {
            header("X-API-Key", testKey)
            setBody(
                FormDataContent(
                    Parameters.build {
                        append("host", "example.com")
                        append("count", "50000")
                    }
                )
            )
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `start with an out-of-range port is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/start") {
            header("X-API-Key", testKey)
            setBody(
                FormDataContent(
                    Parameters.build {
                        append("host", "example.com")
                        append("port", "70000")
                    }
                )
            )
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `stop when nothing is running is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/stop") {
            header("X-API-Key", testKey)
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
    }

    @Test
    fun `stop without an api key is rejected`() = testApplication {
        application { stressCraftModule() }
        val response = client.post("/api/stop")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }
}
