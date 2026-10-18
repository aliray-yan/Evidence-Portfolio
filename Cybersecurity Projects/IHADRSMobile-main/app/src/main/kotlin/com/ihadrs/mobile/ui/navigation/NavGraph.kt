package com.ihadrs.mobile.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ihadrs.mobile.ui.screens.apps.AppDetailScreen
import com.ihadrs.mobile.ui.screens.apps.AppsScreen
import com.ihadrs.mobile.ui.screens.auth.AuthViewModel
import com.ihadrs.mobile.ui.screens.auth.LoginScreen
import com.ihadrs.mobile.ui.screens.dashboard.DashboardScreen
import com.ihadrs.mobile.ui.screens.incidents.IncidentDetailScreen
import com.ihadrs.mobile.ui.screens.incidents.IncidentsScreen
import com.ihadrs.mobile.ui.screens.help.HelpScreen
import com.ihadrs.mobile.ui.screens.network.NetworkScreen
import com.ihadrs.mobile.ui.screens.integrity.IntegrityScreen
import com.ihadrs.mobile.ui.screens.onboarding.OnboardingScreen
import com.ihadrs.mobile.ui.screens.onboarding.OnboardingViewModel
import com.ihadrs.mobile.ui.screens.scan.ScanScreen
import com.ihadrs.mobile.ui.screens.settings.SettingsScreen
import com.ihadrs.mobile.ui.screens.threats.ThreatDetailScreen
import com.ihadrs.mobile.ui.screens.threats.ThreatsScreen
import com.ihadrs.mobile.ui.screens.timeline.TimelineScreen

@Composable
fun NavGraph(
    onboardingViewModel: OnboardingViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val onboardingCompleted by onboardingViewModel.onboardingCompleted.collectAsState()
    val authPreferences by authViewModel.preferences.collectAsState()
    val authenticated by authViewModel.authenticated.collectAsState()
    val authRequired = authPreferences.authEnabled && authPreferences.authPasswordHash.isNotBlank() && !authenticated
    val authSetupRequired = authPreferences.authEnabled && authPreferences.authPasswordHash.isBlank()
    val tabs = listOf(Screen.Dashboard, Screen.Incidents, Screen.Timeline, Screen.Network, Screen.Integrity, Screen.Threats, Screen.Apps, Screen.Scan, Screen.Settings, Screen.Help)
    val entry by navController.currentBackStackEntryAsState()
    val currentRoute = entry?.destination?.route
    val currentTitle = tabs.firstOrNull { it.route == currentRoute }?.title
        ?: when (currentRoute) {
            Screen.ThreatDetail.route -> Screen.ThreatDetail.title
            Screen.IncidentDetail.route -> Screen.IncidentDetail.title
            Screen.AppDetail.route -> Screen.AppDetail.title
            else -> "IHADRS Mobile"
        }

    LaunchedEffect(onboardingCompleted, authSetupRequired, authRequired, authenticated, currentRoute) {
        if (onboardingCompleted && currentRoute == Screen.Onboarding.route) {
            navController.navigate(if (authSetupRequired || authRequired) Screen.Login.route else Screen.Dashboard.route) {
                popUpTo(Screen.Onboarding.route) { inclusive = true }
            }
        }
        if (onboardingCompleted && (authSetupRequired || authRequired) && currentRoute !in listOf(Screen.Onboarding.route, Screen.Login.route)) {
            navController.navigate(Screen.Login.route) {
                popUpTo(currentRoute ?: Screen.Dashboard.route) { inclusive = true }
            }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            if (currentRoute != Screen.Onboarding.route && currentRoute != Screen.Login.route) {
                AppNavigationMenu(
                    title = currentTitle,
                    tabs = tabs,
                    currentRoute = currentRoute,
                    onNavigate = { screen ->
                        navController.navigate(screen.route) { launchSingleTop = true }
                    }
                )
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = when {
                !onboardingCompleted -> Screen.Onboarding.route
                authSetupRequired || authRequired -> Screen.Login.route
                else -> Screen.Dashboard.route
            }
        ) {
            composable(Screen.Onboarding.route) {
                OnboardingScreen(
                    padding = padding,
                    onFinished = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Onboarding.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Login.route) {
                LoginScreen(
                    padding = padding,
                    viewModel = authViewModel,
                    onAuthenticated = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Dashboard.route) { DashboardScreen(padding) }
            composable(Screen.Incidents.route) {
                IncidentsScreen(
                    padding = padding,
                    onIncidentClick = { navController.navigate(Screen.IncidentDetail.route(it)) }
                )
            }
            composable(Screen.IncidentDetail.route) {
                IncidentDetailScreen(
                    padding = padding,
                    onDismissed = { navController.popBackStack() }
                )
            }
            composable(Screen.Timeline.route) { TimelineScreen(padding) }
            composable(Screen.Network.route) { NetworkScreen(padding) }
            composable(Screen.Integrity.route) { IntegrityScreen(padding) }
            composable(Screen.Threats.route) { ThreatsScreen(padding, onThreatClick = { navController.navigate(Screen.ThreatDetail.route(it)) }) }
            composable(Screen.ThreatDetail.route) {
                ThreatDetailScreen(
                    padding = padding,
                    onDismissed = { navController.popBackStack() }
                )
            }
            composable(Screen.Apps.route) { AppsScreen(padding, onAppClick = { navController.navigate(Screen.AppDetail.route(it)) }) }
            composable(Screen.AppDetail.route) { AppDetailScreen(padding) }
            composable(Screen.Scan.route) { ScanScreen(padding) }
            composable(Screen.Settings.route) { SettingsScreen(padding) }
            composable(Screen.Help.route) { HelpScreen(padding) }
        }
    }
}

@Composable
private fun AppNavigationMenu(
    title: String,
    tabs: List<Screen>,
    currentRoute: String?,
    onNavigate: (Screen) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Box {
            TextButton(onClick = { expanded = true }) {
                Text("Menu")
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                tabs.forEach { screen ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = if (screen.route == currentRoute) "${screen.title} *" else screen.title
                            )
                        },
                        onClick = {
                            expanded = false
                            onNavigate(screen)
                        }
                    )
                }
            }
        }
    }
}


