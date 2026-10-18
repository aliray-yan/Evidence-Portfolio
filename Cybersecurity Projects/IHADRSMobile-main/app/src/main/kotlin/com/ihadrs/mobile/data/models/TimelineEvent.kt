package com.ihadrs.mobile.data.models

data class TimelineEvent(
    val id: String,
    val type: TimelineEventType,
    val title: String,
    val detail: String,
    val timestamp: Long,
    val packageName: String? = null,
    val threatId: String? = null,
    val severity: String? = null
)
