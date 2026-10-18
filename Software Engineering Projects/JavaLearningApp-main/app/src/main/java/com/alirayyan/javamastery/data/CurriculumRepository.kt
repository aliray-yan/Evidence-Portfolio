package com.alirayyan.javamastery.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

class CurriculumRepository(private val context: Context) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    suspend fun loadCurriculum(): Curriculum = withContext(Dispatchers.IO) {
        context.assets.open("curriculum.json").bufferedReader().use { reader ->
            json.decodeFromString(Curriculum.serializer(), reader.readText())
        }
    }
}
