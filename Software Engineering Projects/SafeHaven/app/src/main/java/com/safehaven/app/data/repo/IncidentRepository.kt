package com.safehaven.app.data.repo

import androidx.room.withTransaction
import com.safehaven.app.data.db.AuditEventEntity
import com.safehaven.app.data.db.ContactEntity
import com.safehaven.app.data.db.IncidentEntity
import com.safehaven.app.data.db.LocationUpdateEntity
import com.safehaven.app.data.db.NotificationEventEntity
import com.safehaven.app.data.db.SafeHavenDatabase
import com.safehaven.app.domain.ActivationMethod
import com.safehaven.app.domain.Channel
import com.safehaven.app.domain.DeliveryStatus
import com.safehaven.app.domain.EventKind
import com.safehaven.app.domain.FailureCode
import com.safehaven.app.domain.IncidentStatus
import com.safehaven.app.domain.LocationFix
import com.safehaven.app.domain.RetryPolicy
import com.safehaven.app.domain.StatusReducer
import java.util.UUID

/**
 * Single writer for incidents, delivery events, locations and the audit log. Every state change
 * is a short Room transaction so the database is always a truthful record of what happened.
 */
class IncidentRepository(
    private val db: SafeHavenDatabase,
    private val clock: () -> Long = { System.currentTimeMillis() },
) {
    private val incidents = db.incidents()
    private val locations = db.locations()
    private val events = db.events()
    private val audit = db.audit()
    private val contacts = db.contacts()

    sealed interface Activation {
        val incident: IncidentEntity

        data class Created(override val incident: IncidentEntity) : Activation
        data class AlreadyActive(override val incident: IncidentEntity) : Activation
    }

    // ---- Observation -------------------------------------------------------------------------

    fun observeActive() = incidents.observeActive()
    fun observeIncident(id: String) = incidents.observeById(id)
    fun observeHistory() = incidents.observeAll()
    fun observeEvents(incidentId: String) = events.observeForIncident(incidentId)
    fun observeLocations(incidentId: String) = locations.observeForIncident(incidentId)
    fun observeAudit(incidentId: String) = audit.observeForIncident(incidentId)

    suspend fun getActive(): IncidentEntity? = incidents.getActive()
    suspend fun get(id: String): IncidentEntity? = incidents.getById(id)
    suspend fun eventsFor(incidentId: String): List<NotificationEventEntity> = events.getForIncident(incidentId)
    suspend fun getEvent(id: String): NotificationEventEntity? = events.getById(id)

    // ---- Activation --------------------------------------------------------------------------

    /**
     * Persists a new incident before anything else happens. If an incident is already active the
     * existing one is returned, so repeated presses can never create duplicate alerts.
     */
    suspend fun activate(
        method: ActivationMethod,
        silent: Boolean,
        idempotencyKey: String = UUID.randomUUID().toString(),
    ): Activation = db.withTransaction {
        val active = incidents.getActive()
        if (active != null) {
            log(active.id, "DUPLICATE_ACTIVATION_IGNORED", "method=$method")
            return@withTransaction Activation.AlreadyActive(active)
        }
        val incident = IncidentEntity(
            id = UUID.randomUUID().toString(),
            idempotencyKey = idempotencyKey,
            incidentType = "SOS",
            status = IncidentStatus.CREATED,
            statusDetail = null,
            activationMethod = method,
            silent = silent,
            activatedAt = clock(),
            resolvedAt = null,
            lastLatitude = null,
            lastLongitude = null,
            lastAccuracyM = null,
            lastLocationAt = null,
        )
        if (incidents.insert(incident) == -1L) {
            val existing = incidents.getByIdempotencyKey(idempotencyKey)
            if (existing != null) return@withTransaction Activation.AlreadyActive(existing)
        }
        log(incident.id, "INCIDENT_CREATED", "method=$method silent=$silent")
        Activation.Created(incident)
    }

    suspend fun resolve(incidentId: String): Boolean = db.withTransaction {
        val incident = incidents.getById(incidentId) ?: return@withTransaction false
        if (incident.resolvedAt != null) return@withTransaction false
        incidents.resolve(incidentId, IncidentStatus.RESOLVED.name, clock())
        log(incidentId, "INCIDENT_RESOLVED", "ended by user")
        true
    }

    suspend fun deleteResolved(incidentId: String): Boolean = db.withTransaction {
        val removed = incidents.deleteResolved(incidentId) > 0
        if (removed) audit.deleteForIncident(incidentId)
        removed
    }

    // ---- Locations ---------------------------------------------------------------------------

    suspend fun recordLocation(incidentId: String, fix: LocationFix) = db.withTransaction {
        val incident = incidents.getById(incidentId) ?: return@withTransaction
        locations.insert(
            LocationUpdateEntity(
                incidentId = incidentId,
                latitude = fix.latitude,
                longitude = fix.longitude,
                accuracyM = fix.accuracyM,
                speedMps = fix.speedMps,
                headingDeg = fix.bearingDeg,
                timestamp = fix.timeMs,
            ),
        )
        val previous = incident.lastLocationAt
        if (previous == null || fix.timeMs >= previous) {
            incidents.setLastLocation(incidentId, fix.latitude, fix.longitude, fix.accuracyM, fix.timeMs)
        }
    }

    // ---- Delivery events ---------------------------------------------------------------------

    /** Queues the first alert for every contact that does not already have one. Idempotent. */
    suspend fun createInitialEvents(incidentId: String, recipients: List<ContactEntity>): Int = db.withTransaction {
        var created = 0
        for (contact in recipients) {
            val inserted = events.insertIgnore(
                newEvent(
                    incidentId = incidentId,
                    contactId = contact.id,
                    dedupeKey = "$incidentId:${contact.id}:INITIAL",
                    kind = EventKind.INITIAL,
                    name = contact.name,
                    phone = contact.phoneNumber,
                ),
            )
            if (inserted != -1L) created++
        }
        if (created > 0) log(incidentId, "ALERTS_QUEUED", "$created contact(s)")
        recomputeStatus(incidentId)
        created
    }

    /**
     * Queues a follow-up message (location update or "SOS ended") for contacts whose first alert
     * actually left the phone. [keySuffix] makes the message unique so it cannot be queued twice.
     */
    suspend fun createNoticeEvents(incidentId: String, kind: EventKind, keySuffix: String): Int = db.withTransaction {
        val reached = events.getForIncident(incidentId).filter {
            it.kind == EventKind.INITIAL &&
                (it.status == DeliveryStatus.SENT || it.status == DeliveryStatus.DELIVERED)
        }
        var created = 0
        for (initial in reached) {
            val inserted = events.insertIgnore(
                newEvent(
                    incidentId = incidentId,
                    contactId = initial.contactId,
                    dedupeKey = "$incidentId:${initial.contactId}:$keySuffix",
                    kind = kind,
                    name = initial.recipientName,
                    phone = initial.recipientPhone,
                ),
            )
            if (inserted != -1L) created++
        }
        created
    }

    suspend fun createTestEvent(contact: ContactEntity): NotificationEventEntity {
        val event = newEvent(
            incidentId = null,
            contactId = contact.id,
            dedupeKey = "TEST:${contact.id}:${clock()}",
            kind = EventKind.TEST,
            name = contact.name,
            phone = contact.phoneNumber,
        )
        events.insertIgnore(event)
        return event
    }

    suspend fun initialEventCount(incidentId: String): Int =
        events.getForIncident(incidentId).count { it.kind == EventKind.INITIAL }

    /** True while some alert still has a chance of being sent or retried. */
    suspend fun hasOpenWork(incidentId: String): Boolean = events.getForIncident(incidentId).any {
        it.kind == EventKind.INITIAL && when (it.status) {
            DeliveryStatus.PENDING, DeliveryStatus.SENDING -> true
            DeliveryStatus.FAILED -> RetryPolicy.canRetry(it.failureCode, it.attempts)
            else -> false
        }
    }

    suspend fun markNoContacts(incidentId: String) {
        incidents.setStatus(incidentId, IncidentStatus.FAILED.name, "No trusted contacts configured")
        log(incidentId, "NO_CONTACTS", "SOS recorded but there was nobody to alert")
    }

    /** Takes ownership of an event before sending. Returns the attempt number, or null if someone else owns it. */
    suspend fun claimForSending(eventId: String, parts: Int): Int? = db.withTransaction {
        if (events.claim(eventId, clock(), parts) == 0) return@withTransaction null
        val event = events.getById(eventId) ?: return@withTransaction null
        event.incidentId?.let { recomputeStatus(it) }
        event.attempts
    }

    /** One SMS segment has (or has not) left the phone. [attempt] ignores callbacks from older tries. */
    suspend fun onPartSent(eventId: String, attempt: Int, failure: FailureCode?) = db.withTransaction {
        val event = events.getById(eventId) ?: return@withTransaction
        if (event.attempts != attempt) return@withTransaction
        if (failure != null) {
            events.markFailed(eventId, failure.name)
            log(event.incidentId, "SMS_SEND_FAILED", "${event.kind} ${failure.label}")
        } else {
            events.incrementPartsSent(eventId)
            val updated = events.getById(eventId) ?: return@withTransaction
            if (updated.partsSent >= updated.partsTotal) {
                events.markSent(eventId, clock())
                log(event.incidentId, "SMS_SENT_TO_NETWORK", "${event.kind} to ${maskedRecipient(event)}")
            }
        }
        afterEventChange(eventId)
    }

    /** [delivered]: true = handset confirmed, false = carrier reports permanent failure, null = still pending. */
    suspend fun onPartDelivery(eventId: String, attempt: Int, delivered: Boolean?) = db.withTransaction {
        val event = events.getById(eventId) ?: return@withTransaction
        if (event.attempts != attempt || delivered == null) return@withTransaction
        if (delivered) {
            events.incrementPartsDelivered(eventId)
            val updated = events.getById(eventId) ?: return@withTransaction
            if (updated.partsDelivered >= updated.partsTotal) {
                events.markDelivered(eventId, clock())
                log(event.incidentId, "SMS_DELIVERED", "${event.kind} to ${maskedRecipient(event)}")
            }
        } else {
            events.markFailed(eventId, FailureCode.DELIVERY_REJECTED.name)
            log(event.incidentId, "SMS_DELIVERY_FAILED", "${event.kind} to ${maskedRecipient(event)}")
        }
        afterEventChange(eventId)
    }

    /** Records a failure that happened before or while handing a message to the radio. */
    suspend fun failEvent(eventId: String, code: FailureCode) = db.withTransaction {
        val event = events.getById(eventId) ?: return@withTransaction
        events.markFailed(eventId, code.name)
        log(event.incidentId, "SMS_SEND_FAILED", "${event.kind} ${code.label}")
        afterEventChange(eventId)
    }

    // ---- Audit log ---------------------------------------------------------------------------

    suspend fun log(incidentId: String?, type: String, detail: String? = null) {
        audit.insert(AuditEventEntity(incidentId = incidentId, type = type, detail = detail, timestamp = clock()))
    }

    // ---- Internals ---------------------------------------------------------------------------

    private suspend fun afterEventChange(eventId: String) {
        val event = events.getById(eventId) ?: return
        event.incidentId?.let { recomputeStatus(it) }
        val contactId = event.contactId
        if (event.kind == EventKind.TEST && contactId != null &&
            (event.status == DeliveryStatus.SENT ||
                event.status == DeliveryStatus.DELIVERED ||
                event.status == DeliveryStatus.FAILED)
        ) {
            contacts.setTestResult(contactId, event.status.name, clock())
        }
    }

    private suspend fun recomputeStatus(incidentId: String) {
        val incident = incidents.getById(incidentId) ?: return
        if (incident.resolvedAt != null) return
        val initial = events.getForIncident(incidentId).filter { it.kind == EventKind.INITIAL }
        if (initial.isEmpty()) return
        val status = StatusReducer.compute(
            initial = initial.map { it.status },
            acknowledged = initial.any { it.acknowledgedAt != null },
            resolved = false,
        )
        val detail = if (status == IncidentStatus.FAILED) {
            initial.mapNotNull { it.failureCode?.label }.distinct().joinToString("; ").ifBlank { null }
        } else {
            null
        }
        if (status != incident.status || detail != incident.statusDetail) {
            incidents.setStatus(incidentId, status.name, detail)
        }
    }

    private fun newEvent(
        incidentId: String?,
        contactId: String?,
        dedupeKey: String,
        kind: EventKind,
        name: String,
        phone: String,
    ) = NotificationEventEntity(
        id = UUID.randomUUID().toString(),
        incidentId = incidentId,
        contactId = contactId,
        dedupeKey = dedupeKey,
        kind = kind,
        channel = Channel.SMS,
        recipientName = name,
        recipientPhone = phone,
        status = DeliveryStatus.PENDING,
        failureCode = null,
        attempts = 0,
        partsTotal = 0,
        partsSent = 0,
        partsDelivered = 0,
        createdAt = clock(),
        attemptedAt = null,
        sentAt = null,
        deliveredAt = null,
        acknowledgedAt = null,
    )

    private fun maskedRecipient(event: NotificationEventEntity): String =
        com.safehaven.app.domain.PhoneNumber.mask(event.recipientPhone)
}
