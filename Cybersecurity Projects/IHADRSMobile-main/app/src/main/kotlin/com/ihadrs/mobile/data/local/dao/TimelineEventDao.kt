package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.TimelineEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TimelineEventDao {
    @Query("SELECT * FROM timeline_events ORDER BY timestamp DESC LIMIT :limit")
    fun observeRecent(limit: Int = 100): Flow<List<TimelineEventEntity>>

    @Query("SELECT * FROM timeline_events ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecent(limit: Int = 100): List<TimelineEventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: TimelineEventEntity)

    @Query("DELETE FROM timeline_events WHERE id NOT IN (SELECT id FROM timeline_events ORDER BY timestamp DESC LIMIT :keep)")
    suspend fun trim(keep: Int = 300)
}
