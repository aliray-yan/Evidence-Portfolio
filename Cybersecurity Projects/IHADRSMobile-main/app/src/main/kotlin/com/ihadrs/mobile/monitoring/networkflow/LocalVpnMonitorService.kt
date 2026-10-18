package com.ihadrs.mobile.monitoring.networkflow

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.util.concurrent.atomic.AtomicBoolean

class LocalVpnMonitorService : VpnService() {
    private val running = AtomicBoolean(false)
    private var vpnInterface: ParcelFileDescriptor? = null
    private var packetThread: Thread? = null
    private val parser = PacketParser()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> stopMonitor()
            else -> startMonitor()
        }
        return START_STICKY
    }

    private fun startMonitor() {
        if (running.getAndSet(true)) return

        // Scaffold only: a full VPN must forward packets back to the network.
        // Until that forwarding loop is implemented, we do not establish a TUN
        // interface here because doing so would break normal app connectivity.
        if (!EXPERIMENTAL_TUN_CAPTURE_ENABLED) {
            running.set(false)
            stopSelf()
            return
        }

        vpnInterface = Builder()
            .setSession("IHADRS Network Flow Monitor")
            .addAddress("10.10.10.2", 32)
            .addRoute("0.0.0.0", 0)
            .setMtu(1500)
            .establish()

        val descriptor = vpnInterface?.fileDescriptor ?: return
        packetThread = Thread {
            val buffer = ByteArray(32767)
            FileInputStream(descriptor).use { input ->
                while (running.get()) {
                    val length = input.read(buffer)
                    if (length > 0) {
                        val packet = buffer.copyOf(length)
                        parser.parse(packet)
                        // TODO: aggregate ParsedPacket into NetworkFlow, attribute UID
                        // with ConnectivityManager.getConnectionOwnerUid on API 29+,
                        // and forward/drop packets according to explicit user policy.
                    }
                }
            }
        }.apply { start() }
    }

    private fun stopMonitor() {
        running.set(false)
        packetThread?.interrupt()
        packetThread = null
        vpnInterface?.close()
        vpnInterface = null
        stopSelf()
    }

    override fun onDestroy() {
        stopMonitor()
        super.onDestroy()
    }

    companion object {
        const val ACTION_START = "com.ihadrs.mobile.action.START_LOCAL_VPN_MONITOR"
        const val ACTION_STOP = "com.ihadrs.mobile.action.STOP_LOCAL_VPN_MONITOR"
        private const val EXPERIMENTAL_TUN_CAPTURE_ENABLED = false

        fun prepareIntent(context: Context): Intent? = prepare(context)
    }
}
