package com.ihadrs.mobile.response

import com.ihadrs.mobile.data.models.ThreatEvent
import javax.inject.Inject

class ResponseManager @Inject constructor() {
    fun recommendedActions(event: ThreatEvent): List<String> = event.remediation
}
