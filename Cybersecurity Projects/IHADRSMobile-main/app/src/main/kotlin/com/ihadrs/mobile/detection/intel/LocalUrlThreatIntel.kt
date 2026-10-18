package com.ihadrs.mobile.detection.intel

import android.content.Context
import com.ihadrs.mobile.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocalUrlThreatIntel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val parser: ThreatIntelParser,
    private val scorer: ThreatIntelScorer
) : UrlThreatIntel {
    private val catalog: ThreatIntelCatalog by lazy {
        runCatching {
            context.resources.openRawResource(R.raw.domain_indicators).bufferedReader().use { reader ->
                parser.parse(reader.readText())
            }
        }.getOrElse { fallbackCatalog() }
    }

    override fun evaluate(urls: List<String>): ThreatIntelResult =
        scorer.evaluate(urls, catalog)

    private fun fallbackCatalog(): ThreatIntelCatalog =
        ThreatIntelCatalog(
            blockedDomains = setOf("bit.ly", "tinyurl.com"),
            suspiciousSuffixes = setOf("login-verify.example"),
            riskyTlds = setOf("zip", "top", "xyz"),
            suspiciousKeywords = setOf("verify", "login", "wallet", "bank", "otp")
        )
}
