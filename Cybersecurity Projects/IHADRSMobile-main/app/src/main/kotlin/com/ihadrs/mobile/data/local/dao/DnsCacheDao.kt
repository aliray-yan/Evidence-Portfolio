package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.DnsCacheEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DnsCacheDao {
    @Query("SELECT * FROM dns_cache WHERE ipAddress = :ipAddress ORDER BY lastSeen DESC LIMIT 1")
    suspend fun getLatestByIp(ipAddress: String): DnsCacheEntity?

    @Query("SELECT * FROM dns_cache ORDER BY lastSeen DESC LIMIT :limit")
    fun observeRecent(limit: Int = 100): Flow<List<DnsCacheEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: DnsCacheEntity)

    @Query("DELETE FROM dns_cache WHERE lastSeen < :cutoff")
    suspend fun deleteOlderThan(cutoff: Long)

    @Query("DELETE FROM dns_cache")
    suspend fun deleteAll()
}

