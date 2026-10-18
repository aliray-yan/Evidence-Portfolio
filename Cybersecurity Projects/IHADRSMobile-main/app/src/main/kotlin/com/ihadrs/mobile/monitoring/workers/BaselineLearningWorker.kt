package com.ihadrs.mobile.monitoring.workers

import android.content.Context
import androidx.room.Room
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.local.database.AppDatabase
import com.ihadrs.mobile.data.local.preferences.SettingsDataStore
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.data.repository.TimelineRepository
import java.util.concurrent.TimeUnit

class BaselineLearningWorker(
    context: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(context, workerParameters) {
    override suspend fun doWork(): Result {
        val learnedAt = System.currentTimeMillis()
        SettingsDataStore(applicationContext).setBaselineLearned(learnedAt)
        val database = Room.databaseBuilder(applicationContext, AppDatabase::class.java, Constants.DATABASE_NAME)
            .fallbackToDestructiveMigration()
            .build()
        try {
            TimelineRepository(database.timelineEventDao()).record(
                type = TimelineEventType.BASELINE_LEARNING_COMPLETED,
                title = "Baseline learning completed",
                detail = "The 10-minute learning window finished in the background."
            )
        } finally {
            database.close()
        }
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "baseline_learning_completion"

        fun schedule(context: Context) {
            val request = OneTimeWorkRequestBuilder<BaselineLearningWorker>()
                .setInitialDelay(10, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}
