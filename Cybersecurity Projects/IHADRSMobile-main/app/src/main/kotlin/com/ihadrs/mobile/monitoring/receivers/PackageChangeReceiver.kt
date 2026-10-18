package com.ihadrs.mobile.monitoring.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ihadrs.mobile.data.repository.AppRepository
import com.ihadrs.mobile.data.repository.AppPolicyRepository
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.data.repository.TimelineRepository
import com.ihadrs.mobile.detection.DetectionEngine
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.utils.NotificationHelper
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@AndroidEntryPoint
class PackageChangeReceiver : BroadcastReceiver() {
    @Inject lateinit var appRepository: AppRepository
    @Inject lateinit var appPolicyRepository: AppPolicyRepository
    @Inject lateinit var detectionEngine: DetectionEngine
    @Inject lateinit var threatRepository: ThreatRepository
    @Inject lateinit var timelineRepository: TimelineRepository

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in supportedActions) return
        val pendingResult = goAsync()
        val changedPackage = intent.data?.schemeSpecificPart
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val apps = appRepository.refreshInstalledApps()
                if (intent.action == Intent.ACTION_PACKAGE_ADDED && changedPackage != null) {
                    timelineRepository.record(
                        type = TimelineEventType.APP_INSTALLED,
                        title = "App installed",
                        detail = changedPackage,
                        packageName = changedPackage
                    )
                    val policy = appPolicyRepository.getPolicy(changedPackage)
                    apps.firstOrNull { it.packageName == changedPackage }
                        ?.let { detectionEngine.analyzeApp(it, policy.status) }
                        ?.let { threat ->
                            threatRepository.report(threat)
                            NotificationHelper.showThreatAlert(context, threat)
                        }
                } else if (intent.action == Intent.ACTION_PACKAGE_REMOVED && changedPackage != null) {
                    timelineRepository.record(
                        type = TimelineEventType.APP_REMOVED,
                        title = "App removed",
                        detail = changedPackage,
                        packageName = changedPackage
                    )
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    private companion object {
        val supportedActions = setOf(Intent.ACTION_PACKAGE_ADDED, Intent.ACTION_PACKAGE_REMOVED)
    }
}
