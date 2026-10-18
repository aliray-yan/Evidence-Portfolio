package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.DnsCacheDao
import com.ihadrs.mobile.data.local.dao.NetworkFlowDao
import com.ihadrs.mobile.data.local.entities.DnsCacheEntity
import com.ihadrs.mobile.data.local.entities.NetworkFlowEntity
import com.ihadrs.mobile.data.models.AttributionConfidence
import com.ihadrs.mobile.data.models.DnsCacheEntry
import com.ihadrs.mobile.data.models.FlowNetworkType
import com.ihadrs.mobile.data.models.FlowProtocol
import com.ihadrs.mobile.data.models.FlowVerdict
import com.ihadrs.mobile.data.models.NetworkFlow
import com.ihadrs.mobile.detection.networkflow.FlowDetectionContext
import com.ihadrs.mobile.detection.networkflow.NetworkFlowDetectionRulesEngine
import com.ihadrs.mobile.detection.networkflow.ThreatIntelMatcher
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class FlowRepository @Inject constructor(
    private val flowDao: NetworkFlowDao,
    private val dnsCacheDao: DnsCacheDao,
    private val rulesEngine: NetworkFlowDetectionRulesEngine,
    private val threatIntelMatcher: ThreatIntelMatcher
) {
    fun observeLatestFlows(limit: Int = 200): Flow<List<NetworkFlow>> =
        flowDao.observeLatest(limit).map { flows -> flows.map { it.toModel() } }

    fun observeHighRiskFlows(): Flow<List<NetworkFlow>> =
        flowDao.observeHighRisk().map { flows -> flows.map { it.toModel() } }

    fun observeDnsCache(): Flow<List<DnsCacheEntry>> =
        dnsCacheDao.observeRecent().map { entries -> entries.map { it.toModel() } }

    suspend fun saveDnsAnswer(domain: String, ipAddress: String, timestamp: Long = System.currentTimeMillis()) {
        val existing = dnsCacheDao.getLatestByIp(ipAddress)
        dnsCacheDao.upsert(
            DnsCacheEntity(
                domain = domain.lowercase(),
                ipAddress = ipAddress,
                firstSeen = existing?.firstSeen ?: timestamp,
                lastSeen = timestamp
            )
        )
    }

    suspend fun saveObservedFlow(flow: NetworkFlow): NetworkFlow {
        val labelled = if (flow.destinationDomain == null) {
            val cachedDomain = dnsCacheDao.getLatestByIp(flow.destinationIp)?.domain
            flow.copy(destinationDomain = cachedDomain)
        } else {
            flow
        }
        val recent = labelled.appPackage?.let { flowDao.getRecentByApp(it, labelled.timestampStart - 15 * 60_000L).map { row -> row.toModel() } }.orEmpty()
        val previousDomain = if (labelled.appPackage != null && labelled.destinationDomain != null) {
            flowDao.getAppDomainHistory(labelled.appPackage, labelled.destinationDomain).map { it.toModel() }
        } else {
            emptyList()
        }
        val iocMatches = threatIntelMatcher.match(labelled)
        val detection = rulesEngine.evaluate(
            labelled,
            FlowDetectionContext(
                previousAppDomainFlows = previousDomain,
                recentAppFlows = recent,
                appAllowlisted = threatIntelMatcher.isAllowlisted(labelled),
                trustedSystemService = labelled.appPackage?.startsWith("com.android.") == true,
                iocMatches = iocMatches
            )
        )
        val enriched = labelled.copy(
            riskScore = detection.riskScore,
            verdict = detection.verdict,
            reasons = detection.reasons
        )
        flowDao.upsert(enriched.toEntity())
        return enriched
    }

    suspend fun saveSimulatedFlows(flows: List<NetworkFlow>) {
        flows.forEach { saveObservedFlow(it) }
    }

    suspend fun getByApp(packageName: String): List<NetworkFlow> =
        flowDao.getByApp(packageName).map { it.toModel() }

    suspend fun getByDestination(destination: String): List<NetworkFlow> =
        flowDao.getByDestination(destination).map { it.toModel() }

    suspend fun deleteOldFlows(retentionDays: Int) {
        val cutoff = System.currentTimeMillis() - retentionDays.coerceAtLeast(1) * 24L * 60L * 60L * 1000L
        flowDao.deleteOlderThan(cutoff)
        dnsCacheDao.deleteOlderThan(cutoff)
    }

    suspend fun clearAllFlows() {
        flowDao.deleteAll()
        dnsCacheDao.deleteAll()
    }
}

private fun NetworkFlowEntity.toModel(): NetworkFlow =
    NetworkFlow(
        id = id,
        timestampStart = timestampStart,
        timestampEnd = timestampEnd,
        appPackage = appPackage,
        appName = appName,
        appUid = appUid,
        attributionConfidence = enumValueOfOrDefault(attributionConfidence, AttributionConfidence.UNKNOWN),
        destinationIp = destinationIp,
        destinationDomain = destinationDomain,
        destinationPort = destinationPort,
        protocol = enumValueOfOrDefault(protocol, FlowProtocol.OTHER),
        bytesSent = bytesSent,
        bytesReceived = bytesReceived,
        packetsSent = packetsSent,
        packetsReceived = packetsReceived,
        networkType = enumValueOfOrDefault(networkType, FlowNetworkType.UNKNOWN),
        country = country,
        asn = asn,
        riskScore = riskScore,
        verdict = enumValueOfOrDefault(verdict, FlowVerdict.UNKNOWN),
        reasons = reasons
    )

private fun NetworkFlow.toEntity(): NetworkFlowEntity =
    NetworkFlowEntity(
        id = id,
        timestampStart = timestampStart,
        timestampEnd = timestampEnd,
        appPackage = appPackage,
        appName = appName,
        appUid = appUid,
        attributionConfidence = attributionConfidence.name,
        destinationIp = destinationIp,
        destinationDomain = destinationDomain,
        destinationPort = destinationPort,
        protocol = protocol.name,
        bytesSent = bytesSent,
        bytesReceived = bytesReceived,
        packetsSent = packetsSent,
        packetsReceived = packetsReceived,
        networkType = networkType.name,
        country = country,
        asn = asn,
        riskScore = riskScore,
        verdict = verdict.name,
        reasons = reasons
    )

private fun DnsCacheEntity.toModel(): DnsCacheEntry =
    DnsCacheEntry(domain = domain, ipAddress = ipAddress, firstSeen = firstSeen, lastSeen = lastSeen)

private inline fun <reified T : Enum<T>> enumValueOfOrDefault(value: String, default: T): T =
    runCatching { enumValueOf<T>(value) }.getOrDefault(default)

