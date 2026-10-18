package com.ihadrs.mobile.domain.usecases.reports

import com.ihadrs.mobile.core.asReadableTime
import javax.inject.Inject

class SecurityReportFormatter @Inject constructor() {
    fun format(report: SecurityReport): String = buildString {
        appendLine("IHADRS Mobile Security Report")
        appendLine("Generated: ${report.generatedAt.asReadableTime()}")
        appendLine()

        appendLine("Detection Engine")
        appendLine("- Mode: ${report.readiness.mode}")
        appendLine("- Rules loaded: ${report.readiness.ruleCount}")
        appendLine("- ML status: ${report.readiness.modelStatus.reason}")
        appendLine()

        appendLine("Threat Summary")
        appendLine("- Active threats: ${report.threats.size}")
        appendLine("- Critical/high active threats: ${report.threats.count { it.severity.name in setOf("CRITICAL", "HIGH") }}")
        appendLine()

        appendLine("Recent Threats")
        if (report.threats.isEmpty()) {
            appendLine("- None recorded")
        } else {
            report.threats.take(10).forEach { threat ->
                appendLine("- [${threat.severity}] ${threat.title} (${threat.timestamp.asReadableTime()})")
                appendLine("  ${threat.description}")
                if (threat.packageName != null) appendLine("  Package: ${threat.packageName}")
                if (threat.triggeredRules.isNotEmpty()) appendLine("  Rules: ${threat.triggeredRules.joinToString()}")
                if (threat.remediation.isNotEmpty()) appendLine("  Actions: ${threat.remediation.joinToString("; ")}")
            }
        }
        appendLine()

        appendLine("Risky Apps")
        if (report.riskyApps.isEmpty()) {
            appendLine("- No apps currently above the risk threshold")
        } else {
            report.riskyApps.take(10).forEach { app ->
                appendLine("- ${app.appName} (${app.packageName})")
                appendLine("  Risk: ${app.riskScore}/100; Permissions: ${app.requestedPermissions.size}; System app: ${app.systemApp}; Outside trusted installer: ${app.fromUnknownSource}")
            }
        }
        appendLine()

        appendLine("Network Evidence")
        if (report.networkEvents.isEmpty()) {
            appendLine("- No network endpoint checks recorded")
        } else {
            report.networkEvents.take(10).forEach { event ->
                appendLine("- ${event.host}: ${event.riskScore}/100 via ${event.protocol} (${event.timestamp.asReadableTime()})")
                if (event.reasons.isNotEmpty()) appendLine("  Reason: ${event.reasons.take(3).joinToString("; ")}")
            }
        }
        appendLine()

        appendLine("Recent Scans")
        if (report.scans.isEmpty()) {
            appendLine("- No scans recorded")
        } else {
            report.scans.take(10).forEach { scan ->
                appendLine("- ${scan.finishedAt.asReadableTime()}: ${scan.scannedApps} apps checked, ${scan.findings} finding(s), ${scan.status}")
            }
        }
        appendLine()
        appendLine("Privacy note: this report was generated locally on the device.")
    }
}
