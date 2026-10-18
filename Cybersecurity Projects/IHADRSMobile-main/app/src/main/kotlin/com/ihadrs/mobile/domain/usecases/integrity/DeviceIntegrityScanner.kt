package com.ihadrs.mobile.domain.usecases.integrity

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.VpnService
import android.os.Build
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import com.ihadrs.mobile.data.models.IntegrityFinding
import com.ihadrs.mobile.data.models.IntegrityFindingType
import com.ihadrs.mobile.data.models.IntegrityScanResult
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.data.repository.ThreatRepository
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceIntegrityScanner @Inject constructor(
    @ApplicationContext private val context: Context,
    private val threatRepository: ThreatRepository
) {
    suspend fun scanAndReport(): IntegrityScanResult {
        val result = scan()
        result.findings
            .filter { it.severity in setOf(Severity.HIGH, Severity.CRITICAL) }
            .forEach { finding ->
                threatRepository.report(
                    ThreatEvent(
                        id = "integrity-${finding.type}-${finding.packageName ?: finding.title}".hashCode().toString(),
                        title = finding.title,
                        description = finding.detail,
                        packageName = finding.packageName,
                        severity = finding.severity,
                        category = AttackCategory.DEVICE_COMPROMISE,
                        timestamp = result.scannedAt,
                        triggeredRules = listOf("INTEGRITY-${finding.type.name}"),
                        mitreTechniques = listOf("MOBILE-DEVICE-INTEGRITY"),
                        remediation = finding.recommendedActions
                    )
                )
            }
        return result
    }

    fun scan(): IntegrityScanResult {
        val findings = mutableListOf<IntegrityFinding>()
        findings += rootIndicators()
        findings += debuggingFindings()
        findings += deviceAdminFindings()
        findings += accessibilityFindings()
        findings += vpnAppFindings()
        findings += permissionFindings()
        val score = findings.sumOf { it.score }.coerceIn(0, 100)
        return IntegrityScanResult(
            scannedAt = System.currentTimeMillis(),
            riskScore = score,
            rootedOrTampered = findings.any { it.type == IntegrityFindingType.ROOT_INDICATOR },
            activeDeviceAdmins = findings.count { it.type == IntegrityFindingType.DEVICE_ADMIN },
            enabledAccessibilityServices = findings.count { it.type == IntegrityFindingType.ACCESSIBILITY_SERVICE },
            vpnApps = findings.count { it.type == IntegrityFindingType.VPN_APP },
            locationCapableApps = findings.count { it.type in setOf(IntegrityFindingType.LOCATION_PERMISSION, IntegrityFindingType.BACKGROUND_LOCATION) },
            findings = findings.sortedByDescending { it.score }
        )
    }

    private fun rootIndicators(): List<IntegrityFinding> {
        val indicators = mutableListOf<String>()
        if (Build.TAGS?.contains("test-keys") == true) indicators += "build is signed with test-keys"
        ROOT_PATHS.filter { File(it).exists() }.forEach { indicators += "root binary/path present: $it" }
        ROOT_PACKAGES.filter { isPackageInstalled(it) }.forEach { indicators += "root management package installed: $it" }
        return if (indicators.isEmpty()) {
            emptyList()
        } else {
            listOf(
                IntegrityFinding(
                    type = IntegrityFindingType.ROOT_INDICATOR,
                    title = "Root or tamper indicators detected",
                    detail = indicators.joinToString("; "),
                    severity = Severity.CRITICAL,
                    score = 70,
                    recommendedActions = CRITICAL_ACTIONS
                )
            )
        }
    }

    private fun debuggingFindings(): List<IntegrityFinding> {
        val adbEnabled = Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1
        return if (adbEnabled) {
            listOf(
                IntegrityFinding(
                    IntegrityFindingType.DEBUGGING_ENABLED,
                    "USB debugging is enabled",
                    "ADB/USB debugging increases risk if a computer or malicious accessory is trusted.",
                    severity = Severity.MEDIUM,
                    score = 20,
                    recommendedActions = listOf("Disable Developer options/USB debugging when not actively using it.", "Revoke USB debugging authorizations.")
                )
            )
        } else {
            emptyList()
        }
    }

    private fun deviceAdminFindings(): List<IntegrityFinding> {
        val manager = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return manager.activeAdmins.orEmpty().map { component ->
            val packageName = component.packageName
            val appName = labelFor(packageName)
            IntegrityFinding(
                IntegrityFindingType.DEVICE_ADMIN,
                "Device Admin app active: $appName",
                "Device Admin apps can lock the screen, enforce policies, or make removal harder.",
                packageName = packageName,
                appName = appName,
                severity = if (packageName.startsWith("com.android.")) Severity.LOW else Severity.MEDIUM,
                score = if (packageName.startsWith("com.android.")) 5 else 25,
                recommendedActions = listOf("Open Android Device Admin apps.", "Disable unknown admin apps.", "Uninstall the app if you do not recognize it.")
            )
        }
    }

    private fun accessibilityFindings(): List<IntegrityFinding> {
        val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES).orEmpty()
        if (enabled.isBlank()) return emptyList()
        return enabled.split(':').mapNotNull { service ->
            val component = ComponentName.unflattenFromString(service) ?: return@mapNotNull null
            val packageName = component.packageName
            val appName = labelFor(packageName)
            IntegrityFinding(
                IntegrityFindingType.ACCESSIBILITY_SERVICE,
                "Accessibility service enabled: $appName",
                "Accessibility can read screen text and perform actions. Spyware commonly abuses this permission.",
                packageName = packageName,
                appName = appName,
                severity = if (packageName.startsWith("com.android.")) Severity.LOW else Severity.HIGH,
                score = if (packageName.startsWith("com.android.")) 5 else 40,
                recommendedActions = listOf("Open Accessibility settings.", "Disable services you do not explicitly need.", "Uninstall unknown accessibility apps.")
            )
        }
    }

    private fun vpnAppFindings(): List<IntegrityFinding> {
        val services = context.packageManager.queryIntentServices(Intent(VpnService.SERVICE_INTERFACE), PackageManager.GET_META_DATA)
        return services.mapNotNull { service ->
            val packageName = service.serviceInfo?.packageName ?: return@mapNotNull null
            val appName = labelFor(packageName)
            IntegrityFinding(
                IntegrityFindingType.VPN_APP,
                "VPN/proxy-capable app installed: $appName",
                "VPN-capable apps can route device traffic. Unknown VPN apps are high risk.",
                packageName = packageName,
                appName = appName,
                severity = if (packageName == context.packageName) Severity.LOW else Severity.MEDIUM,
                score = if (packageName == context.packageName) 0 else 20,
                recommendedActions = listOf("Open Android VPN settings.", "Remove unknown VPN/proxy apps.", "Keep only VPNs you intentionally installed.")
            )
        }
    }

    private fun permissionFindings(): List<IntegrityFinding> {
        val flags = PackageManager.GET_PERMISSIONS
        val packages = context.packageManager.getInstalledPackages(flags)
        return packages.flatMap { pkg ->
            val requested = pkg.requestedPermissions.orEmpty().toSet()
            val appInfo = pkg.applicationInfo
            val system = appInfo?.flags?.and(ApplicationInfo.FLAG_SYSTEM) != 0
            val packageName = pkg.packageName
            val appName = labelFor(packageName)
            buildList {
                if (Manifest.permission.ACCESS_BACKGROUND_LOCATION in requested) {
                    add(
                        IntegrityFinding(
                            IntegrityFindingType.BACKGROUND_LOCATION,
                            "Background location access: $appName",
                            "This app can request location while not in the foreground.",
                            packageName,
                            appName,
                            severity = if (system) Severity.LOW else Severity.MEDIUM,
                            score = if (system) 5 else 25,
                            recommendedActions = LOCATION_ACTIONS
                        )
                    )
                } else if (Manifest.permission.ACCESS_FINE_LOCATION in requested || Manifest.permission.ACCESS_COARSE_LOCATION in requested) {
                    add(
                        IntegrityFinding(
                            IntegrityFindingType.LOCATION_PERMISSION,
                            "Location-capable app: $appName",
                            "This app has requested location permission. Review whether it still needs it.",
                            packageName,
                            appName,
                            severity = Severity.LOW,
                            score = if (system) 1 else 5,
                            recommendedActions = LOCATION_ACTIONS
                        )
                    )
                }
                if (Manifest.permission.SYSTEM_ALERT_WINDOW in requested && !system) {
                    add(
                        IntegrityFinding(
                            IntegrityFindingType.SCREEN_CAPTURE_RISK,
                            "Overlay-capable app: $appName",
                            "Overlay permissions can be abused for phishing or hiding UI.",
                            packageName,
                            appName,
                            severity = Severity.MEDIUM,
                            score = 20,
                            recommendedActions = listOf("Review Display over other apps permission.", "Disable overlays for unknown apps.")
                        )
                    )
                }
            }
        }
    }

    private fun isPackageInstalled(packageName: String): Boolean =
        runCatching { context.packageManager.getPackageInfo(packageName, 0) }.isSuccess

    private fun labelFor(packageName: String): String =
        runCatching {
            val info = context.packageManager.getApplicationInfo(packageName, 0)
            context.packageManager.getApplicationLabel(info).toString()
        }.getOrDefault(packageName)

    private companion object {
        val ROOT_PATHS = listOf("/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/app/Superuser.apk", "/data/adb/magisk")
        val ROOT_PACKAGES = listOf("com.topjohnwu.magisk", "eu.chainfire.supersu", "com.noshufou.android.su", "com.koushikdutta.superuser")
        val LOCATION_ACTIONS = listOf("Open app settings.", "Set location to Deny or While using only.", "Disable precise/background location if not needed.")
        val CRITICAL_ACTIONS = listOf(
            "Back up important data.",
            "Change account passwords from a trusted device.",
            "Check Device Admin, Accessibility, VPN apps, and unknown apps.",
            "If compromise is likely, factory reset and update firmware."
        )
    }
}
