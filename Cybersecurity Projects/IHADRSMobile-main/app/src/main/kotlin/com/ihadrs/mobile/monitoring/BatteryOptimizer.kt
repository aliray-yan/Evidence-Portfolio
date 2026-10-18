package com.ihadrs.mobile.monitoring

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.PowerManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class BatteryOptimizer @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun batteryLevel(): Int {
        val manager = context.getSystemService(BatteryManager::class.java)
        return manager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
    }

    fun isCharging(): Boolean {
        val intent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
    }

    fun isInteractive(): Boolean =
        context.getSystemService(PowerManager::class.java)?.isInteractive ?: true
}
