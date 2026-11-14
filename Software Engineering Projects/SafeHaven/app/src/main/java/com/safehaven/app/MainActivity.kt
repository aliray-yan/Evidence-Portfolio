package com.safehaven.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.safehaven.app.ui.SafeHavenRoot
import com.safehaven.app.ui.theme.SafeHavenTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SafeHavenTheme {
                SafeHavenRoot()
            }
        }
    }
}
