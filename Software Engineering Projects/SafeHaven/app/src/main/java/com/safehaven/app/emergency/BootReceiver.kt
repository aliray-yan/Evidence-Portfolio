package com.safehaven.app.emergency

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.safehaven.app.SafeHavenApplication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** After a reboot or app update, picks an unfinished SOS back up from the database. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val container = (context.applicationContext as SafeHavenApplication).container
        val pending = goAsync()
        container.applicationScope.launch(Dispatchers.IO) {
            try {
                val active = container.incidents.getActive()
                if (active != null) {
                    container.incidents.log(active.id, "RESUMED_AFTER_RESTART", intent.action)
                    container.controller.resumeAfterRestart()
                }
            } catch (t: Throwable) {
                Log.e("BootReceiver", "Could not resume the active incident", t)
            } finally {
                pending.finish()
            }
        }
    }
}
