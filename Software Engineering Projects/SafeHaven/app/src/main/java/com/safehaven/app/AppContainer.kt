package com.safehaven.app

import android.app.Application
import com.safehaven.app.data.db.SafeHavenDatabase
import com.safehaven.app.data.prefs.SettingsRepository
import com.safehaven.app.data.repo.ContactsRepository
import com.safehaven.app.data.repo.IncidentRepository
import com.safehaven.app.emergency.EmergencyController
import com.safehaven.app.emergency.EmergencyDispatcher
import com.safehaven.app.emergency.LocationProvider
import com.safehaven.app.emergency.SmsSender
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Hand-rolled dependency container: one instance per process, created lazily. */
class AppContainer(private val app: Application) {
    /** For work that must outlive any screen, such as finishing an SOS activation. */
    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val database: SafeHavenDatabase by lazy { SafeHavenDatabase.build(app) }
    val settings: SettingsRepository by lazy { SettingsRepository(app) }
    val contacts: ContactsRepository by lazy { ContactsRepository(database.contacts()) }
    val incidents: IncidentRepository by lazy { IncidentRepository(database) }
    val sms: SmsSender by lazy { SmsSender(app) }
    val location: LocationProvider by lazy { LocationProvider(app) }
    val dispatcher: EmergencyDispatcher by lazy {
        EmergencyDispatcher(incidents, contacts, settings, sms, location)
    }
    val controller: EmergencyController by lazy { EmergencyController(app) }
}
