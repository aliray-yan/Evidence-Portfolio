package com.ihadrs.mobile.monitoring.monitors

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FileMonitor @Inject constructor() : BaseMonitor {
    override val name = "Files"
    override suspend fun start() = Unit
    override suspend fun stop() = Unit
}
