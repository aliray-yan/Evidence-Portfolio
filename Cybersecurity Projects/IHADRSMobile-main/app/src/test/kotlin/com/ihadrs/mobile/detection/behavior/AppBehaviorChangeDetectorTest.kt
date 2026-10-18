package com.ihadrs.mobile.detection.behavior

import com.ihadrs.mobile.data.models.AppBehaviorSnapshot
import com.ihadrs.mobile.data.models.BehaviorChangeType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AppBehaviorChangeDetectorTest {
    private val detector = AppBehaviorChangeDetector()

    @Test
    fun detect_reportsSensitivePermissionAdded() {
        val changes = detector.detect(
            previous = snapshot(sensitivePermissions = listOf("CAMERA"), riskScore = 20),
            current = snapshot(sensitivePermissions = listOf("CAMERA", "READ_SMS"), riskScore = 30)
        )

        assertTrue(changes.any { it.type == BehaviorChangeType.SENSITIVE_PERMISSION_ADDED })
        assertTrue(changes.any { it.addedSensitivePermissions.contains("READ_SMS") })
    }

    @Test
    fun detect_reportsLargeRiskIncrease() {
        val changes = detector.detect(
            previous = snapshot(riskScore = 10),
            current = snapshot(riskScore = 45)
        )

        val change = changes.first { it.type == BehaviorChangeType.RISK_INCREASE }
        assertEquals(35, change.riskDelta)
        assertEquals("HIGH", change.severity)
    }

    private fun snapshot(
        sensitivePermissions: List<String> = emptyList(),
        riskScore: Int = 0
    ): AppBehaviorSnapshot =
        AppBehaviorSnapshot(
            id = "snapshot-$riskScore",
            packageName = "example.app",
            appName = "Example",
            capturedAt = riskScore.toLong(),
            riskScore = riskScore,
            permissionCount = sensitivePermissions.size,
            sensitivePermissions = sensitivePermissions,
            fromUnknownSource = false,
            systemApp = false,
            versionName = "1"
        )
}
