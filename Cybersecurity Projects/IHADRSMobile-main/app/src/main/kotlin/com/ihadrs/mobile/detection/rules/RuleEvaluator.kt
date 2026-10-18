package com.ihadrs.mobile.detection.rules

import com.ihadrs.mobile.data.models.DetectionRule
import javax.inject.Inject

class RuleEvaluator @Inject constructor() {
    fun isEnabled(rule: DetectionRule): Boolean = rule.enabled
}
