package com.ihadrs.mobile.data.models

import com.google.gson.annotations.SerializedName

data class SocIoc(
    val type: String,
    val value: String
)

data class SocAlertPayload(
    @SerializedName("alert_id") val alertId: String,
    val title: String,
    val description: String?,
    val severity: String,
    val category: String?,
    @SerializedName("device_id") val deviceId: String,
    val hostname: String,
    val platform: String = "android",
    @SerializedName("os_version") val osVersion: String,
    @SerializedName("app_version") val appVersion: String,
    val username: String? = null,
    @SerializedName("package_name") val packageName: String? = null,
    @SerializedName("process_name") val processName: String? = packageName,
    val iocs: List<SocIoc> = emptyList(),
    @SerializedName("raw_event") val rawEvent: Map<String, Any?>
)

data class SocBatchPayload(
    val alerts: List<SocAlertPayload>
)

data class SocIngestConfig(
    val endpoint: String? = null,
    @SerializedName("batch_endpoint") val batchEndpoint: String? = null,
    val header: String? = null,
    @SerializedName("key_required") val keyRequired: Boolean = true,
    val source: String? = null
)

data class SocIngestResponse(
    val created: Int = 0,
    @SerializedName("alert_ids") val alertIds: List<String> = emptyList()
)

data class SocQueueStats(
    val queued: Int = 0,
    val sent: Int = 0,
    val lastError: String? = null
)

data class SocConnectionResult(
    val ok: Boolean,
    val message: String
)
