package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.NetworkEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NetworkEventDao {
    @Query("SELECT * FROM network_events ORDER BY timestamp DESC LIMIT 200")
    fun observeRecent(): Flow<List<NetworkEventEntity>>

    @Query("SELECT * FROM network_events ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecent(limit: Int = 50): List<NetworkEventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: NetworkEventEntity)
}
