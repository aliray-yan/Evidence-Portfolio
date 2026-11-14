package com.safehaven.app.emergency

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.safehaven.app.domain.LocationFix
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

/**
 * GPS access. Uses Google's Fused Location Provider and falls back to the plain Android
 * LocationManager on phones without Google Play services.
 */
class LocationProvider(private val context: Context) {

    private val fused by lazy { LocationServices.getFusedLocationProviderClient(context) }

    fun hasPermission(): Boolean =
        granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION)

    fun servicesEnabled(): Boolean {
        val manager = context.getSystemService(LocationManager::class.java) ?: return false
        return LocationManagerCompat.isLocationEnabled(manager)
    }

    /** Newest cached fix from any source. Returns immediately; may be old, so check [LocationFix.timeMs]. */
    @SuppressLint("MissingPermission")
    suspend fun lastKnown(): LocationFix? {
        if (!hasPermission()) return null
        val fromFused = try {
            fused.lastLocation.await()?.toFix()
        } catch (e: Exception) {
            null
        }
        return listOfNotNull(fromFused, lastKnownFromManager()).maxByOrNull { it.timeMs }
    }

    /** Asks for a fresh high-accuracy fix and gives up after [timeoutMs]. */
    @SuppressLint("MissingPermission")
    suspend fun currentFix(timeoutMs: Long): LocationFix? {
        if (!hasPermission()) return null
        val cancellation = CancellationTokenSource()
        return try {
            withTimeoutOrNull(timeoutMs) {
                fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellation.token).await()?.toFix()
            }
        } catch (e: Exception) {
            null
        } finally {
            cancellation.cancel()
        }
    }

    /** Continuous high-accuracy updates for the duration of an incident. Cancel the collector to stop. */
    @SuppressLint("MissingPermission")
    fun updates(intervalMs: Long): Flow<LocationFix> = callbackFlow {
        val fusedCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) trySend(location.toFix())
            }
        }
        var fusedStarted = false
        try {
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
                .setMinUpdateIntervalMillis(intervalMs / 2)
                .build()
            fused.requestLocationUpdates(request, fusedCallback, Looper.getMainLooper())
            fusedStarted = true
        } catch (e: SecurityException) {
            close(e)
        } catch (e: Exception) {
            // Google Play services unavailable: fall back to the platform GPS provider below.
        }

        val manager = context.getSystemService(LocationManager::class.java)
        val platformListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                trySend(location.toFix())
            }

            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}

            @Deprecated("Required on API < 30")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        }
        var platformStarted = false
        if (!fusedStarted && manager != null) {
            try {
                manager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    intervalMs,
                    0f,
                    platformListener,
                    Looper.getMainLooper(),
                )
                platformStarted = true
            } catch (e: Exception) {
                close(e)
            }
        }

        awaitClose {
            if (fusedStarted) fused.removeLocationUpdates(fusedCallback)
            if (platformStarted) manager?.removeUpdates(platformListener)
        }
    }

    @SuppressLint("MissingPermission")
    private fun lastKnownFromManager(): LocationFix? {
        val manager = context.getSystemService(LocationManager::class.java) ?: return null
        return try {
            manager.getProviders(true)
                .mapNotNull { provider ->
                    try {
                        manager.getLastKnownLocation(provider)
                    } catch (e: SecurityException) {
                        null
                    }
                }
                .maxByOrNull { it.time }
                ?.toFix()
        } catch (e: Exception) {
            null
        }
    }

    private fun granted(permission: String) =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    private fun Location.toFix() = LocationFix(
        latitude = latitude,
        longitude = longitude,
        accuracyM = if (hasAccuracy()) accuracy else null,
        speedMps = if (hasSpeed()) speed else null,
        bearingDeg = if (hasBearing()) bearing else null,
        timeMs = time,
    )
}
