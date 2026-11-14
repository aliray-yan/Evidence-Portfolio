package com.safehaven.app.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.safehaven.app.ui.screens.ActiveScreen
import com.safehaven.app.ui.screens.ContactsScreen
import com.safehaven.app.ui.screens.CountdownScreen
import com.safehaven.app.ui.screens.DashboardScreen
import com.safehaven.app.ui.screens.HistoryScreen
import com.safehaven.app.ui.screens.IncidentDetailScreen
import com.safehaven.app.ui.screens.SetupScreen
import com.safehaven.app.ui.screens.SettingsScreen
import com.safehaven.app.ui.vm.RootViewModel

private object Routes {
    const val SETUP = "setup"
    const val DASHBOARD = "dashboard"
    const val COUNTDOWN = "countdown/{seconds}"
    const val ACTIVE = "active"
    const val CONTACTS = "contacts"
    const val HISTORY = "history"
    const val SETTINGS = "settings"
    const val INCIDENT = "incident/{id}"
    fun incident(id: String) = "incident/$id"
    fun countdown(seconds: Int) = "countdown/$seconds"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.DASHBOARD, "Home", Icons.Default.Home),
    Tab(Routes.CONTACTS, "Contacts", Icons.Default.Person),
    Tab(Routes.HISTORY, "History", Icons.AutoMirrored.Filled.List),
    Tab(Routes.SETTINGS, "Settings", Icons.Default.Settings),
)

@Composable
fun SafeHavenRoot(rootViewModel: RootViewModel = viewModel()) {
    val root by rootViewModel.state.collectAsStateWithLifecycle()
    val state = root
    if (state == null) {
        Box(Modifier.fillMaxSize())
        return
    }

    // Chosen once, from the first database read: resume an active SOS, else onboarding, else home.
    val startRoute = remember {
        when {
            state.activeIncidentId != null -> Routes.ACTIVE
            !state.onboardingDone -> Routes.SETUP
            else -> Routes.DASHBOARD
        }
    }

    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    // Jump to the active-SOS screen when an incident starts, and leave it when the incident ends.
    LaunchedEffect(state.activeIncidentId) {
        val route = navController.currentDestination?.route
        if (state.activeIncidentId != null && route != Routes.ACTIVE) {
            navController.navigate(Routes.ACTIVE) {
                popUpTo(0)
                launchSingleTop = true
            }
        } else if (state.activeIncidentId == null && route == Routes.ACTIVE) {
            navController.navigate(Routes.DASHBOARD) {
                popUpTo(0)
                launchSingleTop = true
            }
        }
    }

    Scaffold(
        bottomBar = {
            if (tabs.any { it.route == currentRoute }) {
                NavigationBar {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(Routes.DASHBOARD) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startRoute,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.SETUP) {
                SetupScreen(onDone = {
                    if (navController.previousBackStackEntry != null) {
                        navController.popBackStack()
                    } else {
                        navController.navigate(Routes.DASHBOARD) {
                            popUpTo(Routes.SETUP) { inclusive = true }
                        }
                    }
                })
            }
            composable(Routes.DASHBOARD) {
                DashboardScreen(
                    onOpenSetup = { navController.navigate(Routes.SETUP) },
                    onOpenContacts = { navController.navigate(Routes.CONTACTS) },
                    onOpenHistory = { navController.navigate(Routes.HISTORY) },
                    onOpenIncident = { navController.navigate(Routes.incident(it)) },
                    onStartCountdown = { seconds -> navController.navigate(Routes.countdown(seconds)) },
                )
            }
            composable(
                route = Routes.COUNTDOWN,
                arguments = listOf(navArgument("seconds") { type = NavType.IntType }),
            ) { entry ->
                CountdownScreen(
                    seconds = (entry.arguments?.getInt("seconds") ?: 5).coerceAtLeast(1),
                    onCancel = { navController.popBackStack() },
                )
            }
            composable(Routes.ACTIVE) {
                ActiveScreen(onOpenSetup = { navController.navigate(Routes.SETUP) })
            }
            composable(Routes.CONTACTS) { ContactsScreen() }
            composable(Routes.HISTORY) {
                HistoryScreen(onOpenIncident = { navController.navigate(Routes.incident(it)) })
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(onOpenSetup = { navController.navigate(Routes.SETUP) })
            }
            composable(
                route = Routes.INCIDENT,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) {
                IncidentDetailScreen(onDeleted = { navController.popBackStack() })
            }
        }
    }
}
