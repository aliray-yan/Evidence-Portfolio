package com.ihadrs.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = IhadrsBlue,
    secondary = IhadrsCyan,
    tertiary = IhadrsGreen,
    error = IhadrsRed,
    background = IhadrsSurface,
    surface = IhadrsPanel,
    outline = IhadrsLine,
    onSurface = IhadrsInk,
    onBackground = IhadrsInk
)

private val DarkColors = darkColorScheme(
    primary = IhadrsCyan,
    secondary = IhadrsBlue,
    tertiary = IhadrsGreen,
    error = IhadrsRed
)

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(6.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(8.dp),
    extraLarge = RoundedCornerShape(8.dp)
)

@Composable
fun IHADRSTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
