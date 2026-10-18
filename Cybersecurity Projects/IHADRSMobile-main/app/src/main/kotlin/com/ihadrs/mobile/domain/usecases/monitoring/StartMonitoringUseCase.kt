package com.ihadrs.mobile.domain.usecases.monitoring

import android.content.Context
import android.content.Intent
import android.os.Build
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.TimelineRepository
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.monitoring.service.MonitoringService
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class StartMonitoringUseCase @Inject constructor(
    @ApplicationContext private val context: Context,
    private val settingsRepository: SettingsRepository,
    private val timelineRepository: TimelineRepository
) {
    suspend operator fun invoke() {
        settingsRepository.setMonitoringEnabled(true)
        timelineRepository.record(TimelineEventType.MONITORING_CHANGED, "Monitoring started", "Live EDR monitoring was enabled")
        startService()
    }

    fun startFromReceiver() {
        CoroutineScope(Dispatchers.Default).launch {
            settingsRepository.setMonitoringEnabled(true)
            timelineRepository.record(TimelineEventType.MONITORING_CHANGED, "Monitoring started", "Live EDR monitoring resumed after boot")
            startService()
        }
    }

    private fun startService() {
        val intent = Intent(context, MonitoringService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }
}
