package com.safehaven.app.emergency

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import android.telephony.SmsMessage
import android.util.Log
import com.safehaven.app.SafeHavenApplication
import com.safehaven.app.domain.FailureCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Receives the carrier/phone callbacks for every SMS segment and writes them to the database.
 * This is what lets the app say "sent" or "delivered" only when the phone actually reported it.
 */
class SmsStatusReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        // safehaven://sms/{eventId}/{attempt}/{kind}/{index}
        val segments = intent.data?.pathSegments ?: return
        if (segments.size < 4) return
        val eventId = segments[0]
        val attempt = segments[1].toIntOrNull() ?: return
        val kind = segments[2]
        val code = resultCode

        // Decode the delivery report on the receiver thread; the Intent is only valid here.
        val deliveryOutcome = if (kind == KIND_DELIVERED) deliveryOutcome(intent) else null

        val container = (context.applicationContext as SafeHavenApplication).container
        val pending = goAsync()
        container.applicationScope.launch(Dispatchers.IO) {
            try {
                if (kind == KIND_SENT) {
                    val failure = if (code == Activity.RESULT_OK) null else failureFor(code)
                    container.incidents.onPartSent(eventId, attempt, failure)
                } else if (kind == KIND_DELIVERED) {
                    container.incidents.onPartDelivery(eventId, attempt, deliveryOutcome)
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Could not record SMS status for $eventId", t)
            } finally {
                pending.finish()
            }
        }
    }

    /**
     * true  = recipient's handset confirmed receipt
     * false = carrier reports permanent failure
     * null  = still in progress, or the report could not be read (we then claim nothing)
     */
    private fun deliveryOutcome(intent: Intent): Boolean? {
        val pdu = intent.getByteArrayExtra("pdu") ?: return null
        return try {
            val status = SmsMessage.createFromPdu(pdu, intent.getStringExtra("format")).status
            when {
                status == 0 -> true
                status >= 64 -> false
                else -> null
            }
        } catch (t: Exception) {
            null
        }
    }

    private fun failureFor(resultCode: Int): FailureCode = when (resultCode) {
        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> FailureCode.GENERIC
        SmsManager.RESULT_ERROR_RADIO_OFF -> FailureCode.RADIO_OFF
        SmsManager.RESULT_ERROR_NULL_PDU -> FailureCode.NULL_PDU
        SmsManager.RESULT_ERROR_NO_SERVICE -> FailureCode.NO_SERVICE
        SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> FailureCode.LIMIT_EXCEEDED
        else -> FailureCode.UNKNOWN
    }

    companion object {
        const val ACTION = "com.safehaven.app.SMS_STATUS"
        const val KIND_SENT = "sent"
        const val KIND_DELIVERED = "delivered"
        private const val TAG = "SmsStatusReceiver"
    }
}
