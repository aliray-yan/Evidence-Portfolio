package com.ihadrs.mobile.detection.intel

data class NormalizedUrl(
    val original: String,
    val normalized: String,
    val host: String,
    val path: String
)
