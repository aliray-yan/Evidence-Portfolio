package com.safehaven.app.domain

/**
 * Derives the incident status from the delivery state of the initial alert to each contact.
 * Pure function so the rules are easy to test and cannot drift between screens.
 */
object StatusReducer {

    fun compute(
        initial: List<DeliveryStatus>,
        acknowledged: Boolean,
        resolved: Boolean,
    ): IncidentStatus {
        if (resolved) return IncidentStatus.RESOLVED
        if (acknowledged) return IncidentStatus.ACKNOWLEDGED
        if (initial.isEmpty()) return IncidentStatus.CREATED

        val delivered = initial.count { it == DeliveryStatus.DELIVERED }
        if (delivered == initial.size) return IncidentStatus.DELIVERED
        if (delivered > 0) return IncidentStatus.PARTIALLY_DELIVERED

        if (initial.all { it == DeliveryStatus.FAILED || it == DeliveryStatus.UNAVAILABLE }) {
            return IncidentStatus.FAILED
        }
        if (initial.any { it == DeliveryStatus.SENDING }) return IncidentStatus.SENDING
        if (initial.any { it == DeliveryStatus.PENDING }) {
            return if (initial.any { it == DeliveryStatus.SENT }) IncidentStatus.SENDING else IncidentStatus.QUEUED
        }
        // Only SENT and FAILED/UNAVAILABLE remain, with at least one SENT.
        return IncidentStatus.SENT
    }
}
