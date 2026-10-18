package com.ihadrs.mobile.detection.analyzers

import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.data.models.AppPolicyStatus
import com.ihadrs.mobile.domain.models.Severity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AppAnalyzerTest {
    private val analyzer = AppAnalyzer(PermissionAnalyzer())

    @Test
    fun analyze_doesNotAlertTrustedHighPermissionSocialApp() {
        val event = analyzer.analyze(
            AppInfo(
                packageName = "com.facebook.katana",
                appName = "Facebook",
                versionName = "1",
                installTime = 0L,
                updateTime = 0L,
                requestedPermissions = listOf(
                    "android.permission.CAMERA",
                    "android.permission.RECORD_AUDIO",
                    "android.permission.ACCESS_FINE_LOCATION",
                    "android.permission.READ_CONTACTS"
                ),
                riskScore = 60,
                fromUnknownSource = false,
                systemApp = false
            )
        )

        assertNull(event)
    }

    @Test
    fun analyze_doesNotAlertSystemApp() {
        val event = analyzer.analyze(
            AppInfo(
                packageName = "com.android.bluetooth",
                appName = "Bluetooth",
                versionName = "1",
                installTime = 0L,
                updateTime = 0L,
                requestedPermissions = listOf("android.permission.ACCESS_FINE_LOCATION"),
                riskScore = 35,
                fromUnknownSource = false,
                systemApp = true
            )
        )

        assertNull(event)
    }

    @Test
    fun analyze_alertsUnknownSourceAppWithCriticalPermission() {
        val event = analyzer.analyze(
            AppInfo(
                packageName = "example.sideloaded.sms",
                appName = "SideLoaded SMS Tool",
                versionName = "1",
                installTime = 0L,
                updateTime = 0L,
                requestedPermissions = listOf("android.permission.READ_SMS"),
                riskScore = 45,
                fromUnknownSource = true,
                systemApp = false
            )
        )

        assertTrue(event != null)
        assertEquals(Severity.MEDIUM, event!!.severity)
        assertTrue(event.description.contains("outside trusted installers"))
    }

    @Test
    fun analyze_suppressesTrustedPolicy() {
        val event = analyzer.analyze(
            AppInfo(
                packageName = "example.trusted",
                appName = "Trusted Tool",
                versionName = "1",
                installTime = 0L,
                updateTime = 0L,
                requestedPermissions = listOf("android.permission.READ_SMS"),
                riskScore = 95,
                fromUnknownSource = true,
                systemApp = false
            ),
            AppPolicyStatus.TRUSTED
        )

        assertNull(event)
    }

    @Test
    fun analyze_alertsBlockedPolicy() {
        val event = analyzer.analyze(
            AppInfo(
                packageName = "example.blocked",
                appName = "Blocked App",
                versionName = "1",
                installTime = 0L,
                updateTime = 0L,
                riskScore = 0,
                fromUnknownSource = false,
                systemApp = false
            ),
            AppPolicyStatus.BLOCKED
        )

        assertTrue(event != null)
        assertEquals("Blocked app present", event!!.title)
    }
}
