package com.ihadrs.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ihadrs.mobile.data.local.entities.FileEventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FileEventDao {
    @Query("SELECT * FROM file_events ORDER BY timestamp DESC LIMIT 200")
    fun observeRecent(): Flow<List<FileEventEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: FileEventEntity)
}
