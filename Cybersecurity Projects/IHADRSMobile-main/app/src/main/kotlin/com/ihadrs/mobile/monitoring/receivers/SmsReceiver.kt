package com.ihadrs.mobile.monitoring.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.repository.SmsRepository
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.data.repository.TimelineRepository
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.detection.analyzers.SmsAnalyzer
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import com.ihadrs.mobile.utils.NotificationHelper
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@AndroidEntryPoint
class SmsReceiver : BroadcastReceiver() {
    @Inject lateinit var smsAnalyzer: SmsAnalyzer
    @Inject lateinit var smsRepository: SmsRepository
    @Inject lateinit var threatRepository: ThreatRepository
    @Inject lateinit var timelineRepository: TimelineRepository

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val pendingResult = goAsync()
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                messages.forEach { message ->
                    val sender = message.originatingAddress.orEmpty().ifBlank { "Unknown sender" }
                    val body = message.messageBody.orEmpty()
                    val analysis = smsAnalyzer.analyze(body)
                    smsRepository.record(sender, body, analysis.score, analysis.links)
                    timelineRepository.record(
                        type = TimelineEventType.SMS_CHECKED,
                        title = "SMS checked",
                        detail = "Sender: $sender, phishing score: ${analysis.score}",
                        severity = if (analysis.score >= PHISHING_ALERT_THRESHOLD) "HIGH" else null
                    )
                    if (analysis.score >= PHISHING_ALERT_THRESHOLD) {
                        val threat = ThreatEvent(
                            id = "sms-phishing-${message.timestampMillis}-${sender.hashCode()}",
                            title = "Possible phishing SMS",
                            description = buildDescription(sender, analysis.reasons),
                            severity = if (analysis.score >= 80) Severity.CRITICAL else Severity.HIGH,
                            category = AttackCategory.PHISHING,
                            timestamp = System.currentTimeMillis(),
                            triggeredRules = buildList {
                                add("SMS-001")
                                if (analysis.links.isNotEmpty()) add("SMS-003")
                                if (analysis.threatIntel.matches.isNotEmpty()) add("NET-001")
                            },
                            mitreTechniques = listOf("T1660"),
                            remediation = listOf(
                                "Do not open links in the message",
                                "Do not share OTPs, passwords, or banking details",
                                "Block or report the sender if the message is unexpected"
                            )
                        )
                        threatRepository.report(threat)
                        NotificationHelper.showThreatAlert(context, threat)
                    }
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun buildDescription(sender: String, reasons: List<String>): String {
        val reasonText = reasons.take(3).joinToString("; ").ifBlank { "suspicious message patterns were detected" }
        return "A message from $sender was flagged because $reasonText."
    }

    private companion object {
        const val PHISHING_ALERT_THRESHOLD = 45
    }
}
