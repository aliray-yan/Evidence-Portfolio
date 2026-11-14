package com.safehaven.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Navy = Color(0xFF101C35)
val PrimaryBlue = Color(0xFF2563EB)
val EmergencyRed = Color(0xFFDC2626)
val SuccessGreen = Color(0xFF16A34A)

private val LightColors = lightColorScheme(
    primary = PrimaryBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCE7FD),
    onPrimaryContainer = Navy,
    secondary = Navy,
    onSecondary = Color.White,
    background = Color(0xFFF8FAFC),
    onBackground = Navy,
    surface = Color.White,
    onSurface = Navy,
    surfaceVariant = Color(0xFFE9EEF6),
    onSurfaceVariant = Color(0xFF3B4863),
    error = EmergencyRed,
    onError = Color.White,
    errorContainer = Color(0xFFFDE2E2),
    onErrorContainer = Color(0xFF7F1D1D),
    outline = Color(0xFF8793AA),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7FA4FF),
    onPrimary = Color(0xFF0B1B45),
    primaryContainer = Color(0xFF1E3A8A),
    onPrimaryContainer = Color(0xFFDCE7FD),
    secondary = Color(0xFFB9C6E4),
    onSecondary = Navy,
    background = Color(0xFF0B1220),
    onBackground = Color(0xFFE6ECF8),
    surface = Color(0xFF111A2E),
    onSurface = Color(0xFFE6ECF8),
    surfaceVariant = Color(0xFF1B2640),
    onSurfaceVariant = Color(0xFFB4BFD6),
    error = Color(0xFFF87171),
    onError = Color(0xFF450A0A),
    errorContainer = Color(0xFF7F1D1D),
    onErrorContainer = Color(0xFFFDE2E2),
    outline = Color(0xFF6B7794),
)

/** Status colours that stay readable in both themes. Always shown together with a text label. */
object StatusColors {
    @Composable
    fun success(): Color = if (isSystemInDarkTheme()) Color(0xFF4ADE80) else Color(0xFF15803D)

    @Composable
    fun warning(): Color = if (isSystemInDarkTheme()) Color(0xFFFBBF24) else Color(0xFFB45309)

    @Composable
    fun danger(): Color = if (isSystemInDarkTheme()) Color(0xFFF87171) else Color(0xFFB91C1C)

    @Composable
    fun neutral(): Color = if (isSystemInDarkTheme()) Color(0xFFB4BFD6) else Color(0xFF3B4863)
}

@Composable
fun SafeHavenTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        typography = Typography(),
        content = content,
    )
}
