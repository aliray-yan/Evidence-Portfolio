package com.ihadrs.mobile.detection.rules

import android.content.Context
import com.ihadrs.mobile.R
import com.ihadrs.mobile.data.models.DetectionRule
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RuleEngine @Inject constructor(
    @ApplicationContext private val context: Context,
    private val parser: RuleParser
) {
    fun rules(): List<DetectionRule> =
        runCatching {
            context.resources.openRawResource(R.raw.rules).bufferedReader().use { reader ->
                parser.parse(reader.readText())
            }
        }.getOrElse { fallbackRules() }
            .ifEmpty { fallbackRules() }

    fun ruleCount(): Int = rules().size

    private fun fallbackRules(): List<DetectionRule> = listOf(
        rule("APP-001", "Unknown source app", "Flags apps installed outside trusted installers.", Severity.MEDIUM, AttackCategory.MALICIOUS_APP, "T1476"),
        rule("APP-002", "Sensitive permission cluster", "Flags risky combinations of SMS, contacts, camera, microphone, or location permissions.", Severity.HIGH, AttackCategory.DATA_EXFILTRATION, "T1636"),
        rule("SMS-001", "Phishing urgency", "Flags urgent credential, OTP, payment, or account verification language.", Severity.HIGH, AttackCategory.PHISHING, "T1660"),
        rule("NET-001", "Suspicious endpoint", "Flags known suspicious endpoint patterns.", Severity.HIGH, AttackCategory.NETWORK_ATTACK, "T1437"),
        rule("SYS-001", "High risk posture", "Flags combined high-risk device posture.", Severity.CRITICAL, AttackCategory.DEVICE_COMPROMISE, "T1625")
    )

    private fun rule(
        id: String,
        name: String,
        description: String,
        severity: Severity,
        category: AttackCategory,
        mitreTechnique: String
    ): DetectionRule = DetectionRule(id, name, description, severity, category, mitreTechnique)
}
