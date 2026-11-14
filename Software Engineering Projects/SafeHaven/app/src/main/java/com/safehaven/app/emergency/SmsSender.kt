package com.safehaven.app.emergency

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.telephony.SmsManager
import androidx.core.content.ContextCompat

/**
 * Hands text messages to the phone's radio and asks for two callbacks per segment:
 * "sent" (left the phone) and "delivered" (the recipient's handset acknowledged it).
 * Both are routed to [SmsStatusReceiver], which is the only place those facts are recorded.
 */
class SmsSender(private val context: Context) {

    enum class Availability { OK, NO_PERMISSION, NO_TELEPHONY }

    fun availability(): Availability {
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
            return Availability.NO_TELEPHONY
        }
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) ==
            PackageManager.PERMISSION_GRANTED
        return if (granted) Availability.OK else Availability.NO_PERMISSION
    }

    fun partCount(text: String): Int = smsManager().divideMessage(text).size

    /**
     * Throws SecurityException when SEND_SMS is missing and RuntimeException for other platform
     * refusals; the caller records those as failures.
     */
    fun send(eventId: String, attempt: Int, phone: String, text: String) {
        val manager = smsManager()
        val parts = manager.divideMessage(text)
        val sent = ArrayList<PendingIntent>(parts.size)
        val delivered = ArrayList<PendingIntent>(parts.size)
        for (index in parts.indices) {
            sent.add(callback(eventId, attempt, SmsStatusReceiver.KIND_SENT, index))
            delivered.add(callback(eventId, attempt, SmsStatusReceiver.KIND_DELIVERED, index))
        }
        if (parts.size == 1) {
            manager.sendTextMessage(phone, null, parts[0], sent[0], delivered[0])
        } else {
            manager.sendMultipartTextMessage(phone, null, parts, sent, delivered)
        }
    }

    private fun callback(eventId: String, attempt: Int, kind: String, index: Int): PendingIntent {
        // The data URI makes each PendingIntent unique, so callbacks never overwrite each other.
        val intent = Intent(context, SmsStatusReceiver::class.java)
            .setAction(SmsStatusReceiver.ACTION)
            .setData(Uri.parse("safehaven://sms/$eventId/$attempt/$kind/$index"))
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    @Suppress("DEPRECATION")
    private fun smsManager(): SmsManager =
        if (Build.VERSION.SDK_INT >= 31) context.getSystemService(SmsManager::class.java) else SmsManager.getDefault()
}
