package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.ThreatEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ThreatEventDao {
    @Query("SELECT * FROM threat_events ORDER BY timestamp DESC")
    fun observeAll(): Flow<List<ThreatEventEntity>>

    @Query("SELECT * FROM threat_events ORDER BY timestamp DESC")
    suspend fun getAll(): List<ThreatEventEntity>

    @Query("SELECT * FROM threat_events WHERE dismissed = 0 ORDER BY timestamp DESC")
    suspend fun getActive(): List<ThreatEventEntity>

    @Query("SELECT * FROM threat_events WHERE id = :id LIMIT 1")
    fun observeById(id: String): Flow<ThreatEventEntity?>

    @Query("SELECT * FROM threat_events WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ThreatEventEntity?

    @Query("SELECT COUNT(*) FROM threat_events WHERE dismissed = 0")
    fun observeActiveCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(event: ThreatEventEntity)

    @Query("UPDATE threat_events SET dismissed = 1 WHERE id = :id")
    suspend fun dismiss(id: String)

    @Query("UPDATE threat_events SET dismissed = 1 WHERE triggeredRules LIKE '%' || :ruleId || '%'")
    suspend fun dismissByRule(ruleId: String)

    @Query("DELETE FROM threat_events")
    suspend fun clear()
}
