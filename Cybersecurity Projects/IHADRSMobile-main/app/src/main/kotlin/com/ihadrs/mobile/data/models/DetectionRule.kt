package com.ihadrs.mobile.data.models

import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity

data class DetectionRule(
    val id: String,
    val name: String,
    val description: String,
    val severity: Severity,
    val category: AttackCategory,
    val mitreTechnique: String,
    val enabled: Boolean = true
)
