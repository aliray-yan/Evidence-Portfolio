package com.ihadrs.mobile.monitoring.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.monitoring.monitors.MonitorOrchestrator
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MonitoringService : Service() {
    @Inject lateinit var orchestrator: MonitorOrchestrator
    @Inject lateinit var settingsRepository: SettingsRepository
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == Constants.ACTION_STOP_MONITORING) {
            serviceScope.launch {
                settingsRepository.setMonitoringEnabled(false)
                orchestrator.stopAll()
                stopSelf(startId)
            }
            return START_NOT_STICKY
        }
        startForeground(Constants.MONITORING_NOTIFICATION_ID, MonitoringNotification.build(this))
        serviceScope.launch { orchestrator.startAll() }
        return START_STICKY
    }

    override fun onDestroy() {
        serviceScope.launch { orchestrator.stopAll() }
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
