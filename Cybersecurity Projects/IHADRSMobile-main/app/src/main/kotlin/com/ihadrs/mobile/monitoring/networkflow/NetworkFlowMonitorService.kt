package com.ihadrs.mobile.monitoring.networkflow

import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.ihadrs.mobile.R
import com.ihadrs.mobile.core.Constants

class NetworkFlowMonitorService : Service() {
    override fun onCreate() {
        super.onCreate()
        startForeground(
            Constants.NETWORK_FLOW_NOTIFICATION_ID,
            NotificationCompat.Builder(this, Constants.MONITORING_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_shield)
                .setContentTitle("Mobile EDR network monitoring active")
                .setContentText("Monitoring network metadata only. HTTPS content is not decrypted.")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopService(Intent(this, LocalVpnMonitorService::class.java).setAction(LocalVpnMonitorService.ACTION_STOP))
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                if (VpnService.prepare(this) == null) {
                    startService(Intent(this, LocalVpnMonitorService::class.java).setAction(LocalVpnMonitorService.ACTION_START))
                }
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_START = "com.ihadrs.mobile.action.START_NETWORK_FLOW_MONITOR"
        const val ACTION_STOP = "com.ihadrs.mobile.action.STOP_NETWORK_FLOW_MONITOR"

        fun startIntent(context: Context): Intent =
            Intent(context, NetworkFlowMonitorService::class.java).setAction(ACTION_START)

        fun stopIntent(context: Context): Intent =
            Intent(context, NetworkFlowMonitorService::class.java).setAction(ACTION_STOP)
    }
}
