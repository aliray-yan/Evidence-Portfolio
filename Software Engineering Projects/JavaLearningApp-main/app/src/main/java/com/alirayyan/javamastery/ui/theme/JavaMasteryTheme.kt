package com.alirayyan.javamastery.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF1E6AFF),
    onPrimary = Color.White,
    secondary = Color(0xFF12A67A),
    tertiary = Color(0xFFE59A23),
    background = Color(0xFFF7F8FC),
    surface = Color.White,
    surfaceVariant = Color(0xFFE8ECF6),
    onBackground = Color(0xFF172033),
    onSurface = Color(0xFF172033)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF8CB3FF),
    onPrimary = Color(0xFF08275C),
    secondary = Color(0xFF5FD6B1),
    tertiary = Color(0xFFFFCA7A),
    background = Color(0xFF10141F),
    surface = Color(0xFF171C29),
    surfaceVariant = Color(0xFF293044),
    onBackground = Color(0xFFE9ECF5),
    onSurface = Color(0xFFE9ECF5)
)

@Composable
fun JavaMasteryTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors: ColorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colors,
        typography = MaterialTheme.typography,
        content = content
    )
}
