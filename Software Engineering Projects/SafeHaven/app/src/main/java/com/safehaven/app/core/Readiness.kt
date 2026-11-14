package com.safehaven.app.core

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat

/** A snapshot of everything an SOS depends on. Shown on the dashboard so problems surface before an emergency. */
data class Readiness(
    val fineLocation: Boolean,
    val coarseLocation: Boolean,
    val sms: Boolean,
    val notifications: Boolean,
    val locationServicesOn: Boolean,
    val telephony: Boolean,
    val online: Boolean,
) {
    val anyLocation: Boolean get() = fineLocation || coarseLocation
    val smsReady: Boolean get() = sms && telephony
    val allGood: Boolean get() = smsReady && anyLocation && locationServicesOn
}

object ReadinessChecker {
    fun check(context: Context): Readiness {
        fun granted(permission: String) =
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

        val locationManager = context.getSystemService(LocationManager::class.java)
        val connectivity = context.getSystemService(ConnectivityManager::class.java)
        val capabilities = connectivity?.getNetworkCapabilities(connectivity.activeNetwork)

        return Readiness(
            fineLocation = granted(Manifest.permission.ACCESS_FINE_LOCATION),
            coarseLocation = granted(Manifest.permission.ACCESS_COARSE_LOCATION),
            sms = granted(Manifest.permission.SEND_SMS),
            notifications = Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS),
            locationServicesOn = locationManager != null && LocationManagerCompat.isLocationEnabled(locationManager),
            telephony = context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY),
            online = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true,
        )
    }
}
