package com.safehaven.app.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ContactDao {
    @Query("SELECT * FROM trusted_contacts ORDER BY createdAt ASC")
    fun observeAll(): Flow<List<ContactEntity>>

    @Query("SELECT * FROM trusted_contacts WHERE enabled = 1 ORDER BY createdAt ASC")
    suspend fun getEnabled(): List<ContactEntity>

    @Query("SELECT * FROM trusted_contacts WHERE id = :id")
    suspend fun getById(id: String): ContactEntity?

    @Query("SELECT * FROM trusted_contacts WHERE phoneNumber = :phone LIMIT 1")
    suspend fun getByPhone(phone: String): ContactEntity?

    @Upsert
    suspend fun upsert(contact: ContactEntity)

    @Query("UPDATE trusted_contacts SET enabled = :enabled, updatedAt = :at WHERE id = :id")
    suspend fun setEnabled(id: String, enabled: Boolean, at: Long)

    @Query("DELETE FROM trusted_contacts WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE trusted_contacts SET lastTestStatus = :status, lastTestAt = :at WHERE id = :id")
    suspend fun setTestResult(id: String, status: String?, at: Long?)
}

@Dao
interface IncidentDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(incident: IncidentEntity): Long

    @Query("SELECT * FROM incidents WHERE resolvedAt IS NULL ORDER BY activatedAt DESC LIMIT 1")
    suspend fun getActive(): IncidentEntity?

    @Query("SELECT * FROM incidents WHERE resolvedAt IS NULL ORDER BY activatedAt DESC LIMIT 1")
    fun observeActive(): Flow<IncidentEntity?>

    @Query("SELECT * FROM incidents WHERE id = :id")
    suspend fun getById(id: String): IncidentEntity?

    @Query("SELECT * FROM incidents WHERE id = :id")
    fun observeById(id: String): Flow<IncidentEntity?>

    @Query("SELECT * FROM incidents WHERE idempotencyKey = :key LIMIT 1")
    suspend fun getByIdempotencyKey(key: String): IncidentEntity?

    @Query("SELECT * FROM incidents ORDER BY activatedAt DESC")
    fun observeAll(): Flow<List<IncidentEntity>>

    @Query("UPDATE incidents SET status = :status, statusDetail = :detail WHERE id = :id")
    suspend fun setStatus(id: String, status: String, detail: String?)

    @Query(
        "UPDATE incidents SET lastLatitude = :lat, lastLongitude = :lon, lastAccuracyM = :accuracy, " +
            "lastLocationAt = :at WHERE id = :id",
    )
    suspend fun setLastLocation(id: String, lat: Double, lon: Double, accuracy: Float?, at: Long)

    @Query("UPDATE incidents SET status = :status, statusDetail = NULL, resolvedAt = :at WHERE id = :id")
    suspend fun resolve(id: String, status: String, at: Long)

    @Query("DELETE FROM incidents WHERE id = :id AND resolvedAt IS NOT NULL")
    suspend fun deleteResolved(id: String): Int
}

@Dao
interface LocationDao {
    @Insert
    suspend fun insert(update: LocationUpdateEntity)

    @Query("SELECT * FROM location_updates WHERE incidentId = :incidentId ORDER BY timestamp ASC")
    fun observeForIncident(incidentId: String): Flow<List<LocationUpdateEntity>>
}

@Dao
interface EventDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnore(event: NotificationEventEntity): Long

    @Query("SELECT * FROM notification_events WHERE incidentId = :incidentId ORDER BY createdAt ASC, id ASC")
    fun observeForIncident(incidentId: String): Flow<List<NotificationEventEntity>>

    @Query("SELECT * FROM notification_events WHERE incidentId = :incidentId ORDER BY createdAt ASC, id ASC")
    suspend fun getForIncident(incidentId: String): List<NotificationEventEntity>

    @Query("SELECT * FROM notification_events WHERE id = :id")
    suspend fun getById(id: String): NotificationEventEntity?

    /** Atomically takes ownership of an event so two workers can never send the same message. */
    @Query(
        "UPDATE notification_events SET status = 'SENDING', attempts = attempts + 1, attemptedAt = :at, " +
            "partsTotal = :parts, partsSent = 0, partsDelivered = 0, failureCode = NULL " +
            "WHERE id = :id AND status IN ('PENDING', 'FAILED')",
    )
    suspend fun claim(id: String, at: Long, parts: Int): Int

    @Query("UPDATE notification_events SET partsSent = partsSent + 1 WHERE id = :id")
    suspend fun incrementPartsSent(id: String)

    @Query("UPDATE notification_events SET partsDelivered = partsDelivered + 1 WHERE id = :id")
    suspend fun incrementPartsDelivered(id: String)

    @Query("UPDATE notification_events SET status = 'SENT', sentAt = :at WHERE id = :id AND status = 'SENDING'")
    suspend fun markSent(id: String, at: Long)

    @Query(
        "UPDATE notification_events SET status = 'DELIVERED', deliveredAt = :at " +
            "WHERE id = :id AND status IN ('SENDING', 'SENT')",
    )
    suspend fun markDelivered(id: String, at: Long)

    @Query(
        "UPDATE notification_events SET status = 'FAILED', failureCode = :code " +
            "WHERE id = :id AND status IN ('PENDING', 'SENDING', 'SENT', 'FAILED')",
    )
    suspend fun markFailed(id: String, code: String)
}

@Dao
interface AuditDao {
    @Insert
    suspend fun insert(event: AuditEventEntity)

    @Query("SELECT * FROM audit_events WHERE incidentId = :incidentId ORDER BY timestamp ASC, id ASC")
    fun observeForIncident(incidentId: String): Flow<List<AuditEventEntity>>

    @Query("DELETE FROM audit_events WHERE incidentId = :incidentId")
    suspend fun deleteForIncident(incidentId: String)
}
