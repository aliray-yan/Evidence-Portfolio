package com.ihadrs.mobile.domain.usecases.reports

import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.NetworkEvent
import com.ihadrs.mobile.data.models.ScanRun
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.detection.DetectionReadiness

data class SecurityReport(
    val generatedAt: Long,
    val threats: List<ThreatEvent>,
    val riskyApps: List<AppInfo>,
    val networkEvents: List<NetworkEvent>,
    val scans: List<ScanRun>,
    val readiness: DetectionReadiness
)
