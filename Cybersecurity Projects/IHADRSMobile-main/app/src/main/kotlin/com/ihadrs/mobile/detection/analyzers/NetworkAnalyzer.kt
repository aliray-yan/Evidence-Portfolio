package com.ihadrs.mobile.detection.analyzers

import javax.inject.Inject

class NetworkAnalyzer @Inject constructor() {
    fun isSuspicious(host: String): Boolean =
        host.endsWith(".zip", ignoreCase = true) || host.contains("login-verify", ignoreCase = true)
}
