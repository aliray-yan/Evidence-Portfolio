package com.ihadrs.mobile.core

import android.app.Application
import com.ihadrs.mobile.monitoring.workers.DeepScanWorker
import com.ihadrs.mobile.data.repository.SocIntegrationRepository
import com.ihadrs.mobile.utils.NotificationHelper
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class IHADRSApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createChannels(this)
        DeepScanWorker.schedule(this)
        SocIntegrationRepository.scheduleSync(this)
    }
}
