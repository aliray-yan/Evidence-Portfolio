package com.ihadrs.mobile.data.models

import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity

data class ThreatEvent(
    val id: String,
    val title: String,
    val description: String,
    val packageName: String? = null,
    val severity: Severity,
    val category: AttackCategory,
    val timestamp: Long,
    val triggeredRules: List<String> = emptyList(),
    val mitreTechniques: List<String> = emptyList(),
    val remediation: List<String> = emptyList(),
    val dismissed: Boolean = false
)
