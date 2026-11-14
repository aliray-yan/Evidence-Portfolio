package com.safehaven.app.emergency

import android.content.Context
import android.content.Intent
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.BackoffPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/** Starts the foreground service and, when Android refuses that, schedules the WorkManager backstop. */
class EmergencyController(private val context: Context) {

    /** Returns true when the foreground service was started. */
    fun start(): Boolean = try {
        ContextCompat.startForegroundService(
            context,
            Intent(context, EmergencyService::class.java).setAction(EmergencyService.ACTION_START),
        )
        true
    } catch (t: Throwable) {
        Log.e(TAG, "Could not start the emergency service", t)
        scheduleBackstop()
        false
    }

    /** Used after a reboot or app update: try the service, and tell the user if Android blocks it. */
    fun resumeAfterRestart() {
        if (!start()) Notifications.showResumePrompt(context)
    }

    /** An expedited job that keeps sending and retrying alerts even if the service cannot run. */
    fun scheduleBackstop() {
        val request = OneTimeWorkRequestBuilder<DispatchWorker>()
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.KEEP, request)
    }

    /** One short buzz so a non-silent activation is felt even if the screen is not being watched. */
    @Suppress("DEPRECATION")
    fun vibrateOnce() {
        val vibrator = context.getSystemService(Vibrator::class.java) ?: return
        if (vibrator.hasVibrator()) {
            vibrator.vibrate(VibrationEffect.createOneShot(400, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }

    private companion object {
        const val TAG = "EmergencyController"
        const val WORK_NAME = "safehaven_dispatch_backstop"
    }
}
