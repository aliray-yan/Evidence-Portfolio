package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.ScanRunEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ScanRunDao {
    @Query("SELECT * FROM scan_runs ORDER BY finishedAt DESC LIMIT 50")
    fun observeRecent(): Flow<List<ScanRunEntity>>

    @Query("SELECT * FROM scan_runs ORDER BY finishedAt DESC LIMIT :limit")
    suspend fun getRecent(limit: Int): List<ScanRunEntity>

    @Query("SELECT * FROM scan_runs ORDER BY finishedAt DESC LIMIT 1")
    fun observeLatest(): Flow<ScanRunEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(scanRun: ScanRunEntity)
}
