package com.safehaven.app.domain

import com.safehaven.app.domain.DeliveryStatus.DELIVERED
import com.safehaven.app.domain.DeliveryStatus.FAILED
import com.safehaven.app.domain.DeliveryStatus.PENDING
import com.safehaven.app.domain.DeliveryStatus.SENDING
import com.safehaven.app.domain.DeliveryStatus.SENT
import com.safehaven.app.domain.DeliveryStatus.UNAVAILABLE
import org.junit.Assert.assertEquals
import org.junit.Test

class StatusReducerTest {
    private fun status(vararg s: DeliveryStatus, ack: Boolean = false, resolved: Boolean = false) =
        StatusReducer.compute(s.toList(), ack, resolved)

    @Test fun noEventsMeansCreated() = assertEquals(IncidentStatus.CREATED, status())

    @Test fun allPendingIsQueued() = assertEquals(IncidentStatus.QUEUED, status(PENDING, PENDING))

    @Test fun anySendingIsSending() = assertEquals(IncidentStatus.SENDING, status(SENDING, PENDING))

    @Test fun sentPlusPendingIsStillSending() = assertEquals(IncidentStatus.SENDING, status(SENT, PENDING))

    @Test fun sentWithoutDeliveryReportIsNeverDelivered() =
        assertEquals(IncidentStatus.SENT, status(SENT, SENT))

    @Test fun sentAndFailedMixIsSent() = assertEquals(IncidentStatus.SENT, status(SENT, FAILED))

    @Test fun allDeliveredIsDelivered() = assertEquals(IncidentStatus.DELIVERED, status(DELIVERED, DELIVERED))

    @Test fun someDeliveredIsPartial() {
        assertEquals(IncidentStatus.PARTIALLY_DELIVERED, status(DELIVERED, SENT))
        assertEquals(IncidentStatus.PARTIALLY_DELIVERED, status(DELIVERED, FAILED))
        assertEquals(IncidentStatus.PARTIALLY_DELIVERED, status(DELIVERED, PENDING))
    }

    @Test fun everythingFailedIsFailed() {
        assertEquals(IncidentStatus.FAILED, status(FAILED, FAILED))
        assertEquals(IncidentStatus.FAILED, status(FAILED, UNAVAILABLE))
    }

    @Test fun acknowledgementOutranksDelivery() =
        assertEquals(IncidentStatus.ACKNOWLEDGED, status(SENT, ack = true))

    @Test fun resolvedOutranksEverything() =
        assertEquals(IncidentStatus.RESOLVED, status(FAILED, ack = true, resolved = true))
}
