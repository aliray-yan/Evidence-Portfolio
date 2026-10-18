package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.SocOutboundAlertEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SocOutboundAlertDao {
    @Query("SELECT * FROM soc_outbound_alerts WHERE status = 'QUEUED' ORDER BY createdAt ASC LIMIT :limit")
    suspend fun getQueued(limit: Int): List<SocOutboundAlertEntity>

    @Query("SELECT * FROM soc_outbound_alerts WHERE alertId = :alertId LIMIT 1")
    suspend fun getById(alertId: String): SocOutboundAlertEntity?

    @Query("SELECT COUNT(*) FROM soc_outbound_alerts WHERE status = 'QUEUED'")
    fun observeQueuedCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM soc_outbound_alerts WHERE status = 'SENT'")
    fun observeSentCount(): Flow<Int>

    @Query("SELECT lastError FROM soc_outbound_alerts WHERE lastError IS NOT NULL ORDER BY lastAttemptAt DESC LIMIT 1")
    fun observeLastError(): Flow<String?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(alert: SocOutboundAlertEntity)

    suspend fun markSent(alertId: String, sentAt: Long, secureOpsAlertIds: List<String>) {
        val current = getById(alertId) ?: return
        upsert(
            current.copy(
                status = "SENT",
                lastAttemptAt = sentAt,
                attempts = current.attempts + 1,
                lastError = null,
                secureOpsAlertIds = secureOpsAlertIds
            )
        )
    }

    suspend fun markAttempt(alertId: String, attemptedAt: Long, status: String, error: String) {
        val current = getById(alertId) ?: return
        upsert(
            current.copy(
                status = status,
                lastAttemptAt = attemptedAt,
                attempts = current.attempts + 1,
                lastError = error
            )
        )
    }
}
