package com.safehaven.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.safehaven.app.data.db.NotificationEventEntity
import com.safehaven.app.domain.DeliveryStatus
import com.safehaven.app.domain.EventKind
import com.safehaven.app.domain.IncidentStatus
import com.safehaven.app.domain.RetryPolicy
import com.safehaven.app.ui.theme.StatusColors
import java.text.DateFormat
import java.util.Date

fun IncidentStatus.label(): String = when (this) {
    IncidentStatus.CREATED -> "Created"
    IncidentStatus.QUEUED -> "Queued"
    IncidentStatus.SENDING -> "Sending"
    IncidentStatus.SENT -> "Sent, not yet confirmed"
    IncidentStatus.PARTIALLY_DELIVERED -> "Partly delivered"
    IncidentStatus.DELIVERED -> "Delivered"
    IncidentStatus.ACKNOWLEDGED -> "Acknowledged"
    IncidentStatus.ESCALATED -> "Escalated"
    IncidentStatus.RESOLVED -> "Ended"
    IncidentStatus.FAILED -> "Not sent"
}

/** Plain-language meaning of each status. Never claims more than the phone actually reported. */
fun IncidentStatus.explanation(): String = when (this) {
    IncidentStatus.CREATED -> "Your SOS is saved on this phone. Alerts are about to be queued."
    IncidentStatus.QUEUED -> "Alerts are queued and will go out in a moment."
    IncidentStatus.SENDING -> "Handing your alerts to the mobile network."
    IncidentStatus.SENT ->
        "Your alerts left this phone. The network has not confirmed that a contact's phone received them."
    IncidentStatus.PARTIALLY_DELIVERED ->
        "Some contacts' phones confirmed receipt. Others have not confirmed yet."
    IncidentStatus.DELIVERED -> "Every contact's phone confirmed receipt. That does not mean they have read it."
    IncidentStatus.ACKNOWLEDGED -> "A contact acknowledged your alert."
    IncidentStatus.ESCALATED -> "Escalation rules have been applied."
    IncidentStatus.RESOLVED -> "This SOS was ended."
    IncidentStatus.FAILED -> "No alert could be sent. SafeHaven keeps trying. You can also call or message someone yourself."
}

@Composable
fun IncidentStatus.color(): Color = when (this) {
    IncidentStatus.DELIVERED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.RESOLVED -> StatusColors.success()
    IncidentStatus.FAILED -> StatusColors.danger()
    IncidentStatus.CREATED, IncidentStatus.QUEUED, IncidentStatus.SENDING, IncidentStatus.SENT,
    IncidentStatus.PARTIALLY_DELIVERED, IncidentStatus.ESCALATED,
    -> StatusColors.warning()
}

fun DeliveryStatus.label(): String = when (this) {
    DeliveryStatus.PENDING -> "Waiting"
    DeliveryStatus.SENDING -> "Sending"
    DeliveryStatus.SENT -> "Sent"
    DeliveryStatus.DELIVERED -> "Delivered"
    DeliveryStatus.FAILED -> "Failed"
    DeliveryStatus.UNAVAILABLE -> "Unavailable"
}

@Composable
fun DeliveryStatus.color(): Color = when (this) {
    DeliveryStatus.DELIVERED -> StatusColors.success()
    DeliveryStatus.FAILED, DeliveryStatus.UNAVAILABLE -> StatusColors.danger()
    DeliveryStatus.PENDING, DeliveryStatus.SENDING, DeliveryStatus.SENT -> StatusColors.warning()
}

fun EventKind.label(): String = when (this) {
    EventKind.INITIAL -> "Alert"
    EventKind.LOCATION_UPDATE -> "Location update"
    EventKind.RESOLVED -> "SOS ended notice"
    EventKind.TEST -> "Test message"
}

fun NotificationEventEntity.detail(): String = when (status) {
    DeliveryStatus.PENDING -> "Waiting to be sent"
    DeliveryStatus.SENDING -> "Handing to the mobile network (attempt $attempts)"
    DeliveryStatus.SENT -> "Left this phone. Delivery not confirmed by the network."
    DeliveryStatus.DELIVERED -> "Their phone confirmed receipt"
    DeliveryStatus.FAILED -> {
        val reason = failureCode?.label ?: "Unknown error"
        val retrying = kind == EventKind.INITIAL && RetryPolicy.canRetry(failureCode, attempts)
        if (retrying) "$reason. Will retry." else reason
    }
    DeliveryStatus.UNAVAILABLE -> "Not available on this device"
}

fun formatDateTime(ms: Long): String =
    DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(ms))

fun formatTimeOnly(ms: Long): String = DateFormat.getTimeInstance(DateFormat.MEDIUM).format(Date(ms))

fun formatAge(ms: Long): String {
    val s = (ms / 1000).coerceAtLeast(0)
    return when {
        s < 60 -> "${s}s ago"
        s < 3600 -> "${s / 60} min ago"
        else -> "${s / 3600} h ${(s % 3600) / 60} min ago"
    }
}
