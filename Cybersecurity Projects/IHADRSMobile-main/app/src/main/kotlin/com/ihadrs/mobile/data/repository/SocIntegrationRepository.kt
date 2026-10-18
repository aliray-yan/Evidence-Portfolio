package com.ihadrs.mobile.data.repository

import android.content.Context
import android.os.Build
import android.provider.Settings
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.google.gson.Gson
import com.ihadrs.mobile.BuildConfig
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.local.dao.SocOutboundAlertDao
import com.ihadrs.mobile.data.local.entities.SocOutboundAlertEntity
import com.ihadrs.mobile.data.models.SocAlertPayload
import com.ihadrs.mobile.data.models.SocConnectionResult
import com.ihadrs.mobile.data.models.SocIoc
import com.ihadrs.mobile.data.models.SocQueueStats
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.remote.SocIngestClient
import com.ihadrs.mobile.data.remote.SocUploadResult
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import com.ihadrs.mobile.monitoring.workers.SocSyncWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Singleton
class SocIntegrationRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val dao: SocOutboundAlertDao,
    private val settingsRepository: SettingsRepository,
    private val client: SocIngestClient,
    private val gson: Gson
) {
    val queueStats: Flow<SocQueueStats> = combine(
        dao.observeQueuedCount(),
        dao.observeSentCount(),
        dao.observeLastError()
    ) { queued, sent, lastError ->
        SocQueueStats(queued = queued, sent = sent, lastError = lastError)
    }

    suspend fun testConnection(baseUrl: String, ingestKey: String): SocConnectionResult =
        withContext(Dispatchers.IO) {
            client.testConnection(baseUrl, ingestKey)
        }

    suspend fun queueThreat(threat: ThreatEvent) {
        val prefs = settingsRepository.currentPreferences()
        if (!prefs.secureOpsEnabled || prefs.secureOpsBaseUrl.isBlank()) return
        val payload = threat.toSocPayload(context)
        dao.upsert(
            SocOutboundAlertEntity(
                alertId = payload.alertId,
                payloadJson = gson.toJson(payload),
                status = "QUEUED",
                createdAt = System.currentTimeMillis()
            )
        )
        scheduleSync(context)
    }

    suspend fun syncQueued(): SocConnectionResult {
        val prefs = settingsRepository.preferences.first()
        if (!prefs.secureOpsEnabled) return SocConnectionResult(false, "SecureOps sync is disabled.")
        if (prefs.secureOpsBaseUrl.isBlank()) return SocConnectionResult(false, "SecureOps URL is not configured.")
        val queued = dao.getQueued(BATCH_LIMIT)
        if (queued.isEmpty()) return SocConnectionResult(true, "No queued alerts to sync.")

        val batchJson = queued.joinToString(
            prefix = "{\"alerts\":[",
            postfix = "]}",
            separator = ","
        ) { it.payloadJson }
        val result = withContext(Dispatchers.IO) {
            client.uploadBatchJson(
                baseUrl = prefs.secureOpsBaseUrl,
                ingestKey = prefs.secureOpsIngestKey,
                batchJson = batchJson
            )
        }
        val now = System.currentTimeMillis()
        return when (result) {
            is SocUploadResult.Success -> {
                queued.forEach { entity ->
                    dao.markSent(entity.alertId, now, result.secureOpsAlertIds)
                }
                SocConnectionResult(true, "Synced ${queued.size} alert(s) to SecureOps.")
            }
            is SocUploadResult.Invalid -> {
                queued.forEach { entity -> dao.markAttempt(entity.alertId, now, "INVALID", result.message) }
                SocConnectionResult(false, result.message)
            }
            is SocUploadResult.AuthError -> {
                queued.forEach { entity -> dao.markAttempt(entity.alertId, now, "AUTH_ERROR", result.message) }
                SocConnectionResult(false, result.message)
            }
            is SocUploadResult.Retryable -> {
                queued.forEach { entity -> dao.markAttempt(entity.alertId, now, "QUEUED", result.message) }
                SocConnectionResult(false, result.message)
            }
        }
    }

    companion object {
        private const val BATCH_LIMIT = 100

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SocSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                Constants.SOC_SYNC_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}

private fun ThreatEvent.toSocPayload(context: Context): SocAlertPayload =
    SocAlertPayload(
        alertId = "ihadrs-$id",
        title = title.take(255),
        description = description,
        severity = severity.toSocSeverity(),
        category = category.toSocCategory(),
        deviceId = "android-${Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID).orEmpty()}",
        hostname = "${Build.MANUFACTURER} ${Build.MODEL}".trim(),
        osVersion = "Android ${Build.VERSION.RELEASE}",
        appVersion = BuildConfig.VERSION_NAME,
        packageName = packageName,
        processName = packageName,
        iocs = extractIocs(),
        rawEvent = mapOf(
            "event_type" to "ihadrs_threat",
            "ihadrs_id" to id,
            "title" to title,
            "description" to description,
            "severity" to severity.name,
            "category" to category.name,
            "package_name" to packageName,
            "triggered_rules" to triggeredRules,
            "mitre_techniques" to mitreTechniques,
            "remediation" to remediation,
            "timestamp" to timestamp
        )
    )

private fun Severity.toSocSeverity(): String = when (this) {
    Severity.CRITICAL -> "critical"
    Severity.HIGH -> "high"
    Severity.MEDIUM -> "medium"
    Severity.LOW -> "low"
}

private fun AttackCategory.toSocCategory(): String = when (this) {
    AttackCategory.MALICIOUS_APP -> "Malware"
    AttackCategory.PHISHING -> "Phishing"
    AttackCategory.NETWORK_ATTACK -> "Network Attack"
    AttackCategory.PRIVILEGE_ESCALATION -> "Privilege Escalation"
    AttackCategory.DATA_EXFILTRATION -> "Data Exfiltration"
    AttackCategory.DEVICE_COMPROMISE -> "Device Tampering"
    AttackCategory.UNKNOWN -> "Mobile EDR"
}

private fun ThreatEvent.extractIocs(): List<SocIoc> {
    val text = listOf(title, description, packageName.orEmpty()).joinToString(" ")
    val urls = URL_REGEX.findAll(text).map { SocIoc("url", it.value.trimEnd('.', ',', ')')) }
    val domains = DOMAIN_REGEX.findAll(text)
        .map { it.value.lowercase().trimEnd('.', ',', ')') }
        .filterNot { it.startsWith("android.") || it in setOf("com.android") }
        .map { SocIoc("domain", it) }
    val packageIoc = packageName?.takeIf { it.isNotBlank() }?.let { SocIoc("package", it) }
    return (urls + domains + listOfNotNull(packageIoc)).distinctBy { "${it.type}:${it.value}" }.take(20).toList()
}

private val URL_REGEX = Regex("""https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+""")
private val DOMAIN_REGEX = Regex("""\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b""")
