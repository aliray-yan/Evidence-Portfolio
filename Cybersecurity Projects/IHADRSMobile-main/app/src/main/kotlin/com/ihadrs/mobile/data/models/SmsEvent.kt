package com.ihadrs.mobile.data.models

data class SmsEvent(
    val id: String,
    val sender: String,
    val bodyPreview: String,
    val timestamp: Long,
    val phishingScore: Int = 0,
    val suspiciousLinks: List<String> = emptyList()
)
