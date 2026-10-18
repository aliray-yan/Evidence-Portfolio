package com.ihadrs.mobile.monitoring.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ihadrs.mobile.domain.usecases.monitoring.StartMonitoringUseCase
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {
    @Inject lateinit var startMonitoring: StartMonitoringUseCase

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            startMonitoring.startFromReceiver()
        }
    }
}
