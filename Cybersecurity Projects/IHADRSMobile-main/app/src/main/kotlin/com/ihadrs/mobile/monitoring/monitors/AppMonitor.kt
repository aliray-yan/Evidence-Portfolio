package com.ihadrs.mobile.monitoring.monitors

import com.ihadrs.mobile.data.repository.AppRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppMonitor @Inject constructor(
    private val appRepository: AppRepository
) : BaseMonitor {
    override val name = "Apps"
    override suspend fun start() {
        appRepository.refreshInstalledApps()
    }
    override suspend fun stop() = Unit
}
