package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.NetworkFlowEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NetworkFlowDao {
    @Query("SELECT * FROM network_flows ORDER BY timestampStart DESC LIMIT :limit")
    fun observeLatest(limit: Int = 200): Flow<List<NetworkFlowEntity>>

    @Query("SELECT * FROM network_flows WHERE riskScore >= :minimumRisk ORDER BY timestampStart DESC LIMIT :limit")
    fun observeHighRisk(minimumRisk: Int = 51, limit: Int = 100): Flow<List<NetworkFlowEntity>>

    @Query("SELECT * FROM network_flows WHERE appPackage = :packageName ORDER BY timestampStart DESC LIMIT :limit")
    suspend fun getByApp(packageName: String, limit: Int = 100): List<NetworkFlowEntity>

    @Query("SELECT * FROM network_flows WHERE destinationIp = :destination OR destinationDomain = :destination ORDER BY timestampStart DESC LIMIT :limit")
    suspend fun getByDestination(destination: String, limit: Int = 100): List<NetworkFlowEntity>

    @Query("SELECT * FROM network_flows WHERE appPackage = :packageName AND destinationDomain = :domain ORDER BY timestampStart ASC")
    suspend fun getAppDomainHistory(packageName: String, domain: String): List<NetworkFlowEntity>

    @Query("SELECT * FROM network_flows WHERE appPackage = :packageName AND timestampStart >= :since ORDER BY timestampStart ASC")
    suspend fun getRecentByApp(packageName: String, since: Long): List<NetworkFlowEntity>

    @Query("SELECT * FROM network_flows WHERE destinationIp = :ip AND destinationDomain IS NOT NULL ORDER BY timestampStart DESC LIMIT 1")
    suspend fun getLatestDomainForIp(ip: String): NetworkFlowEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(flow: NetworkFlowEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(flows: List<NetworkFlowEntity>)

    @Query("DELETE FROM network_flows WHERE timestampStart < :cutoff")
    suspend fun deleteOlderThan(cutoff: Long)

    @Query("DELETE FROM network_flows")
    suspend fun deleteAll()
}

