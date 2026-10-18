package com.ihadrs.mobile.data.repository

import android.content.Context
import com.ihadrs.mobile.data.models.TimelineEvent
import com.ihadrs.mobile.domain.usecases.incidents.Incident
import com.ihadrs.mobile.domain.usecases.incidents.IncidentBuilder
import com.ihadrs.mobile.domain.usecases.incidents.IncidentSource
import com.ihadrs.mobile.utils.PermissionHelper
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine

@Singleton
class IncidentRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val threatRepository: ThreatRepository,
    private val timelineRepository: TimelineRepository,
    private val settingsRepository: SettingsRepository,
    private val builder: IncidentBuilder
) {
    fun observeIncidents(): Flow<List<Incident>> =
        combine(
            threatRepository.observeThreats(),
            timelineRepository.observeRecent(),
            settingsRepository.preferences
        ) { threats, timeline, preferences ->
            val incidents = builder.build(IncidentSource(threats, timeline))
            val selfProtection = builder.selfProtectionIncident(
                buildList {
                    if (!preferences.monitoringEnabled) add("Live monitoring is disabled")
                    if (!PermissionHelper.hasNotificationPermission(context)) add("Threat notifications are not allowed")
                    if (!PermissionHelper.isIgnoringBatteryOptimizations(context)) add("Battery optimization may limit background monitoring")
                    if (preferences.authEnabled && preferences.authPasswordHash.isBlank()) add("Local login is enabled but not configured")
                }
            )
            if (selfProtection == null) incidents else listOf(selfProtection) + incidents
        }

    suspend fun getIncident(id: String): Incident? {
        val source = IncidentSource(
            threats = threatRepository.getActiveThreats(),
            timeline = timelineRepository.getRecent()
        )
        val incidents = builder.build(source).toMutableList()
        val preferences = settingsRepository.currentPreferences()
        builder.selfProtectionIncident(
            buildList {
                if (!preferences.monitoringEnabled) add("Live monitoring is disabled")
                if (!PermissionHelper.hasNotificationPermission(context)) add("Threat notifications are not allowed")
                if (!PermissionHelper.isIgnoringBatteryOptimizations(context)) add("Battery optimization may limit background monitoring")
            }
        )?.let { incidents += it }
        return incidents.firstOrNull { it.id == id }
    }

    suspend fun dismissIncident(id: String) {
        getIncident(id)?.threatIds.orEmpty().forEach { threatRepository.dismissThreat(it) }
    }
}
