package com.ihadrs.mobile.monitoring.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.ihadrs.mobile.R
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.ui.MainActivity

object MonitoringNotification {
    fun build(context: Context): Notification {
        val openIntent = PendingIntent.getActivity(
            context,
            1,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val stopIntent = PendingIntent.getService(
            context,
            2,
            Intent(context, MonitoringService::class.java).setAction(Constants.ACTION_STOP_MONITORING),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(context, Constants.MONITORING_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle(context.getString(R.string.monitoring_active_title))
            .setContentText(context.getString(R.string.monitoring_active_text))
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(R.drawable.ic_shield, "Open", openIntent)
            .addAction(R.drawable.ic_stop, "Stop", stopIntent)
            .build()
    }
}
