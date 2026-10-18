package com.ihadrs.mobile.classification

import com.ihadrs.mobile.data.models.AppInfo
import javax.inject.Inject

class AppRiskExplainer @Inject constructor() {
    fun explain(appInfo: AppInfo): List<String> = buildList {
        add("Overall risk score is ${appInfo.riskScore}/100.")
        if (appInfo.fromUnknownSource) {
            add("The app appears to come from outside the trusted installer list, so review it carefully.")
        }
        if (appInfo.systemApp) {
            add("This is a system app, so some permissions may be required by the device.")
        }
        sensitivePermissions(appInfo).takeIf { it.isNotEmpty() }?.let {
            add("Sensitive permissions detected: ${it.joinToString()}.")
        }
        if (appInfo.riskScore >= 80) {
            add("Recommended action: remove the app unless you fully trust it.")
        } else if (appInfo.riskScore >= 50) {
            add("Recommended action: review permissions and disable anything unnecessary.")
        } else {
            add("No high-risk indicators crossed the current threshold.")
        }
    }

    fun sensitivePermissions(appInfo: AppInfo): List<String> =
        appInfo.requestedPermissions
            .filter { permission -> sensitiveSignals.any { permission.contains(it) } }
            .map { it.substringAfterLast('.') }
            .distinct()
            .sorted()

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
            "BIND_ACCESSIBILITY_SERVICE",
            "REQUEST_INSTALL_PACKAGES"
        )
    }
}
