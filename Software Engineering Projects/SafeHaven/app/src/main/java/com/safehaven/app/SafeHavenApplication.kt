package com.safehaven.app

import android.app.Application
import com.safehaven.app.emergency.Notifications
import java.io.File
import org.osmdroid.config.Configuration

class SafeHavenApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        Notifications.createChannels(this)
        configureMapTiles()
    }

    /** OpenStreetMap tile servers require an identifying user agent; the cache stays in app-private storage. */
    private fun configureMapTiles() {
        val config = Configuration.getInstance()
        config.userAgentValue = packageName
        config.osmdroidBasePath = File(cacheDir, "osmdroid")
        config.osmdroidTileCache = File(cacheDir, "osmdroid/tiles")
    }
}
