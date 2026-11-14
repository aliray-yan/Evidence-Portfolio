package com.safehaven.app.emergency

import android.Manifest
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.safehaven.app.AppContainer
import com.safehaven.app.SafeHavenApplication
import com.safehaven.app.data.prefs.AppSettings
import com.safehaven.app.domain.IncidentStatus
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

/**
 * Keeps an active SOS alive while the app is in the background: sends the first alerts, retries
 * failures, records the GPS track and sends periodic location updates. It stops itself as soon as
 * the incident is resolved. All state lives in the database, so a restart loses nothing.
 */
class EmergencyService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var loop: Job? = null

    private val container: AppContainer
        get() = (application as SafeHavenApplication).container

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Read synchronously (a few ms) so a silent SOS never flashes a loud notification first.
        val silent = runBlocking { container.incidents.getActive()?.silent ?: false }
        if (!enterForeground(silent)) {
            // Android refused to let us run in the foreground; fall back to the WorkManager backstop.
            Notifications.showResumePrompt(this)
            container.controller.scheduleBackstop()
            stopSelf()
            return START_NOT_STICKY
        }
        if (loop?.isActive != true) loop = scope.launch { runIncident() }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun enterForeground(silent: Boolean): Boolean {
        val hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        // Android 14+ refuses a location-type service when location permission is missing.
        val type = if (hasLocation) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        } else {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        }
        return try {
            ServiceCompat.startForeground(
                this,
                Notifications.ID_FOREGROUND,
                Notifications.foreground(
                    this,
                    silent = silent,
                    text = if (silent) "Protection active" else "Alerting your trusted contacts",
                ),
                type,
            )
            true
        } catch (t: Throwable) {
            Log.e(TAG, "startForeground was refused", t)
            false
        }
    }

    private suspend fun runIncident() {
        val c = container
        val incident = c.incidents.getActive()
        if (incident == null) {
            stopSelf()
            return
        }
        val incidentId = incident.id
        val settings = c.settings.current()
        updateNotification(incident.status, incident.silent)

        // 1. First alerts. Runs in parallel with GPS tracking so neither waits for the other.
        val needsFollowUp = AtomicBoolean(false)
        val firstAlerts = scope.launch {
            try {
                needsFollowUp.set(c.dispatcher.dispatchInitial(incidentId))
            } catch (t: Throwable) {
                Log.e(TAG, "Initial dispatch failed", t)
                c.incidents.log(incidentId, "DISPATCH_ERROR", t.javaClass.simpleName)
            }
        }

        // 2. GPS track + periodic location SMS.
        val tracking = scope.launch { trackLocation(incidentId, settings, needsFollowUp) }

        // 3. Retry anything that failed, with backoff.
        val retries = scope.launch {
            while (isActive) {
                delay(RETRY_TICK_MS)
                try {
                    c.dispatcher.syncAndSend(incidentId)
                } catch (t: Throwable) {
                    Log.e(TAG, "Retry pass failed", t)
                }
            }
        }

        // 4. Mirror the status in the notification and stop when the SOS is over.
        try {
            c.incidents.observeActive().collect { active ->
                if (active == null || active.id != incidentId) {
                    throw EndOfIncident()
                }
                updateNotification(active.status, active.silent)
            }
        } catch (e: EndOfIncident) {
            // Normal end: fall through to cleanup.
        } finally {
            firstAlerts.cancel()
            tracking.cancel()
            retries.cancel()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private suspend fun trackLocation(incidentId: String, settings: AppSettings, needsFollowUp: AtomicBoolean) {
        val c = container
        if (!c.location.hasPermission()) {
            c.incidents.log(incidentId, "LOCATION_UNAVAILABLE", "Location permission not granted")
            return
        }
        if (!c.location.servicesEnabled()) {
            c.incidents.log(incidentId, "LOCATION_UNAVAILABLE", "Location services are switched off")
        }
        val intervalMs = settings.updateIntervalMinutes * 60_000L
        var lastSmsAt = System.currentTimeMillis()
        c.location.updates(GPS_INTERVAL_MS)
            .catch { e -> c.incidents.log(incidentId, "LOCATION_ERROR", e.javaClass.simpleName) }
            .collect { fix ->
                c.incidents.recordLocation(incidentId, fix)
                val intervalElapsed = intervalMs > 0 && System.currentTimeMillis() - lastSmsAt >= intervalMs
                val followUpDue = needsFollowUp.compareAndSet(true, false)
                if (intervalElapsed || followUpDue) {
                    try {
                        c.dispatcher.sendLocationUpdate(incidentId)
                    } catch (t: Throwable) {
                        Log.e(TAG, "Location update failed", t)
                    }
                    lastSmsAt = System.currentTimeMillis()
                }
            }
    }

    private fun updateNotification(status: IncidentStatus, silent: Boolean) {
        val text = when (status) {
            IncidentStatus.CREATED, IncidentStatus.QUEUED -> "Preparing alerts"
            IncidentStatus.SENDING -> "Sending alerts"
            IncidentStatus.SENT -> "Alerts sent, delivery not yet confirmed"
            IncidentStatus.PARTIALLY_DELIVERED -> "Alerts delivered to some contacts"
            IncidentStatus.DELIVERED, IncidentStatus.ACKNOWLEDGED -> "Alerts delivered"
            IncidentStatus.ESCALATED -> "Escalated"
            IncidentStatus.FAILED -> "Alerts failed. Open the app"
            IncidentStatus.RESOLVED -> "Ended"
        }
        val shown = if (silent) "Protection active" else text
        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager?.notify(Notifications.ID_FOREGROUND, Notifications.foreground(this, silent, shown))
    }

    private class EndOfIncident : RuntimeException()

    companion object {
        const val ACTION_START = "com.safehaven.app.action.START_INCIDENT"
        private const val TAG = "EmergencyService"
        private const val RETRY_TICK_MS = 10_000L
        private const val GPS_INTERVAL_MS = 10_000L
    }
}
