package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.ThreatEventDao
import com.ihadrs.mobile.data.local.entities.ThreatEventEntity
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class ThreatRepository @Inject constructor(
    private val dao: ThreatEventDao,
    private val timelineRepository: TimelineRepository,
    private val socIntegrationRepository: SocIntegrationRepository
) {
    fun observeThreats(): Flow<List<ThreatEvent>> = dao.observeAll().map { events ->
        events.filterNot { it.dismissed }.map { it.toModel() }
    }

    fun observeThreat(id: String): Flow<ThreatEvent?> = dao.observeById(id).map { it?.toModel() }

    fun observeActiveThreatCount(): Flow<Int> = dao.observeActiveCount()

    suspend fun getThreats(): List<ThreatEvent> = dao.getAll().map { it.toModel() }

    suspend fun getActiveThreats(): List<ThreatEvent> = dao.getActive().map { it.toModel() }

    suspend fun report(event: ThreatEvent) {
        dao.upsert(event.toEntity())
        timelineRepository.record(
            type = TimelineEventType.ALERT_CREATED,
            title = event.title,
            detail = event.description,
            packageName = event.packageName,
            threatId = event.id,
            severity = event.severity.name
        )
        socIntegrationRepository.queueThreat(event)
    }

    suspend fun dismissThreat(id: String) {
        val event = dao.getById(id)?.toModel()
        dao.dismiss(id)
        timelineRepository.record(
            type = TimelineEventType.ALERT_DISMISSED,
            title = "Alert dismissed",
            detail = event?.title ?: id,
            packageName = event?.packageName,
            threatId = id,
            severity = event?.severity?.name
        )
    }

    suspend fun retireRule(ruleId: String) = dao.dismissByRule(ruleId)

    suspend fun seedDemoThreatIfEmpty() {
        report(
            ThreatEvent(
                id = UUID.randomUUID().toString(),
                title = "Baseline protection initialized",
                description = "IHADRS is ready to monitor apps, messages, and network indicators on this device.",
                severity = Severity.LOW,
                category = AttackCategory.UNKNOWN,
                timestamp = System.currentTimeMillis(),
                triggeredRules = listOf("SYSTEM-READY"),
                mitreTechniques = listOf("MOBILE-AWARENESS"),
                remediation = listOf("Start monitoring", "Grant optional permissions for deeper coverage")
            )
        )
    }
}

private fun ThreatEventEntity.toModel(): ThreatEvent =
    ThreatEvent(
        id = id,
        title = title,
        description = description,
        packageName = packageName,
        severity = runCatching { Severity.valueOf(severity) }.getOrDefault(Severity.LOW),
        category = runCatching { AttackCategory.valueOf(category) }.getOrDefault(AttackCategory.UNKNOWN),
        timestamp = timestamp,
        triggeredRules = triggeredRules,
        mitreTechniques = mitreTechniques,
        remediation = remediation,
        dismissed = dismissed
    )

private fun ThreatEvent.toEntity(): ThreatEventEntity =
    ThreatEventEntity(
        id = id,
        title = title,
        description = description,
        packageName = packageName,
        severity = severity.name,
        category = category.name,
        timestamp = timestamp,
        triggeredRules = triggeredRules,
        mitreTechniques = mitreTechniques,
        remediation = remediation,
        dismissed = dismissed
    )
