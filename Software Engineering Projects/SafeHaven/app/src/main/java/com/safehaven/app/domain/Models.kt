package com.safehaven.app.domain

/** Lifecycle of an emergency incident as seen by the user. */
enum class IncidentStatus {
    /** Saved on the device; nothing handed to a carrier yet. */
    CREATED,

    /** Messages are queued and waiting to be handed to the radio. */
    QUEUED,

    /** At least one message is being handed to the carrier. */
    SENDING,

    /** Every message left the phone (carrier accepted it) but no delivery report confirms receipt. */
    SENT,

    /** At least one contact's phone confirmed delivery, but not all of them. */
    PARTIALLY_DELIVERED,

    /** Every contact's phone confirmed delivery. */
    DELIVERED,

    /** A contact acknowledged the alert (needs the backend; unreachable with SMS only). */
    ACKNOWLEDGED,

    /** Escalation rules fired (Release 2). */
    ESCALATED,

    /** The user ended the SOS. */
    RESOLVED,

    /** Nothing could be sent. The incident is kept and can be retried. */
    FAILED,
}

enum class ActivationMethod {
    ON_SCREEN_BUTTON,

    /** Reserved for Release 2. */
    SHAKE,

    /** Reserved for Release 2. */
    BLE_BUTTON,
}

/** Delivery state of one message to one recipient. */
enum class DeliveryStatus { PENDING, SENDING, SENT, DELIVERED, FAILED, UNAVAILABLE }

enum class Channel {
    SMS,

    /** Reserved: needs the backend (Firebase Cloud Messaging). */
    PUSH,
}

enum class EventKind { INITIAL, LOCATION_UPDATE, RESOLVED, TEST }

/** Why a send failed, and whether trying again could help. */
enum class FailureCode(val retryable: Boolean, val label: String) {
    NO_PERMISSION(true, "SMS permission not granted"),
    NO_TELEPHONY(false, "This device cannot send SMS"),
    RADIO_OFF(true, "Airplane mode or radio off"),
    NO_SERVICE(true, "No cellular service"),
    GENERIC(true, "Carrier or phone rejected the message"),
    NULL_PDU(false, "Message could not be encoded"),
    LIMIT_EXCEEDED(true, "SMS sending limit reached"),
    NO_CALLBACK(true, "Phone never reported a result"),
    DELIVERY_REJECTED(true, "Carrier reported delivery failure"),
    UNKNOWN(true, "Unknown error"),
}

/** A single GPS reading. [timeMs] is the time of the fix, not the time we stored it. */
data class LocationFix(
    val latitude: Double,
    val longitude: Double,
    val accuracyM: Float?,
    val speedMps: Float?,
    val bearingDeg: Float?,
    val timeMs: Long,
)
