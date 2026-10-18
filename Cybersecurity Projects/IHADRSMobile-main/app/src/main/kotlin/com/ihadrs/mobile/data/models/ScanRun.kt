package com.ihadrs.mobile.data.models

data class ScanRun(
    val id: String,
    val startedAt: Long,
    val finishedAt: Long,
    val scannedApps: Int,
    val findings: Int,
    val status: String
)
