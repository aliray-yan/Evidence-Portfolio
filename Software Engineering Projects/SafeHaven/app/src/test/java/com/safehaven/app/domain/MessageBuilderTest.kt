package com.safehaven.app.domain

import java.util.TimeZone
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MessageBuilderTest {
    private val utc = TimeZone.getTimeZone("UTC")
    private val id = "3f2a91bc-0000-4000-8000-000000000001"
    private val now = 1_792_000_000_000L
    private fun fix(ageMs: Long = 5_000L, accuracy: Float? = 12.4f) =
        LocationFix(31.41821, 73.07905, accuracy, null, null, now - ageMs)

    @Test fun initialAlertCarriesNameLocationLinkTimeAndReference() {
        val text = MessageBuilder.initialAlert("Ali", id, fix(), now - 8_000L, now, utc)
        assertTrue(text.startsWith("EMERGENCY ALERT: SOS activated by Ali."))
        assertTrue(text.contains("31.41821,73.07905"))
        assertTrue(text.contains("accuracy ~12m"))
        assertTrue(text.contains("https://maps.google.com/?q=31.41821,73.07905"))
        assertTrue(text.contains("Ref: 3F2A91BC"))
        assertTrue(text.contains("UTC"))
        assertFalse(text.contains("last known"))
    }

    @Test fun staleFixIsLabelledWithItsAge() {
        val text = MessageBuilder.initialAlert("Ali", id, fix(ageMs = 12 * 60_000L), now, now, utc)
        assertTrue(text.contains("last known 12 min ago"))
    }

    @Test fun missingFixSaysSoInsteadOfInventingCoordinates() {
        val text = MessageBuilder.initialAlert("Ali", id, null, now, now, utc)
        assertTrue(text.contains("not available yet"))
        assertFalse(text.contains("maps.google.com"))
    }

    @Test fun updateAndEndedNoticesReferenceTheSameIncident() {
        val update = MessageBuilder.locationUpdate("Ali", id, fix(), now, utc)
        val ended = MessageBuilder.resolvedNotice("Ali", id, now, utc)
        assertTrue(update.startsWith("SOS UPDATE (3F2A91BC)"))
        assertTrue(ended.startsWith("SOS ENDED (3F2A91BC)"))
        assertTrue(ended.contains("No further updates"))
    }

    @Test fun messagesStayInGsmSevenBitCharacters() {
        val all = listOf(
            MessageBuilder.initialAlert("Ali", id, fix(), now, now, utc),
            MessageBuilder.locationUpdate("Ali", id, fix(), now, utc),
            MessageBuilder.resolvedNotice("Ali", id, now, utc),
            MessageBuilder.testMessage("Ali"),
        )
        all.forEach { msg -> assertTrue(msg, msg.all { it.code < 128 }) }
    }
}
