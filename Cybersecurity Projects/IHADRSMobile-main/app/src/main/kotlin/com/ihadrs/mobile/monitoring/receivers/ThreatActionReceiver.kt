package com.ihadrs.mobile.monitoring.receivers

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.repository.ThreatRepository
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@AndroidEntryPoint
class ThreatActionReceiver : BroadcastReceiver() {
    @Inject lateinit var threatRepository: ThreatRepository

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Constants.ACTION_DISMISS_THREAT) return
        val threatId = intent.getStringExtra(Constants.EXTRA_THREAT_ID) ?: return
        val pendingResult = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                threatRepository.dismissThreat(threatId)
                context.getSystemService(NotificationManager::class.java)
                    ?.cancel(threatId.hashCode())
            } finally {
                pendingResult.finish()
            }
        }
    }
}
