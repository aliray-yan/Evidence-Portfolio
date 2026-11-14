package com.safehaven.app.domain

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.roundToInt

/**
 * Builds the SMS texts. Only GSM-7 friendly characters are used so a message stays in as few
 * segments as possible (a single non-GSM character halves the per-segment limit).
 */
object MessageBuilder {
    private const val FRESH_MS = 60_000L

    fun shortId(incidentId: String): String =
        incidentId.replace("-", "").take(8).uppercase(Locale.US)

    fun mapLink(lat: Double, lon: Double): String =
        "https://maps.google.com/?q=${coord(lat)},${coord(lon)}"

    fun initialAlert(
        userName: String,
        incidentId: String,
        fix: LocationFix?,
        activatedAt: Long,
        now: Long,
        zone: TimeZone = TimeZone.getDefault(),
    ): String = buildString {
        append("EMERGENCY ALERT: SOS activated by ").append(userName).append(".\n")
        append(locationBlock(fix, now)).append('\n')
        append("Time: ").append(formatTime(activatedAt, zone)).append('\n')
        append("Ref: ").append(shortId(incidentId)).append('\n')
        append("Please try to reach them and get help if you cannot.")
    }

    fun locationUpdate(
        userName: String,
        incidentId: String,
        fix: LocationFix,
        now: Long,
        zone: TimeZone = TimeZone.getDefault(),
    ): String = buildString {
        append("SOS UPDATE (").append(shortId(incidentId)).append("): ").append(userName).append('\n')
        append(locationBlock(fix, now)).append('\n')
        append("As of ").append(formatTime(fix.timeMs, zone))
    }

    fun resolvedNotice(
        userName: String,
        incidentId: String,
        now: Long,
        zone: TimeZone = TimeZone.getDefault(),
    ): String =
        "SOS ENDED (${shortId(incidentId)}): $userName has ended the emergency alert at " +
            "${formatTime(now, zone)}. No further updates will be sent."

    fun testMessage(userName: String): String =
        "SafeHaven test: $userName added you as an emergency contact. If they ever send an SOS " +
            "you will get a message like this with their location. No action needed now."

    private fun locationBlock(fix: LocationFix?, now: Long): String {
        if (fix == null) {
            return "Location: not available yet (no GPS fix). Updates will follow if a fix is found."
        }
        val accuracy = fix.accuracyM?.let { ", accuracy ~${it.roundToInt()}m" } ?: ""
        val ageMs = now - fix.timeMs
        val age = if (ageMs > FRESH_MS) ", last known ${ageMs / 60_000L} min ago" else ""
        return "Location: ${coord(fix.latitude)},${coord(fix.longitude)}$accuracy$age\n" +
            "Map: ${mapLink(fix.latitude, fix.longitude)}"
    }

    private fun coord(value: Double): String = String.format(Locale.US, "%.5f", value)

    fun formatTime(ms: Long, zone: TimeZone): String {
        val format = SimpleDateFormat("yyyy-MM-dd HH:mm z", Locale.US)
        format.timeZone = zone
        return format.format(Date(ms))
    }
}
