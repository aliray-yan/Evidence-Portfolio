package com.ihadrs.mobile.domain.usecases.incidents

import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.models.TimelineEvent
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import javax.inject.Inject

class IncidentBuilder @Inject constructor() {
    fun build(source: IncidentSource): List<Incident> {
        val grouped = source.threats
            .filterNot { it.dismissed }
            .groupBy { it.packageName ?: categoryBucket(it.category) }

        return grouped.map { (bucket, threats) ->
            val packageName = threats.firstNotNullOfOrNull { it.packageName }
            val incidentTimeline = source.timeline
                .filter { event -> packageName == null || event.packageName == packageName || event.threatId in threats.map { it.id } }
                .take(12)
            buildIncident(bucket, packageName, threats, incidentTimeline)
        }.sortedWith(compareByDescending<Incident> { severityRank(it.severity) }.thenByDescending { it.timeline.firstOrNull()?.timestamp ?: 0L })
    }

    fun selfProtectionIncident(reasoning: List<String>): Incident? {
        if (reasoning.isEmpty()) return null
        return Incident(
            id = "self-protection",
            title = "Self-protection needs attention",
            packageName = null,
            severity = Severity.MEDIUM,
            status = "Open",
            summary = "IHADRS protection settings are not fully hardened.",
            threatIds = emptyList(),
            attackChain = listOf(
                AttackChainStep("Protection", "Needs action", reasoning.joinToString("; ")),
                AttackChainStep("Detection", "At risk", "Reduced permissions can weaken monitoring and alerts"),
                AttackChainStep("Response", "Available", "Open Settings and Android controls to harden coverage")
            ),
            reasoning = reasoning,
            responseActions = listOf("Open Settings", "Grant missing permissions", "Allow reliable background operation"),
            timeline = emptyList()
        )
    }

    private fun buildIncident(
        bucket: String,
        packageName: String?,
        threats: List<ThreatEvent>,
        timeline: List<TimelineEvent>
    ): Incident {
        val severity = threats.maxByOrNull { severityRank(it.severity) }?.severity ?: Severity.LOW
        val title = packageName?.let { "App incident: $it" } ?: "Threat incident: ${bucket.replace('_', ' ')}"
        val rules = threats.flatMap { it.triggeredRules }.distinct()
        return Incident(
            id = packageName ?: bucket,
            title = title,
            packageName = packageName,
            severity = severity,
            status = "Open",
            summary = "${threats.size} active finding(s), ${rules.size} rule signal(s)",
            threatIds = threats.map { it.id },
            attackChain = buildAttackChain(threats, timeline),
            reasoning = buildReasoning(threats, rules),
            responseActions = buildResponses(packageName, threats),
            timeline = timeline
        )
    }

    private fun buildAttackChain(threats: List<ThreatEvent>, timeline: List<TimelineEvent>): List<AttackChainStep> {
        val categories = threats.map { it.category }.toSet()
        val rules = threats.flatMap { it.triggeredRules }.toSet()
        return listOf(
            AttackChainStep(
                phase = "Initial Access",
                status = if (rules.any { it.startsWith("SMS") } || rules.contains("APP-001")) "Observed" else "No direct evidence",
                evidence = when {
                    rules.any { it.startsWith("SMS") } -> "Suspicious SMS/link pattern detected"
                    rules.contains("APP-001") -> "Application install/source or trust policy signal"
                    else -> "No initial-access signal in current rules"
                }
            ),
            AttackChainStep(
                phase = "Permission Abuse",
                status = if (categories.any { it == AttackCategory.PRIVILEGE_ESCALATION || it == AttackCategory.DATA_EXFILTRATION }) "Possible" else "Low evidence",
                evidence = threats.flatMap { it.triggeredRules }.filter { it.startsWith("APP") }.distinct().joinToString().ifBlank { "No permission-abuse rule triggered" }
            ),
            AttackChainStep(
                phase = "Collection / Exfiltration",
                status = if (categories.contains(AttackCategory.DATA_EXFILTRATION)) "Possible" else "No direct evidence",
                evidence = threats.firstOrNull { it.category == AttackCategory.DATA_EXFILTRATION }?.description ?: "No data-exfiltration finding recorded"
            ),
            AttackChainStep(
                phase = "Command / Network",
                status = if (rules.any { it.startsWith("NET") }) "Observed" else "Not observed",
                evidence = timeline.firstOrNull { it.type == TimelineEventType.SMS_CHECKED || it.type.name.contains("NETWORK") }?.detail ?: "No suspicious endpoint event in timeline"
            ),
            AttackChainStep(
                phase = "Response",
                status = "Ready",
                evidence = "Dismiss, trust/watch/block, app settings, notification settings, uninstall, and battery controls are available"
            )
        )
    }

    private fun buildReasoning(threats: List<ThreatEvent>, rules: List<String>): List<String> = buildList {
        add("Highest severity: ${threats.maxByOrNull { severityRank(it.severity) }?.severity ?: Severity.LOW}.")
        if (rules.isNotEmpty()) add("Triggered rules: ${rules.joinToString()}.")
        threats.firstOrNull()?.packageName?.let { add("Package involved: $it.") }
        threats.flatMap { it.mitreTechniques }.distinct().takeIf { it.isNotEmpty() }?.let {
            add("Mapped MITRE techniques: ${it.joinToString()}.")
        }
    }

    private fun buildResponses(packageName: String?, threats: List<ThreatEvent>): List<String> = buildList {
        if (packageName != null) {
            add("Open app settings")
            add("Set app policy to Trusted, Watch, or Blocked")
            add("Uninstall if the app is unwanted")
        }
        add("Dismiss incident after review")
        threats.flatMap { it.remediation }.distinct().take(3).forEach(::add)
    }.distinct()

    private fun categoryBucket(category: AttackCategory): String = "category-${category.name}"

    private fun severityRank(severity: Severity): Int = when (severity) {
        Severity.CRITICAL -> 4
        Severity.HIGH -> 3
        Severity.MEDIUM -> 2
        Severity.LOW -> 1
    }
}
