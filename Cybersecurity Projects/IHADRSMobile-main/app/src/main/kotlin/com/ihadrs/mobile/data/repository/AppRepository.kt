package com.ihadrs.mobile.data.repository

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import com.ihadrs.mobile.data.local.dao.AppInfoDao
import com.ihadrs.mobile.data.local.entities.AppInfoEntity
import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.TimelineEventType
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

@Singleton
class AppRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val dao: AppInfoDao,
    private val timelineRepository: TimelineRepository
) {
    fun observeApps(): Flow<List<AppInfo>> = dao.observeApps().map { apps -> apps.map { it.toModel() } }
    fun observeApp(packageName: String): Flow<AppInfo?> = dao.observeApp(packageName).map { it?.toModel() }
    fun observeAppCount(): Flow<Int> = dao.observeCount()

    suspend fun refreshInstalledApps(): List<AppInfo> = withContext(Dispatchers.IO) {
        val pm = context.packageManager
        val cachedApps = dao.getApps().associateBy { it.packageName }
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA).map { app ->
            val packageInfo = runCatching {
                pm.getPackageInfo(app.packageName, PackageManager.GET_PERMISSIONS)
            }.getOrNull()
            val permissions = packageInfo?.requestedPermissions?.toList().orEmpty()
            val systemApp = (app.flags and ApplicationInfo.FLAG_SYSTEM) != 0 ||
                (app.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
            val fromUnknownSource = if (systemApp) false else isFromUnknownSource(pm, app.packageName)
            AppInfoEntity(
                packageName = app.packageName,
                appName = pm.getApplicationLabel(app).toString(),
                versionName = packageInfo?.versionName,
                installTime = packageInfo?.firstInstallTime ?: 0L,
                updateTime = packageInfo?.lastUpdateTime ?: 0L,
                requestedPermissions = permissions,
                riskScore = calculateRiskScore(permissions, fromUnknownSource, systemApp),
                fromUnknownSource = fromUnknownSource,
                systemApp = systemApp
            )
        }
        apps.forEach { app ->
            val cached = cachedApps[app.packageName] ?: return@forEach
            val oldPermissions = cached.requestedPermissions.toSet()
            val newPermissions = app.requestedPermissions.toSet()
            if (oldPermissions != newPermissions) {
                val added = (newPermissions - oldPermissions).size
                val removed = (oldPermissions - newPermissions).size
                timelineRepository.record(
                    type = TimelineEventType.PERMISSION_CHANGED,
                    title = "Permissions changed",
                    detail = "${app.appName}: $added added, $removed removed",
                    packageName = app.packageName
                )
            }
        }
        dao.upsertAll(apps)
        apps.map { it.toModel() }
    }

    suspend fun getCachedApps(): List<AppInfo> = dao.getApps().map { it.toModel() }

    private fun isFromUnknownSource(pm: PackageManager, packageName: String): Boolean {
        return runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val sourceInfo = pm.getInstallSourceInfo(packageName)
                val source = sourceInfo.installingPackageName
                    ?: sourceInfo.initiatingPackageName
                    ?: sourceInfo.originatingPackageName
                source != null && source !in trustedInstallers && packageName !in trustedPackages && trustedPackagePrefixes.none { packageName.startsWith(it) }
            } else {
                @Suppress("DEPRECATION")
                val installer = pm.getInstallerPackageName(packageName)
                installer != null && installer !in trustedInstallers && packageName !in trustedPackages && trustedPackagePrefixes.none { packageName.startsWith(it) }
            }
        }.getOrDefault(false)
    }

    private fun calculateRiskScore(
        permissions: List<String>,
        fromUnknownSource: Boolean,
        systemApp: Boolean
    ): Int {
        val criticalSignals = listOf(
            "BIND_ACCESSIBILITY_SERVICE",
            "REQUEST_INSTALL_PACKAGES",
            "SYSTEM_ALERT_WINDOW",
            "READ_SMS",
            "RECEIVE_SMS",
            "SEND_SMS"
        )
        val highSignals = listOf(
            "RECORD_AUDIO",
            "CAMERA",
            "ACCESS_FINE_LOCATION",
            "READ_CONTACTS",
            "READ_CALL_LOG"
        )
        val mediumSignals = listOf(
            "ACCESS_COARSE_LOCATION",
            "READ_CALENDAR",
            "WRITE_CALENDAR",
            "READ_EXTERNAL_STORAGE",
            "READ_MEDIA_IMAGES",
            "READ_MEDIA_VIDEO"
        )
        val criticalScore = permissions.countMatches(criticalSignals) * 12
        val highScore = permissions.countMatches(highSignals) * 6
        val mediumScore = permissions.countMatches(mediumSignals) * 3
        val sourceScore = if (fromUnknownSource) 35 else 0
        val trustAdjustment = when {
            systemApp -> -25
            packageNameLooksTrusted(permissions) -> -15
            !fromUnknownSource -> -10
            else -> 0
        }
        val cap = when {
            systemApp -> 35
            !fromUnknownSource -> 60
            else -> 100
        }
        return (criticalScore + highScore + mediumScore + sourceScore + trustAdjustment).coerceIn(0, cap)
    }

    private fun List<String>.countMatches(signals: List<String>): Int =
        count { permission -> signals.any { signal -> permission.contains(signal) } }

    private fun packageNameLooksTrusted(permissions: List<String>): Boolean =
        permissions.isNotEmpty() && permissions.size >= 40

    private companion object {
        val trustedInstallers = setOf(
            "com.android.vending",
            "com.google.android.packageinstaller",
            "com.android.packageinstaller",
            "com.google.android.apps.nbu.files"
        )
        val trustedPackages = setOf(
            "com.facebook.katana",
            "com.instagram.android",
            "com.whatsapp",
            "com.snapchat.android",
            "com.microsoft.teams",
            "com.mi.global.shop",
            "com.xiaomi.smarthome",
            "com.xiaomi.midrop",
            "com.mi.global.bbs",
            "com.xiaomi.scanner",
            "com.miui.mediaeditor",
            "com.miui.notes",
            "com.miui.calculator",
            "com.duokan.phone.remotecontroller"
        )
        val trustedPackagePrefixes = setOf(
            "com.google.",
            "com.android.",
            "com.miui.",
            "com.xiaomi.",
            "com.mi.",
            "com.facebook.",
            "com.instagram.",
            "com.microsoft."
        )
    }
}

private fun AppInfoEntity.toModel(): AppInfo =
    AppInfo(packageName, appName, versionName, installTime, updateTime, requestedPermissions, riskScore, fromUnknownSource, systemApp)
