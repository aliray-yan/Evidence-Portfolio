package com.safehaven.app.emergency

import android.util.Log
import com.safehaven.app.data.db.IncidentEntity
import com.safehaven.app.data.db.NotificationEventEntity
import com.safehaven.app.data.prefs.SettingsRepository
import com.safehaven.app.data.repo.ContactsRepository
import com.safehaven.app.data.repo.IncidentRepository
import com.safehaven.app.domain.Channel
import com.safehaven.app.domain.DeliveryStatus
import com.safehaven.app.domain.EventKind
import com.safehaven.app.domain.FailureCode
import com.safehaven.app.domain.LocationFix
import com.safehaven.app.domain.MessageBuilder
import com.safehaven.app.domain.PhoneNumber
import com.safehaven.app.domain.RetryPolicy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Decides what to send, to whom, and when, and records every outcome.
 * It is shared by the foreground service, the WorkManager backstop and the UI, so a single mutex
 * and an atomic claim on each message guarantee that no message is sent twice by accident.
 */
class EmergencyDispatcher(
    private val incidents: IncidentRepository,
    private val contacts: ContactsRepository,
    private val settings: SettingsRepository,
    private val sms: SmsSender,
    private val location: LocationProvider,
    private val clock: () -> Long = { System.currentTimeMillis() },
) {
    private val mutex = Mutex()

    enum class TestResult { REQUESTED, NO_PERMISSION, NO_TELEPHONY, NOT_FOUND }

    /**
     * First response to an SOS: queue an alert for every contact, grab the best location we can
     * get quickly, then send. Returns true when the location was missing or stale, meaning a
     * follow-up location message should go out as soon as a fresh fix arrives.
     */
    suspend fun dispatchInitial(incidentId: String): Boolean {
        mutex.withLock { ensureInitialEvents(incidentId) }
        val fix = acquireInitialFix()
        if (fix != null) incidents.recordLocation(incidentId, fix)
        syncAndSend(incidentId)
        return fix == null || clock() - fix.timeMs > FRESH_MS || (fix.accuracyM ?: 0f) > POOR_ACCURACY_M
    }

    /**
     * Creates alerts for any enabled contact that has none yet, then sends everything that is due.
     * [force] ignores backoff and the attempt limit (used by the "Retry now" button).
     */
    suspend fun syncAndSend(incidentId: String, force: Boolean = false) {
        mutex.withLock {
            ensureInitialEvents(incidentId)
            val incident = incidents.get(incidentId) ?: return@withLock
            if (incident.resolvedAt != null) return@withLock
            sendEligible(incident, force, setOf(EventKind.INITIAL))
        }
    }

    /** Sends a location update to every contact whose first alert left the phone. Best effort, never retried. */
    suspend fun sendLocationUpdate(incidentId: String) {
        mutex.withLock {
            val incident = incidents.get(incidentId) ?: return@withLock
            if (incident.resolvedAt != null || incident.lastFix() == null) return@withLock
            val created = incidents.createNoticeEvents(incidentId, EventKind.LOCATION_UPDATE, "UPDATE:${clock() / 1000}")
            if (created > 0) sendEligible(incident, false, setOf(EventKind.LOCATION_UPDATE))
        }
    }

    /** Tells contacts the SOS was ended. Only reaches people who got the first alert. */
    suspend fun notifyResolved(incidentId: String) {
        if (!settings.current().notifyOnResolve) return
        mutex.withLock {
            val incident = incidents.get(incidentId) ?: return@withLock
            val created = incidents.createNoticeEvents(incidentId, EventKind.RESOLVED, "RESOLVED")
            if (created > 0) sendEligible(incident, false, setOf(EventKind.RESOLVED))
        }
    }

    /** Sends the "you were added as a contact" test message. Costs one real SMS. */
    suspend fun sendTest(contactId: String): TestResult {
        val contact = contacts.get(contactId) ?: return TestResult.NOT_FOUND
        when (sms.availability()) {
            SmsSender.Availability.NO_TELEPHONY -> return TestResult.NO_TELEPHONY
            SmsSender.Availability.NO_PERMISSION -> return TestResult.NO_PERMISSION
            SmsSender.Availability.OK -> Unit
        }
        val event = incidents.createTestEvent(contact)
        mutex.withLock { sendOne(null, event, settings.current().displayName) }
        return TestResult.REQUESTED
    }

    // ---- Internals ---------------------------------------------------------------------------

    private suspend fun ensureInitialEvents(incidentId: String) {
        val incident = incidents.get(incidentId) ?: return
        if (incident.resolvedAt != null) return
        val enabled = contacts.enabled()
        if (enabled.isEmpty()) {
            if (incidents.initialEventCount(incidentId) == 0) incidents.markNoContacts(incidentId)
            return
        }
        incidents.createInitialEvents(incidentId, enabled)
    }

    private suspend fun acquireInitialFix(): LocationFix? {
        if (!location.hasPermission()) return null
        val cached = location.lastKnown()
        val recentAndGood = cached != null &&
            clock() - cached.timeMs < FRESH_MS &&
            (cached.accuracyM ?: 0f) < POOR_ACCURACY_M
        if (recentAndGood) return cached
        // Do not hold the alert back for long: wait briefly for a fresh fix, then send what we have.
        return location.currentFix(INITIAL_FIX_WAIT_MS) ?: cached
    }

    private suspend fun sendEligible(incident: IncidentEntity, force: Boolean, kinds: Set<EventKind>) {
        val now = clock()
        val name = settings.current().displayName
        for (original in incidents.eventsFor(incident.id)) {
            if (original.kind !in kinds || original.channel != Channel.SMS) continue
            var event = original
            val stuck = event.status == DeliveryStatus.SENDING &&
                now - (event.attemptedAt ?: 0L) > RetryPolicy.STALE_SENDING_MS
            if (stuck) {
                incidents.failEvent(event.id, FailureCode.NO_CALLBACK)
                event = incidents.getEvent(event.id) ?: continue
            }
            if (!isEligible(event, now, force)) continue
            sendOne(incident, event, name)
        }
    }

    private fun isEligible(event: NotificationEventEntity, now: Long, force: Boolean): Boolean = when (event.status) {
        DeliveryStatus.PENDING -> true
        DeliveryStatus.FAILED -> when {
            // Updates and "ended" notices are best effort; the next message supersedes them.
            event.kind != EventKind.INITIAL -> false
            force -> event.failureCode?.retryable ?: true
            else -> RetryPolicy.canRetry(event.failureCode, event.attempts) &&
                RetryPolicy.isDue(event.attempts, event.attemptedAt, now)
        }
        else -> false
    }

    private suspend fun sendOne(incident: IncidentEntity?, event: NotificationEventEntity, name: String) {
        val blocked = when (sms.availability()) {
            SmsSender.Availability.NO_TELEPHONY -> FailureCode.NO_TELEPHONY
            SmsSender.Availability.NO_PERMISSION -> FailureCode.NO_PERMISSION
            SmsSender.Availability.OK -> null
        }
        if (blocked != null) {
            // Nothing was handed to the radio, so this does not use up an attempt.
            if (!(event.status == DeliveryStatus.FAILED && event.failureCode == blocked)) {
                incidents.failEvent(event.id, blocked)
            }
            return
        }

        val text = buildText(incident, event, name) ?: return
        try {
            val parts = sms.partCount(text)
            val attempt = incidents.claimForSending(event.id, parts) ?: return
            incidents.log(
                event.incidentId,
                "SMS_HANDED_TO_RADIO",
                "${event.kind} to ${PhoneNumber.mask(event.recipientPhone)} attempt=$attempt parts=$parts",
            )
            try {
                sms.send(event.id, attempt, event.recipientPhone, text)
            } catch (e: SecurityException) {
                incidents.failEvent(event.id, FailureCode.NO_PERMISSION)
            } catch (e: Exception) {
                Log.e(TAG, "SmsManager refused the message", e)
                incidents.failEvent(event.id, FailureCode.GENERIC)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Could not send ${event.kind} message", e)
            incidents.failEvent(event.id, FailureCode.GENERIC)
        }
    }

    private fun buildText(incident: IncidentEntity?, event: NotificationEventEntity, name: String): String? {
        val now = clock()
        return when (event.kind) {
            EventKind.TEST -> MessageBuilder.testMessage(name)
            EventKind.INITIAL -> incident?.let {
                MessageBuilder.initialAlert(name, it.id, it.lastFix(), it.activatedAt, now)
            }
            EventKind.LOCATION_UPDATE -> {
                val fix = incident?.lastFix()
                if (incident != null && fix != null) MessageBuilder.locationUpdate(name, incident.id, fix, now) else null
            }
            EventKind.RESOLVED -> incident?.let { MessageBuilder.resolvedNotice(name, it.id, now) }
        }
    }

    /** The text a person would send by hand if automatic SMS is unavailable. */
    suspend fun manualAlertText(incidentId: String): String? {
        val incident = incidents.get(incidentId) ?: return null
        val name = settings.current().displayName
        return MessageBuilder.initialAlert(name, incident.id, incident.lastFix(), incident.activatedAt, clock())
    }

    private companion object {
        const val TAG = "EmergencyDispatcher"
        const val FRESH_MS = 60_000L
        const val POOR_ACCURACY_M = 200f
        const val INITIAL_FIX_WAIT_MS = 4_000L
    }
}
