package com.ihadrs.mobile.detection.intel

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import javax.inject.Inject

class ThreatIntelParser @Inject constructor(
    private val gson: Gson
) {
    fun parse(json: String): ThreatIntelCatalog {
        val raw = gson.fromJson(json, RawThreatIntelCatalog::class.java)
        return ThreatIntelCatalog(
            blockedDomains = raw.blockedDomains.cleanDomains(),
            suspiciousSuffixes = raw.suspiciousSuffixes.cleanDomains(),
            riskyTlds = raw.riskyTlds.map { it.lowercase().removePrefix(".") }.filter { it.isNotBlank() }.toSet(),
            suspiciousKeywords = raw.suspiciousKeywords.map { it.lowercase() }.filter { it.isNotBlank() }.toSet()
        )
    }

    private fun List<String>.cleanDomains(): Set<String> =
        map { it.lowercase().removePrefix("www.").trim().trim('.') }
            .filter { it.isNotBlank() }
            .toSet()
}

private data class RawThreatIntelCatalog(
    @SerializedName("blockedDomains")
    val blockedDomains: List<String> = emptyList(),
    @SerializedName("suspiciousSuffixes")
    val suspiciousSuffixes: List<String> = emptyList(),
    @SerializedName("riskyTlds")
    val riskyTlds: List<String> = emptyList(),
    @SerializedName("suspiciousKeywords")
    val suspiciousKeywords: List<String> = emptyList()
)
