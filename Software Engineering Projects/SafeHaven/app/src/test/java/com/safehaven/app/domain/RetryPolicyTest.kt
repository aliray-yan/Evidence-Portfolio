package com.safehaven.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RetryPolicyTest {
    @Test fun backoffGrowsAndCaps() {
        assertEquals(0L, RetryPolicy.backoffMs(0))
        assertEquals(15_000L, RetryPolicy.backoffMs(1))
        assertEquals(30_000L, RetryPolicy.backoffMs(2))
        assertEquals(60_000L, RetryPolicy.backoffMs(3))
        assertEquals(120_000L, RetryPolicy.backoffMs(4))
        assertEquals(120_000L, RetryPolicy.backoffMs(40))
    }

    @Test fun permanentFailuresAreNotRetried() {
        assertFalse(RetryPolicy.canRetry(FailureCode.NO_TELEPHONY, 1))
        assertFalse(RetryPolicy.canRetry(FailureCode.NULL_PDU, 1))
    }

    @Test fun temporaryFailuresRetryUntilTheLimit() {
        assertTrue(RetryPolicy.canRetry(FailureCode.NO_SERVICE, 1))
        assertTrue(RetryPolicy.canRetry(FailureCode.NO_SERVICE, RetryPolicy.MAX_ATTEMPTS - 1))
        assertFalse(RetryPolicy.canRetry(FailureCode.NO_SERVICE, RetryPolicy.MAX_ATTEMPTS))
    }

    @Test fun unknownReasonIsTreatedAsRetryable() = assertTrue(RetryPolicy.canRetry(null, 1))

    @Test fun dueOnlyAfterBackoff() {
        assertTrue(RetryPolicy.isDue(2, null, 1_000L))
        assertFalse(RetryPolicy.isDue(2, 1_000L, 20_000L))
        assertTrue(RetryPolicy.isDue(2, 1_000L, 31_000L))
    }
}
