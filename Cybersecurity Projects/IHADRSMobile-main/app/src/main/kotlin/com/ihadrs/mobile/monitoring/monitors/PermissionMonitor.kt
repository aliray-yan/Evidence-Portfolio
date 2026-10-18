package com.ihadrs.mobile.monitoring.monitors

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PermissionMonitor @Inject constructor() : BaseMonitor {
    override val name = "Permissions"
    override suspend fun start() = Unit
    override suspend fun stop() = Unit
}
