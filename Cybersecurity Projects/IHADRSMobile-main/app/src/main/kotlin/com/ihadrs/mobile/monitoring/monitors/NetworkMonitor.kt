package com.ihadrs.mobile.monitoring.monitors

import com.ihadrs.mobile.data.repository.NetworkRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkMonitor @Inject constructor(
    private val repository: NetworkRepository
) : BaseMonitor {
    override val name = "Network"
    override suspend fun start() {
        repository.record(host = "local-device", protocol = "system")
    }
    override suspend fun stop() = Unit
}
