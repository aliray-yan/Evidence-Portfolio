package com.ihadrs.mobile.monitoring.monitors

interface BaseMonitor {
    val name: String
    suspend fun start()
    suspend fun stop()
}
