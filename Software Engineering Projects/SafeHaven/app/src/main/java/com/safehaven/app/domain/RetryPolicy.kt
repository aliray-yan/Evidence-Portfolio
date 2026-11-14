package com.safehaven.app.domain

/** Backoff and eligibility rules for re-sending a failed alert. */
object RetryPolicy {
    const val MAX_ATTEMPTS = 6

    /** A message stuck in SENDING for longer than this never got a callback from the phone. */
    const val STALE_SENDING_MS = 90_000L

    fun backoffMs(attempts: Int): Long = when {
        attempts <= 0 -> 0L
        attempts == 1 -> 15_000L
        attempts == 2 -> 30_000L
        attempts == 3 -> 60_000L
        else -> 120_000L
    }

    fun canRetry(code: FailureCode?, attempts: Int): Boolean =
        (code?.retryable ?: true) && attempts < MAX_ATTEMPTS

    fun isDue(attempts: Int, lastAttemptAt: Long?, now: Long): Boolean =
        lastAttemptAt == null || now - lastAttemptAt >= backoffMs(attempts)
}
