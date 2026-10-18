package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.AppPolicyEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AppPolicyDao {
    @Query("SELECT * FROM app_policies WHERE packageName = :packageName LIMIT 1")
    fun observePolicy(packageName: String): Flow<AppPolicyEntity?>

    @Query("SELECT * FROM app_policies WHERE packageName = :packageName LIMIT 1")
    suspend fun getPolicy(packageName: String): AppPolicyEntity?

    @Query("SELECT * FROM app_policies")
    suspend fun getAll(): List<AppPolicyEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(policy: AppPolicyEntity)

    @Query("DELETE FROM app_policies WHERE packageName = :packageName")
    suspend fun delete(packageName: String)
}
