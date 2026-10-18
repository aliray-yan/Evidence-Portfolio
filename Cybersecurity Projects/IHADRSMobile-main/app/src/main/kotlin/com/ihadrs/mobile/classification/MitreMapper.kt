package com.ihadrs.mobile.classification

import javax.inject.Inject

class MitreMapper @Inject constructor() {
    fun nameFor(techniqueId: String): String = when (techniqueId) {
        "T1476" -> "Deliver Malicious App via Authorized App Store"
        "T1660" -> "Phishing"
        "T1437" -> "Application Layer Protocol"
        else -> "Unmapped mobile technique"
    }
}
