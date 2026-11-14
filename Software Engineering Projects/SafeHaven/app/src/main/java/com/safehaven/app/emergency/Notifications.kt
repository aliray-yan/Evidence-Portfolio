package com.safehaven.app.emergency

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.safehaven.app.MainActivity
import com.safehaven.app.R

object Notifications {
    const val CHANNEL_DISCREET = "incident_discreet"
    const val CHANNEL_ALERT = "incident_alert"
    const val CHANNEL_ATTENTION = "needs_attention"

    const val ID_FOREGROUND = 1001
    const val ID_ATTENTION = 1002
    const val ID_WORKER = 1003

    fun createChannels(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        val discreet = NotificationChannel(
            CHANNEL_DISCREET,
            "SOS running (quiet)",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Quiet status notification while an SOS is active in silent mode."
            setSound(null, null)
            enableVibration(false)
            setShowBadge(false)
            lockscreenVisibility = Notification.VISIBILITY_SECRET
        }

        val alert = NotificationChannel(
            CHANNEL_ALERT,
            "SOS active",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Status notification while an SOS is active."
            enableVibration(true)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }

        val attention = NotificationChannel(
            CHANNEL_ATTENTION,
            "Needs attention",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Shown when an SOS needs you to open the app, for example after a restart."
        }

        manager.createNotificationChannels(listOf(discreet, alert, attention))
    }

    private fun openAppIntent(context: Context): PendingIntent = PendingIntent.getActivity(
        context,
        0,
        Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    /** The mandatory notification for the foreground service. Silent mode keeps it low-key and hidden on the lock screen. */
    fun foreground(context: Context, silent: Boolean, text: String): Notification {
        val builder = NotificationCompat.Builder(context, if (silent) CHANNEL_DISCREET else CHANNEL_ALERT)
            .setSmallIcon(R.drawable.ic_stat_shield)
            .setContentTitle(if (silent) "SafeHaven" else "SOS active")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openAppIntent(context))
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        if (silent) {
            builder.setVisibility(NotificationCompat.VISIBILITY_SECRET).setPriority(NotificationCompat.PRIORITY_LOW)
        } else {
            builder.setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_HIGH)
        }
        return builder.build()
    }

    /** Shown when an SOS is still active but the app could not resume itself (for example after a reboot). */
    @SuppressLint("MissingPermission")
    fun showResumePrompt(context: Context) {
        val allowed = Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (!allowed) return
        val notification = NotificationCompat.Builder(context, CHANNEL_ATTENTION)
            .setSmallIcon(R.drawable.ic_stat_shield)
            .setContentTitle("An SOS is still active")
            .setContentText("Tap to open SafeHaven and keep sending your location.")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openAppIntent(context))
            .build()
        NotificationManagerCompat.from(context).notify(ID_ATTENTION, notification)
    }
}
