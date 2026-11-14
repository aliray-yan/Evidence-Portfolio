package com.safehaven.app.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ContactEntity::class,
        IncidentEntity::class,
        LocationUpdateEntity::class,
        NotificationEventEntity::class,
        AuditEventEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class SafeHavenDatabase : RoomDatabase() {
    abstract fun contacts(): ContactDao
    abstract fun incidents(): IncidentDao
    abstract fun locations(): LocationDao
    abstract fun events(): EventDao
    abstract fun audit(): AuditDao

    companion object {
        fun build(context: Context): SafeHavenDatabase =
            Room.databaseBuilder(context.applicationContext, SafeHavenDatabase::class.java, "safehaven.db")
                .build()
    }
}
