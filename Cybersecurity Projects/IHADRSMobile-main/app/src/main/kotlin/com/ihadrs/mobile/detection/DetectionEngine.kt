package com.ihadrs.mobile.detection

import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.AppPolicyStatus
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.detection.analyzers.AppAnalyzer
import com.ihadrs.mobile.detection.ml.ModelStatus
import com.ihadrs.mobile.detection.ml.TFLiteClassifier
import com.ihadrs.mobile.detection.rules.RuleEngine
import javax.inject.Inject

data class DetectionReadiness(
    val ruleCount: Int,
    val modelStatus: ModelStatus,
    val mode: String
)

class DetectionEngine @Inject constructor(
    private val appAnalyzer: AppAnalyzer,
    private val ruleEngine: RuleEngine,
    private val classifier: TFLiteClassifier
) {
    fun analyzeApp(appInfo: AppInfo, policyStatus: AppPolicyStatus = AppPolicyStatus.DEFAULT): ThreatEvent? =
        appAnalyzer.analyze(appInfo, policyStatus)

    fun readiness(): DetectionReadiness {
        val modelStatus = classifier.status
        return DetectionReadiness(
            ruleCount = ruleEngine.ruleCount(),
            modelStatus = modelStatus,
            mode = if (modelStatus.available) "Rules + ML" else "Rules only"
        )
    }
}
