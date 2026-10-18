package com.ihadrs.mobile.ui.navigation

sealed class Screen(val route: String, val title: String) {
    data object Onboarding : Screen("onboarding", "Welcome")
    data object Login : Screen("login", "Login")
    data object Dashboard : Screen("dashboard", "Dashboard")
    data object Incidents : Screen("incidents", "Incidents")
    data object Timeline : Screen("timeline", "Timeline")
    data object Network : Screen("network", "Network")
    data object Integrity : Screen("integrity", "Integrity")
    data object Threats : Screen("threats", "Threats")
    data object Apps : Screen("apps", "Apps")
    data object Scan : Screen("scan", "Scan")
    data object Settings : Screen("settings", "Settings")
    data object Help : Screen("help", "Manual")
    data object ThreatDetail : Screen("threats/{id}", "Threat Detail") {
        fun route(id: String) = "threats/$id"
    }
    data object IncidentDetail : Screen("incidents/{id}", "Incident Detail") {
        fun route(id: String) = "incidents/$id"
    }
    data object AppDetail : Screen("apps/{packageName}", "App Detail") {
        fun route(packageName: String) = "apps/$packageName"
    }
}


