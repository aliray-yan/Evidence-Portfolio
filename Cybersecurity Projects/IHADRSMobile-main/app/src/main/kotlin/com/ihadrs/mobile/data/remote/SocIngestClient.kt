package com.ihadrs.mobile.data.remote

import com.google.gson.Gson
import com.google.gson.JsonParser
import com.ihadrs.mobile.data.models.SocConnectionResult
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton

sealed class SocUploadResult {
    data class Success(val secureOpsAlertIds: List<String>) : SocUploadResult()
    data class Invalid(val message: String) : SocUploadResult()
    data class AuthError(val message: String) : SocUploadResult()
    data class Retryable(val message: String) : SocUploadResult()
}

@Singleton
class SocIngestClient @Inject constructor(
    private val gson: Gson
) {
    fun testConnection(baseUrl: String, ingestKey: String): SocConnectionResult {
        val normalized = normalizeBaseUrl(baseUrl)
        if (normalized.isBlank()) return SocConnectionResult(false, "Enter a SecureOps API base URL.")
        return runCatching {
            val connection = openConnection("$normalized/ingest/edr/config", "GET", ingestKey)
            val code = connection.responseCode
            val body = connection.readBody(code)
            connection.disconnect()
            when (code) {
                200 -> {
                    val config = JsonParser.parseString(body).asJsonObject
                    val endpoint = config.get("endpoint")?.asString.orEmpty()
                    val batchEndpoint = config.get("batch_endpoint")?.asString.orEmpty()
                    val header = config.get("header")?.asString.orEmpty()
                    val keyRequired = config.get("key_required")?.asBoolean ?: true
                    SocConnectionResult(
                        true,
                        "Connected. Endpoint: $endpoint\nBatch endpoint: $batchEndpoint\nHeader: $header\nKey required: $keyRequired"
                    )
                }
                401 -> SocConnectionResult(false, "SecureOps rejected the ingest key.")
                else -> SocConnectionResult(false, "SecureOps returned HTTP $code.")
            }
        }.getOrElse { error ->
            SocConnectionResult(false, error.toConnectionMessage())
        }
    }

    fun uploadBatchJson(baseUrl: String, ingestKey: String, batchJson: String): SocUploadResult {
        val normalized = normalizeBaseUrl(baseUrl)
        if (normalized.isBlank()) return SocUploadResult.Invalid("SecureOps URL is not configured.")
        return runCatching {
            val connection = openConnection("$normalized/ingest/edr/alerts/batch", "POST", ingestKey)
            OutputStreamWriter(connection.outputStream).use { writer -> writer.write(batchJson) }
            val code = connection.responseCode
            val body = connection.readBody(code)
            connection.disconnect()
            when (code) {
                200, 201 -> {
                    val alertIds = runCatching {
                        JsonParser.parseString(body).asJsonObject
                            .getAsJsonArray("alert_ids")
                            ?.mapNotNull { it.asString }
                            .orEmpty()
                    }.getOrDefault(emptyList())
                    SocUploadResult.Success(alertIds)
                }
                400, 422 -> SocUploadResult.Invalid("Invalid SecureOps payload: HTTP $code")
                401 -> SocUploadResult.AuthError("SecureOps rejected the ingest key.")
                500, 503 -> SocUploadResult.Retryable("SecureOps is temporarily unavailable: HTTP $code")
                else -> SocUploadResult.Retryable("SecureOps returned HTTP $code")
            }
        }.getOrElse { error ->
            SocUploadResult.Retryable(error.toConnectionMessage())
        }
    }

    private fun openConnection(url: String, method: String, ingestKey: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = TIMEOUT_MS
            readTimeout = TIMEOUT_MS
            setRequestProperty("Accept", "application/json")
            if (method == "POST") {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            if (ingestKey.isNotBlank()) {
                setRequestProperty("X-SecureOps-Ingest-Key", ingestKey)
            }
        }

    private fun HttpURLConnection.readBody(code: Int): String {
        val stream = if (code in 200..299) inputStream else errorStream
        return stream?.bufferedReader()?.use { it.readText() }.orEmpty()
    }

    companion object {
        private const val TIMEOUT_MS = 10_000

        fun normalizeBaseUrl(value: String): String {
            val trimmed = value.trim().trimEnd('/')
            if (trimmed.isBlank()) return ""
            return if (trimmed.endsWith("/api/v1")) trimmed else "$trimmed/api/v1"
        }
    }
}

private fun Throwable.toConnectionMessage(): String = when (this) {
    is android.os.NetworkOnMainThreadException -> "Android blocked the network test on the main thread. Install the rebuilt APK."
    is SocketTimeoutException -> "SecureOps timed out. Check Wi-Fi, backend, and Windows Firewall for port 8000."
    is UnknownHostException -> "SecureOps host was not found. Check the IP address and Wi-Fi network."
    else -> message?.let { "${this::class.java.simpleName}: $it" } ?: "Could not reach SecureOps."
}
