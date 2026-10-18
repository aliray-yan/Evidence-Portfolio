package com.ihadrs.mobile.domain.usecases.monitoring

import android.content.Context
import android.content.Intent
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.TimelineRepository
import com.ihadrs.mobile.monitoring.service.MonitoringService
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class StopMonitoringUseCase @Inject constructor(
    @ApplicationContext private val context: Context,
    private val settingsRepository: SettingsRepository,
    private val timelineRepository: TimelineRepository
) {
    suspend operator fun invoke() {
        settingsRepository.setMonitoringEnabled(false)
        timelineRepository.record(TimelineEventType.MONITORING_CHANGED, "Monitoring stopped", "Live EDR monitoring was paused")
        context.stopService(Intent(context, MonitoringService::class.java))
    }
}
