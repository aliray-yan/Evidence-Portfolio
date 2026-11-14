package com.safehaven.app.emergency

import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.safehaven.app.SafeHavenApplication

/**
 * Backstop for the foreground service: sends and retries the first alerts for the active incident.
 * It is never the primary path; the service is. It exists so an alert is not stranded if Android
 * refuses to start the service (for example from the background after a reboot).
 */
class DispatchWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val container = (applicationContext as SafeHavenApplication).container
        val active = container.incidents.getActive() ?: return Result.success()
        container.dispatcher.syncAndSend(active.id)
        return if (container.incidents.hasOpenWork(active.id)) Result.retry() else Result.success()
    }

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val notification = Notifications.foreground(applicationContext, silent = true, text = "Sending alerts")
        return if (Build.VERSION.SDK_INT >= 29) {
            ForegroundInfo(Notifications.ID_WORKER, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(Notifications.ID_WORKER, notification)
        }
    }
}
