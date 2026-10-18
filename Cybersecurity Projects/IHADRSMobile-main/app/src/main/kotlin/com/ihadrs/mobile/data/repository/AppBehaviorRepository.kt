package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.AppBehaviorDao
import com.ihadrs.mobile.data.local.entities.AppBehaviorSnapshotEntity
import com.ihadrs.mobile.data.models.AppBehaviorSnapshot
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.BehaviorChange
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.detection.behavior.AppBehaviorChangeDetector
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class AppBehaviorRepository @Inject constructor(
    private val dao: AppBehaviorDao,
    private val timelineRepository: TimelineRepository,
    private val changeDetector: AppBehaviorChangeDetector
) {
    fun observeHistory(packageName: String): Flow<List<AppBehaviorSnapshot>> =
        dao.observeForPackage(packageName).map { snapshots -> snapshots.map { it.toModel() } }

    suspend fun captureAndDetect(app: AppInfo): List<BehaviorChange> {
        val previous = dao.latestForPackage(app.packageName)?.toModel()
        val current = app.toSnapshot()
        dao.insert(current.toEntity())
        dao.trim()
        val changes = changeDetector.detect(previous, current)
        changes.forEach { change ->
            timelineRepository.record(
                type = TimelineEventType.BEHAVIOR_CHANGE,
                title = "Behavior change detected",
                detail = "${change.appName}: ${change.detail}",
                packageName = change.packageName,
                severity = change.severity
            )
        }
        return changes
    }

    private fun AppInfo.toSnapshot(): AppBehaviorSnapshot =
        AppBehaviorSnapshot(
            id = UUID.randomUUID().toString(),
            packageName = packageName,
            appName = appName,
            capturedAt = System.currentTimeMillis(),
            riskScore = riskScore,
            permissionCount = requestedPermissions.size,
            sensitivePermissions = requestedPermissions
                .map { it.substringAfterLast('.') }
                .filter { permission -> sensitiveSignals.any { permission.contains(it) } }
                .distinct()
                .sorted(),
            fromUnknownSource = fromUnknownSource,
            systemApp = systemApp,
            versionName = versionName
        )

    private companion object {
        val sensitiveSignals = listOf(
            "READ_SMS",
            "RECEIVE_SMS",
            "SEND_SMS",
            "RECORD_AUDIO",
            "CAMERA",
            "ACCESS_FINE_LOCATION",
            "READ_CONTACTS",
            "READ_CALL_LOG",
            "SYSTEM_ALERT_WINDOW",
            "REQUEST_INSTALL_PACKAGES"
        )
    }
}

private fun AppBehaviorSnapshotEntity.toModel(): AppBehaviorSnapshot =
    AppBehaviorSnapshot(
        id = id,
        packageName = packageName,
        appName = appName,
        capturedAt = capturedAt,
        riskScore = riskScore,
        permissionCount = permissionCount,
        sensitivePermissions = sensitivePermissions,
        fromUnknownSource = fromUnknownSource,
        systemApp = systemApp,
        versionName = versionName
    )

private fun AppBehaviorSnapshot.toEntity(): AppBehaviorSnapshotEntity =
    AppBehaviorSnapshotEntity(
        id = id,
        packageName = packageName,
        appName = appName,
        capturedAt = capturedAt,
        riskScore = riskScore,
        permissionCount = permissionCount,
        sensitivePermissions = sensitivePermissions,
        fromUnknownSource = fromUnknownSource,
        systemApp = systemApp,
        versionName = versionName
    )
