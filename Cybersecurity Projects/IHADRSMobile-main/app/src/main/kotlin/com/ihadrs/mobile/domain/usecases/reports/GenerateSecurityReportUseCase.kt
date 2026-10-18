package com.ihadrs.mobile.domain.usecases.reports

import com.ihadrs.mobile.data.repository.AppRepository
import com.ihadrs.mobile.data.repository.NetworkRepository
import com.ihadrs.mobile.data.repository.ScanRepository
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.detection.DetectionEngine
import javax.inject.Inject

class GenerateSecurityReportUseCase @Inject constructor(
    private val threatRepository: ThreatRepository,
    private val appRepository: AppRepository,
    private val networkRepository: NetworkRepository,
    private val scanRepository: ScanRepository,
    private val detectionEngine: DetectionEngine,
    private val formatter: SecurityReportFormatter
) {
    suspend operator fun invoke(): String {
        val threats = threatRepository.getActiveThreats()
        val apps = appRepository.getCachedApps()
        val report = SecurityReport(
            generatedAt = System.currentTimeMillis(),
            threats = threats,
            riskyApps = apps
                .filter { it.riskScore >= RISKY_APP_THRESHOLD && (it.fromUnknownSource || !it.systemApp) }
                .sortedByDescending { it.riskScore },
            networkEvents = networkRepository.getRecent(),
            scans = scanRepository.getRecentScans(),
            readiness = detectionEngine.readiness()
        )
        return formatter.format(report)
    }

    private companion object {
        const val RISKY_APP_THRESHOLD = 70
    }
}
