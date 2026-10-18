package com.ihadrs.mobile.classification

import com.ihadrs.mobile.data.models.ThreatEvent
import javax.inject.Inject

class ThreatClassifier @Inject constructor() {
    fun label(event: ThreatEvent): String = "${event.category.name}: ${event.severity.name}"
}
