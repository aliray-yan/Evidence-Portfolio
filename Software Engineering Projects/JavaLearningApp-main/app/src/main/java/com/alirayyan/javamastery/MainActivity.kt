package com.alirayyan.javamastery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.alirayyan.javamastery.data.Curriculum
import com.alirayyan.javamastery.data.CurriculumRepository
import com.alirayyan.javamastery.data.ProgressStore
import com.alirayyan.javamastery.data.UserProgress
import com.alirayyan.javamastery.ui.JavaMasteryApp
import com.alirayyan.javamastery.ui.theme.JavaMasteryTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val progressStore = remember { ProgressStore(applicationContext) }
            val progress by progressStore.progress.collectAsState(initial = UserProgress())
            var curriculum by remember { mutableStateOf<Curriculum?>(null) }
            var loadError by remember { mutableStateOf<String?>(null) }

            LaunchedEffect(Unit) {
                runCatching {
                    CurriculumRepository(applicationContext).loadCurriculum()
                }.onSuccess {
                    curriculum = it
                }.onFailure {
                    loadError = it.message ?: "Could not load curriculum."
                }
            }

            JavaMasteryTheme(darkTheme = progress.darkMode) {
                val loadedCurriculum = curriculum
                if (loadedCurriculum == null) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        if (loadError == null) {
                            CircularProgressIndicator()
                        } else {
                            androidx.compose.material3.Text(
                                text = loadError ?: "Could not load curriculum.",
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                } else {
                    JavaMasteryApp(
                        curriculum = loadedCurriculum,
                        progress = progress,
                        progressStore = progressStore
                    )
                }
            }
        }
    }
}
