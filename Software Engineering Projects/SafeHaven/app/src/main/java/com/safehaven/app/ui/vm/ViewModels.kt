package com.safehaven.app.ui.vm

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.safehaven.app.AppContainer
import com.safehaven.app.SafeHavenApplication
import com.safehaven.app.data.db.AuditEventEntity
import com.safehaven.app.data.db.ContactEntity
import com.safehaven.app.data.db.IncidentEntity
import com.safehaven.app.data.db.LocationUpdateEntity
import com.safehaven.app.data.db.NotificationEventEntity
import com.safehaven.app.data.prefs.AppSettings
import com.safehaven.app.data.repo.ContactsRepository
import com.safehaven.app.domain.ActivationMethod
import com.safehaven.app.domain.EventKind
import com.safehaven.app.emergency.EmergencyDispatcher
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private fun AndroidViewModel.container(): AppContainer = getApplication<SafeHavenApplication>().container

private fun <T> Flow<T>.eagerly(vm: AndroidViewModel, initial: T): StateFlow<T> =
    stateIn(vm.viewModelScope, SharingStarted.Eagerly, initial)

/** What the root navigation needs to decide where to start and when to jump to the active SOS. */
data class RootState(val activeIncidentId: String?, val onboardingDone: Boolean)

class RootViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()
    val state: StateFlow<RootState?> = combine(c.incidents.observeActive(), c.settings.settings) { active, s ->
        RootState(active?.id, s.onboardingDone)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, null)
}

class SetupViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()
    val settings: StateFlow<AppSettings> = c.settings.settings.eagerly(this, AppSettings())

    fun saveAndFinish(name: String, onDone: () -> Unit) {
        viewModelScope.launch {
            c.settings.setUserName(name)
            c.settings.setOnboardingDone(true)
            onDone()
        }
    }
}

class DashboardViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()
    val settings: StateFlow<AppSettings> = c.settings.settings.eagerly(this, AppSettings())

    /** Null until the first database read, so the UI never mistakes "loading" for "no contacts". */
    val enabledContactCount: StateFlow<Int?> =
        c.contacts.observe().map<List<ContactEntity>, Int?> { list -> list.count { it.enabled } }.eagerly(this, null)

    val lastIncident: StateFlow<IncidentEntity?> =
        c.incidents.observeHistory().map { it.firstOrNull() }.eagerly(this, null)
}

class SosViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()

    /**
     * Persists the incident first, then starts the foreground service. Runs in the application
     * scope so leaving the countdown screen cannot cancel it half way. Calling it twice is safe.
     */
    fun activate() {
        c.applicationScope.launch {
            val silent = c.settings.current().silentMode
            c.incidents.activate(ActivationMethod.ON_SCREEN_BUTTON, silent)
            c.controller.start()
            if (!silent) c.controller.vibrateOnce()
        }
    }
}

class ActiveViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()

    val settings: StateFlow<AppSettings> = c.settings.settings.eagerly(this, AppSettings())
    val incident: StateFlow<IncidentEntity?> = c.incidents.observeActive().eagerly(this, null)

    @OptIn(ExperimentalCoroutinesApi::class)
    val events: StateFlow<List<NotificationEventEntity>> = c.incidents.observeActive()
        .flatMapLatest { active -> if (active == null) flowOf(emptyList()) else c.incidents.observeEvents(active.id) }
        .eagerly(this, emptyList())

    /** Retries failed alerts immediately, ignoring the normal backoff. */
    fun retryNow() {
        val id = incident.value?.id ?: return
        c.applicationScope.launch { c.dispatcher.syncAndSend(id, force = true) }
    }

    /** Ends the SOS, then tells contacts it ended (if enabled). Runs in the application scope. */
    fun endSos() {
        val id = incident.value?.id ?: return
        c.applicationScope.launch {
            if (c.incidents.resolve(id)) c.dispatcher.notifyResolved(id)
        }
    }

    /** Opens the phone's own SMS app with the alert text, for when automatic SMS is not possible. */
    suspend fun manualSmsIntent(event: NotificationEventEntity): Intent? {
        val id = event.incidentId ?: return null
        val text = c.dispatcher.manualAlertText(id) ?: return null
        c.incidents.log(id, "MANUAL_SMS_APP_OPENED", "for ${com.safehaven.app.domain.PhoneNumber.mask(event.recipientPhone)}")
        return Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${event.recipientPhone}"))
            .putExtra("sms_body", text)
    }
}

class ContactsViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()
    val contacts: StateFlow<List<ContactEntity>> = c.contacts.observe().eagerly(this, emptyList())

    suspend fun save(id: String?, name: String, phone: String, relationship: String): ContactsRepository.SaveResult =
        c.contacts.save(id, name, phone, relationship)

    fun setEnabled(id: String, enabled: Boolean) {
        viewModelScope.launch { c.contacts.setEnabled(id, enabled) }
    }

    fun delete(id: String) {
        viewModelScope.launch { c.contacts.delete(id) }
    }

    suspend fun sendTest(id: String): EmergencyDispatcher.TestResult = c.dispatcher.sendTest(id)
}

class HistoryViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()
    val incidents: StateFlow<List<IncidentEntity>> = c.incidents.observeHistory().eagerly(this, emptyList())
}

class IncidentDetailViewModel(app: Application, handle: SavedStateHandle) : AndroidViewModel(app) {
    private val c = container()
    private val id: String = checkNotNull(handle["id"])

    val incident: StateFlow<IncidentEntity?> = c.incidents.observeIncident(id).eagerly(this, null)
    val events: StateFlow<List<NotificationEventEntity>> = c.incidents.observeEvents(id).eagerly(this, emptyList())
    val locations: StateFlow<List<LocationUpdateEntity>> = c.incidents.observeLocations(id).eagerly(this, emptyList())
    val audit: StateFlow<List<AuditEventEntity>> = c.incidents.observeAudit(id).eagerly(this, emptyList())

    fun delete(onDone: () -> Unit) {
        viewModelScope.launch {
            if (c.incidents.deleteResolved(id)) onDone()
        }
    }
}

class SettingsViewModel(app: Application) : AndroidViewModel(app) {
    private val c = container()
    val settings: StateFlow<AppSettings> = c.settings.settings.eagerly(this, AppSettings())

    fun setName(value: String) = launch { c.settings.setUserName(value) }
    fun setHoldMillis(value: Int) = launch { c.settings.setHoldMillis(value) }
    fun setCountdown(value: Int) = launch { c.settings.setCountdownSeconds(value) }
    fun setSilent(value: Boolean) = launch { c.settings.setSilentMode(value) }
    fun setInterval(value: Int) = launch { c.settings.setUpdateIntervalMinutes(value) }
    fun setNotifyOnResolve(value: Boolean) = launch { c.settings.setNotifyOnResolve(value) }
    fun setEmergencyNumber(value: String) = launch { c.settings.setEmergencyNumber(value) }

    private fun launch(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }
}
