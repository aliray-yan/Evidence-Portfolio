package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.TimelineEventDao
import com.ihadrs.mobile.data.local.entities.TimelineEventEntity
import com.ihadrs.mobile.data.models.TimelineEvent
import com.ihadrs.mobile.data.models.TimelineEventType
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class TimelineRepository @Inject constructor(
    private val dao: TimelineEventDao
) {
    fun observeRecent(limit: Int = 100): Flow<List<TimelineEvent>> =
        dao.observeRecent(limit).map { events -> events.map { it.toModel() } }

    suspend fun getRecent(limit: Int = 100): List<TimelineEvent> =
        dao.getRecent(limit).map { it.toModel() }

    suspend fun record(
        type: TimelineEventType,
        title: String,
        detail: String,
        packageName: String? = null,
        threatId: String? = null,
        severity: String? = null
    ) {
        dao.insert(
            TimelineEventEntity(
                id = UUID.randomUUID().toString(),
                type = type.name,
                title = title,
                detail = detail,
                timestamp = System.currentTimeMillis(),
                packageName = packageName,
                threatId = threatId,
                severity = severity
            )
        )
        dao.trim()
    }
}

private fun TimelineEventEntity.toModel(): TimelineEvent =
    TimelineEvent(
        id = id,
        type = runCatching { TimelineEventType.valueOf(type) }.getOrDefault(TimelineEventType.SCAN_COMPLETED),
        title = title,
        detail = detail,
        timestamp = timestamp,
        packageName = packageName,
        threatId = threatId,
        severity = severity
    )
