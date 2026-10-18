package com.ihadrs.mobile.domain.usecases.incidents

import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.models.TimelineEvent
import com.ihadrs.mobile.domain.models.Severity

data class Incident(
    val id: String,
    val title: String,
    val packageName: String?,
    val severity: Severity,
    val status: String,
    val summary: String,
    val threatIds: List<String>,
    val attackChain: List<AttackChainStep>,
    val reasoning: List<String>,
    val responseActions: List<String>,
    val timeline: List<TimelineEvent>
)

data class AttackChainStep(
    val phase: String,
    val status: String,
    val evidence: String
)

data class IncidentSource(
    val threats: List<ThreatEvent>,
    val timeline: List<TimelineEvent>
)
