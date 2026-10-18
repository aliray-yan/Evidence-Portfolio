package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.SmsEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SmsEventDao {
    @Query("SELECT * FROM sms_events ORDER BY timestamp DESC LIMIT 200")
    fun observeRecent(): Flow<List<SmsEventEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: SmsEventEntity)
}
