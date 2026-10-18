package com.ihadrs.mobile.monitoring.monitors

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@Singleton
class MonitorOrchestrator @Inject constructor(
    appMonitor: AppMonitor,
    networkMonitor: NetworkMonitor,
    smsMonitor: SmsMonitor,
    permissionMonitor: PermissionMonitor,
    fileMonitor: FileMonitor
) {
    private val monitors = listOf(appMonitor, networkMonitor, smsMonitor, permissionMonitor, fileMonitor)
    private val mutex = Mutex()
    private var running = false

    suspend fun startAll() = mutex.withLock {
        if (running) return@withLock
        monitors.forEach { it.start() }
        running = true
    }

    suspend fun stopAll() = mutex.withLock {
        monitors.asReversed().forEach { it.stop() }
        running = false
    }
}
