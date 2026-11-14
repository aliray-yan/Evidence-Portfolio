package com.safehaven.app.data.db

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.safehaven.app.domain.ActivationMethod
import com.safehaven.app.domain.Channel
import com.safehaven.app.domain.DeliveryStatus
import com.safehaven.app.domain.EventKind
import com.safehaven.app.domain.FailureCode
import com.safehaven.app.domain.IncidentStatus
import com.safehaven.app.domain.LocationFix

@Entity(
    tableName = "trusted_contacts",
    indices = [Index(value = ["phoneNumber"], unique = true)],
)
data class ContactEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phoneNumber: String,
    val relationship: String,
    val enabled: Boolean,
    /** Outcome of the last "send test SMS". Null until a test has been sent. */
    val lastTestStatus: DeliveryStatus?,
    val lastTestAt: Long?,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(
    tableName = "incidents",
    indices = [
        Index(value = ["idempotencyKey"], unique = true),
        Index(value = ["resolvedAt"]),
    ],
)
data class IncidentEntity(
    @PrimaryKey val id: String,
    val idempotencyKey: String,
    val incidentType: String,
    val status: IncidentStatus,
    val statusDetail: String?,
    val activationMethod: ActivationMethod,
    val silent: Boolean,
    val activatedAt: Long,
    val resolvedAt: Long?,
    val lastLatitude: Double?,
    val lastLongitude: Double?,
    val lastAccuracyM: Float?,
    val lastLocationAt: Long?,
) {
    fun lastFix(): LocationFix? {
        val lat = lastLatitude ?: return null
        val lon = lastLongitude ?: return null
        val at = lastLocationAt ?: return null
        return LocationFix(lat, lon, lastAccuracyM, null, null, at)
    }
}

@Entity(
    tableName = "location_updates",
    foreignKeys = [
        ForeignKey(
            entity = IncidentEntity::class,
            parentColumns = ["id"],
            childColumns = ["incidentId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["incidentId", "timestamp"])],
)
data class LocationUpdateEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val incidentId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyM: Float?,
    val speedMps: Float?,
    val headingDeg: Float?,
    val timestamp: Long,
)

/**
 * One message to one recipient. The recipient's name and number are copied in so the history stays
 * accurate after a contact is edited or deleted. incidentId is null for "test SMS" events.
 */
@Entity(
    tableName = "notification_events",
    foreignKeys = [
        ForeignKey(
            entity = IncidentEntity::class,
            parentColumns = ["id"],
            childColumns = ["incidentId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index(value = ["incidentId"]),
        Index(value = ["dedupeKey"], unique = true),
        Index(value = ["status"]),
    ],
)
data class NotificationEventEntity(
    @PrimaryKey val id: String,
    val incidentId: String?,
    val contactId: String?,
    /** Unique per (incident, recipient, message) so the same message is never queued twice. */
    val dedupeKey: String,
    val kind: EventKind,
    val channel: Channel,
    val recipientName: String,
    val recipientPhone: String,
    val status: DeliveryStatus,
    val failureCode: FailureCode?,
    val attempts: Int,
    val partsTotal: Int,
    val partsSent: Int,
    val partsDelivered: Int,
    val createdAt: Long,
    val attemptedAt: Long?,
    val sentAt: Long?,
    val deliveredAt: Long?,
    val acknowledgedAt: Long?,
)

/** Append-only activity log shown on the incident detail screen. */
@Entity(
    tableName = "audit_events",
    indices = [Index(value = ["incidentId", "timestamp"])],
)
data class AuditEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val incidentId: String?,
    val type: String,
    val detail: String?,
    val timestamp: Long,
)
