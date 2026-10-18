package com.ihadrs.mobile.monitoring.workers

import android.content.Context
import androidx.room.Room
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.local.database.AppDatabase
import com.ihadrs.mobile.data.local.preferences.SettingsDataStore
import com.ihadrs.mobile.data.remote.SocIngestClient
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.SocIntegrationRepository

class SocSyncWorker(
    context: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(context, workerParameters) {
    override suspend fun doWork(): Result {
        val database = Room.databaseBuilder(applicationContext, AppDatabase::class.java, Constants.DATABASE_NAME)
            .fallbackToDestructiveMigration()
            .build()
        return try {
            val gson = Gson()
            val repository = SocIntegrationRepository(
                context = applicationContext,
                dao = database.socOutboundAlertDao(),
                settingsRepository = SettingsRepository(SettingsDataStore(applicationContext)),
                client = SocIngestClient(gson),
                gson = gson
            )
            val result = repository.syncQueued()
            when {
                result.ok -> Result.success()
                result.message.contains("disabled", ignoreCase = true) -> Result.success()
                result.message.contains("not configured", ignoreCase = true) -> Result.success()
                else -> Result.retry()
            }
        } finally {
            database.close()
        }
    }
}
