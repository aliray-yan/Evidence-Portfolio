package com.ihadrs.mobile.classification

import com.ihadrs.mobile.data.models.ThreatEvent
import javax.inject.Inject

class ExplanationGenerator @Inject constructor() {
    fun explain(event: ThreatEvent): String =
        "${event.title}: ${event.description} Recommended actions: ${event.remediation.joinToString()}."
}
