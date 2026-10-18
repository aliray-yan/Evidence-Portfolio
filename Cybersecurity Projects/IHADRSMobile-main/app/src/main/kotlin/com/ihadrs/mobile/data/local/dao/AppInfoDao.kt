package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.AppInfoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AppInfoDao {
    @Query("SELECT * FROM apps ORDER BY riskScore DESC, appName ASC")
    fun observeApps(): Flow<List<AppInfoEntity>>

    @Query("SELECT * FROM apps WHERE packageName = :packageName LIMIT 1")
    fun observeApp(packageName: String): Flow<AppInfoEntity?>

    @Query("SELECT * FROM apps ORDER BY riskScore DESC, appName ASC")
    suspend fun getApps(): List<AppInfoEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(apps: List<AppInfoEntity>)

    @Query("SELECT COUNT(*) FROM apps")
    fun observeCount(): Flow<Int>
}
