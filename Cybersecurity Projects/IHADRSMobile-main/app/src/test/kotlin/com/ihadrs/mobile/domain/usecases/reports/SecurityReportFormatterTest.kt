package com.ihadrs.mobile.domain.usecases.reports

import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.NetworkEvent
import com.ihadrs.mobile.data.models.ScanRun
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.detection.DetectionReadiness
import com.ihadrs.mobile.detection.ml.ModelStatus
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import org.junit.Assert.assertTrue
import org.junit.Test

class SecurityReportFormatterTest {
    private val formatter = SecurityReportFormatter()

    @Test
    fun format_includesCoreSections() {
        val report = SecurityReport(
            generatedAt = 1_700_000_000_000L,
            threats = listOf(
                ThreatEvent(
                    id = "t1",
                    title = "Possible phishing SMS",
                    description = "Suspicious link.",
                    severity = Severity.HIGH,
                    category = AttackCategory.PHISHING,
                    timestamp = 1_700_000_000_000L,
                    triggeredRules = listOf("SMS-001"),
                    remediation = listOf("Do not open the link")
                )
            ),
            riskyApps = listOf(
                AppInfo(
                    packageName = "example.bad",
                    appName = "Bad Example",
                    versionName = "1",
                    installTime = 0L,
                    updateTime = 0L,
                    riskScore = 80
                )
            ),
            networkEvents = listOf(
                NetworkEvent(
                    id = "n1",
                    host = "login-verify.example",
                    ipAddress = null,
                    port = 443,
                    protocol = "HTTPS",
                    timestamp = 1_700_000_000_000L,
                    suspicious = true,
                    riskScore = 85,
                    reasons = listOf("domain is on the local blocklist")
                )
            ),
            scans = listOf(
                ScanRun(
                    id = "s1",
                    startedAt = 1L,
                    finishedAt = 2L,
                    scannedApps = 10,
                    findings = 1,
                    status = "COMPLETED"
                )
            ),
            readiness = DetectionReadiness(
                ruleCount = 50,
                modelStatus = ModelStatus(false, "rules-only mode"),
                mode = "Rules only"
            )
        )

        val text = formatter.format(report)

        assertTrue(text.contains("Threat Summary"))
        assertTrue(text.contains("Active threats: 1"))
        assertTrue(text.contains("Risky Apps"))
        assertTrue(text.contains("Network Evidence"))
        assertTrue(text.contains("Recent Scans"))
        assertTrue(text.contains("Possible phishing SMS"))
        assertTrue(text.contains("Bad Example"))
        assertTrue(text.contains("login-verify.example"))
    }
}
