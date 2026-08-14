package dev.cubxity.tools.stresscraft.util

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ServerTimerTest {
    @Test
    fun `has no data before the first update`() {
        val timer = ServerTimer()
        assertFalse(timer.hasData)
        assertEquals(20.0, timer.tps)
        assertEquals(50.0, timer.mspt)
    }

    @Test
    fun `has data after the first update, but keeps default tps`() {
        val timer = ServerTimer()
        timer.onWorldTimeUpdate(0)
        assertTrue(timer.hasData)
        assertEquals(20.0, timer.tps)
    }

    @Test
    fun `estimates a lower tps when ticks arrive slower than 50ms`() {
        val timer = ServerTimer()
        timer.onWorldTimeUpdate(0)
        Thread.sleep(80)
        timer.onWorldTimeUpdate(1)

        assertTrue(timer.mspt >= 50.0, "expected mspt >= 50 but was ${timer.mspt}")
        assertTrue(timer.tps < 20.0, "expected tps < 20 but was ${timer.tps}")
    }

    @Test
    fun `ignores updates where the world time did not advance`() {
        val timer = ServerTimer()
        timer.onWorldTimeUpdate(5)
        val tpsBefore = timer.tps
        val msptBefore = timer.mspt

        timer.onWorldTimeUpdate(5)

        assertEquals(tpsBefore, timer.tps)
        assertEquals(msptBefore, timer.mspt)
    }
}
