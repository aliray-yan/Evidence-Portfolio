package com.ihadrs.mobile.utils

import android.Manifest
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
import com.ihadrs.mobile.R
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.models.ThreatEvent
import com.ihadrs.mobile.monitoring.receivers.ThreatActionReceiver
import com.ihadrs.mobile.ui.MainActivity

object NotificationHelper {
    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val channels = listOf(
            NotificationChannel(Constants.MONITORING_CHANNEL_ID, "Monitoring", NotificationManager.IMPORTANCE_LOW),
            NotificationChannel(Constants.ALERT_CHANNEL_ID, "Threat Alerts", NotificationManager.IMPORTANCE_HIGH),
            NotificationChannel(Constants.SCAN_CHANNEL_ID, "Scans", NotificationManager.IMPORTANCE_DEFAULT)
        )
        manager.createNotificationChannels(channels)
    }

    fun showThreatAlert(context: Context, threatEvent: ThreatEvent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val intent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pendingIntent = PendingIntent.getActivity(
            context,
            threatEvent.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val dismissIntent = PendingIntent.getBroadcast(
            context,
            threatEvent.id.hashCode(),
            Intent(context, ThreatActionReceiver::class.java)
                .setAction(Constants.ACTION_DISMISS_THREAT)
                .putExtra(Constants.EXTRA_THREAT_ID, threatEvent.id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, Constants.ALERT_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_warning)
            .setContentTitle(threatEvent.title)
            .setContentText(threatEvent.description)
            .setStyle(NotificationCompat.BigTextStyle().bigText(threatEvent.description))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(R.drawable.ic_shield, "View", pendingIntent)
            .addAction(R.drawable.ic_check, "Dismiss", dismissIntent)
            .build()
        NotificationManagerCompat.from(context).notify(threatEvent.id.hashCode(), notification)
    }
}
