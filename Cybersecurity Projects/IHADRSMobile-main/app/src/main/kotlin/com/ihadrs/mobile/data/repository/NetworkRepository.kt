package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.NetworkEventDao
import com.ihadrs.mobile.data.local.entities.NetworkEventEntity
import com.ihadrs.mobile.data.models.NetworkEvent
import com.ihadrs.mobile.data.models.TimelineEventType
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class NetworkRepository @Inject constructor(
    private val dao: NetworkEventDao,
    private val timelineRepository: TimelineRepository
) {
    fun observeRecent(): Flow<List<NetworkEvent>> =
        dao.observeRecent().map { events -> events.map { it.toModel() } }

    suspend fun getRecent(limit: Int = 50): List<NetworkEvent> =
        dao.getRecent(limit).map { it.toModel() }

    suspend fun record(
        host: String,
        protocol: String,
        suspicious: Boolean = false,
        riskScore: Int = if (suspicious) 70 else 0,
        reasons: List<String> = emptyList(),
        ipAddress: String? = null,
        port: Int? = null
    ): NetworkEvent {
        val now = System.currentTimeMillis()
        val event = NetworkEventEntity(
            id = "$now-$host",
            host = host,
            ipAddress = ipAddress,
            port = port,
            protocol = protocol,
            timestamp = now,
            suspicious = suspicious,
            riskScore = riskScore.coerceIn(0, 100),
            reasons = reasons
        )
        dao.insert(event)
        timelineRepository.record(
            type = TimelineEventType.NETWORK_CHECKED,
            title = if (event.suspicious) "Suspicious endpoint checked" else "Network endpoint checked",
            detail = buildString {
                append(event.host)
                append(" via ")
                append(event.protocol)
                append(" scored ")
                append(event.riskScore)
                append("/100")
                if (event.reasons.isNotEmpty()) {
                    append(": ")
                    append(event.reasons.joinToString())
                }
            },
            severity = if (event.suspicious) "MEDIUM" else null
        )
        return event.toModel()
    }
}

private fun NetworkEventEntity.toModel(): NetworkEvent =
    NetworkEvent(
        id = id,
        host = host,
        ipAddress = ipAddress,
        port = port,
        protocol = protocol,
        timestamp = timestamp,
        suspicious = suspicious,
        riskScore = riskScore,
        reasons = reasons
    )
