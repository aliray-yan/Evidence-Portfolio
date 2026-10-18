package com.ihadrs.mobile.monitoring.monitors

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SmsMonitor @Inject constructor() : BaseMonitor {
    override val name = "SMS"
    override suspend fun start() = Unit
    override suspend fun stop() = Unit
}
