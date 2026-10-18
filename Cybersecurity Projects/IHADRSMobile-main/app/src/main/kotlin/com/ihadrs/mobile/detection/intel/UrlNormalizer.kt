package com.ihadrs.mobile.detection.intel

import java.net.IDN
import java.net.URI

object UrlNormalizer {
    fun normalize(rawUrl: String): NormalizedUrl? {
        val trimmed = rawUrl.trim().trimEnd('.', ',', ')', ']', '}')
        if (trimmed.isBlank()) return null
        val withScheme = if (trimmed.startsWith("http://", true) || trimmed.startsWith("https://", true)) {
            trimmed
        } else {
            "https://$trimmed"
        }
        return runCatching {
            val uri = URI(withScheme)
            val rawHost = uri.host ?: return null
            val asciiHost = IDN.toASCII(rawHost.lowercase()).removePrefix("www.")
            val path = uri.rawPath.orEmpty().ifBlank { "/" }
            val normalized = "${uri.scheme.lowercase()}://$asciiHost$path"
            NormalizedUrl(
                original = rawUrl,
                normalized = normalized,
                host = asciiHost,
                path = path
            )
        }.getOrNull()
    }
}
