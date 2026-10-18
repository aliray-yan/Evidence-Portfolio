package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.AppBehaviorSnapshotEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AppBehaviorDao {
    @Query("SELECT * FROM app_behavior_snapshots WHERE packageName = :packageName ORDER BY capturedAt DESC LIMIT :limit")
    fun observeForPackage(packageName: String, limit: Int = 12): Flow<List<AppBehaviorSnapshotEntity>>

    @Query("SELECT * FROM app_behavior_snapshots WHERE packageName = :packageName ORDER BY capturedAt DESC LIMIT 1")
    suspend fun latestForPackage(packageName: String): AppBehaviorSnapshotEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(snapshot: AppBehaviorSnapshotEntity)

    @Query("DELETE FROM app_behavior_snapshots WHERE id NOT IN (SELECT id FROM app_behavior_snapshots ORDER BY capturedAt DESC LIMIT :keep)")
    suspend fun trim(keep: Int = 3000)
}
