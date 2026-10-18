package com.alirayyan.javamastery.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.max

private val Context.progressDataStore: DataStore<Preferences> by preferencesDataStore(name = "java_mastery_progress")

class ProgressStore(private val context: Context) {
    private object Keys {
        val completedLessons = stringPreferencesKey("completed_lessons")
        val quizScores = stringPreferencesKey("quiz_scores")
        val bookmarks = stringPreferencesKey("bookmarks")
        val achievements = stringPreferencesKey("achievements")
        val notes = stringPreferencesKey("notes")
        val projectGrades = stringPreferencesKey("project_grades")
        val codingDrillScores = stringPreferencesKey("coding_drill_scores")
        val studyMinutes = intPreferencesKey("study_minutes")
        val streak = intPreferencesKey("streak")
        val lastStudyDate = stringPreferencesKey("last_study_date")
        val highestUnlockedLevel = intPreferencesKey("highest_unlocked_level")
        val darkMode = booleanPreferencesKey("dark_mode")
        val practiceMode = booleanPreferencesKey("practice_mode")
    }

    val progress: Flow<UserProgress> = context.progressDataStore.data.map { prefs ->
        UserProgress(
            completedLessons = decodeSet(prefs[Keys.completedLessons]),
            quizScores = decodeIntMap(prefs[Keys.quizScores]),
            bookmarkedLessons = decodeSet(prefs[Keys.bookmarks]),
            earnedAchievements = decodeSet(prefs[Keys.achievements]),
            notes = decodeStringMap(prefs[Keys.notes]),
            projectGrades = decodeIntMap(prefs[Keys.projectGrades]),
            codingDrillScores = decodeIntMap(prefs[Keys.codingDrillScores]),
            totalStudyMinutes = prefs[Keys.studyMinutes] ?: 0,
            streakCount = prefs[Keys.streak] ?: 0,
            lastStudyDate = prefs[Keys.lastStudyDate] ?: "",
            highestUnlockedLevel = prefs[Keys.highestUnlockedLevel] ?: 0,
            darkMode = prefs[Keys.darkMode] ?: false,
            practiceMode = prefs[Keys.practiceMode] ?: true
        )
    }

    suspend fun markLessonComplete(lesson: Lesson) {
        context.progressDataStore.edit { prefs ->
            val completed = decodeSet(prefs[Keys.completedLessons]).toMutableSet()
            completed += lesson.id
            prefs[Keys.completedLessons] = encodeSet(completed)
            prefs[Keys.studyMinutes] = (prefs[Keys.studyMinutes] ?: 0) + lesson.estimatedMinutes
            updateStreak(prefs)
            applySimpleAchievements(prefs)
        }
    }

    suspend fun saveQuizScore(quizId: String, levelId: Int, score: Int) {
        context.progressDataStore.edit { prefs ->
            val scores = decodeIntMap(prefs[Keys.quizScores]).toMutableMap()
            scores[quizId] = max(scores[quizId] ?: 0, score)
            prefs[Keys.quizScores] = encodeIntMap(scores)
            if (score >= 70) {
                prefs[Keys.highestUnlockedLevel] = max(prefs[Keys.highestUnlockedLevel] ?: 0, levelId + 1)
            }
            prefs[Keys.studyMinutes] = (prefs[Keys.studyMinutes] ?: 0) + 5
            updateStreak(prefs)
            applySimpleAchievements(prefs)
        }
    }

    suspend fun toggleBookmark(lessonId: String) {
        context.progressDataStore.edit { prefs ->
            val bookmarks = decodeSet(prefs[Keys.bookmarks]).toMutableSet()
            if (!bookmarks.add(lessonId)) bookmarks.remove(lessonId)
            prefs[Keys.bookmarks] = encodeSet(bookmarks)
        }
    }

    suspend fun saveNote(lessonId: String, note: String) {
        context.progressDataStore.edit { prefs ->
            val notes = decodeStringMap(prefs[Keys.notes]).toMutableMap()
            if (note.isBlank()) {
                notes.remove(lessonId)
            } else {
                notes[lessonId] = note
            }
            prefs[Keys.notes] = encodeStringMap(notes)
        }
    }

    suspend fun saveProjectGrade(projectId: String, score: Int) {
        context.progressDataStore.edit { prefs ->
            val grades = decodeIntMap(prefs[Keys.projectGrades]).toMutableMap()
            grades[projectId] = max(grades[projectId] ?: 0, score)
            prefs[Keys.projectGrades] = encodeIntMap(grades)
            prefs[Keys.studyMinutes] = (prefs[Keys.studyMinutes] ?: 0) + 15
            updateStreak(prefs)
            applySimpleAchievements(prefs)
        }
    }

    suspend fun saveCodingDrillScore(taskId: String, score: Int) {
        context.progressDataStore.edit { prefs ->
            val scores = decodeIntMap(prefs[Keys.codingDrillScores]).toMutableMap()
            scores[taskId] = max(scores[taskId] ?: 0, score)
            prefs[Keys.codingDrillScores] = encodeIntMap(scores)
            prefs[Keys.studyMinutes] = (prefs[Keys.studyMinutes] ?: 0) + 10
            updateStreak(prefs)
            applySimpleAchievements(prefs)
        }
    }

    suspend fun setDarkMode(enabled: Boolean) {
        context.progressDataStore.edit { prefs -> prefs[Keys.darkMode] = enabled }
    }

    suspend fun setPracticeMode(enabled: Boolean) {
        context.progressDataStore.edit { prefs -> prefs[Keys.practiceMode] = enabled }
    }

    suspend fun awardAchievement(id: String) {
        context.progressDataStore.edit { prefs ->
            val achievements = decodeSet(prefs[Keys.achievements]).toMutableSet()
            achievements += id
            prefs[Keys.achievements] = encodeSet(achievements)
        }
    }

    suspend fun resetProgress() {
        context.progressDataStore.edit { prefs -> prefs.clear() }
    }

    private fun updateStreak(prefs: MutablePreferencesLike) {
        val today = todayKey()
        val last = prefs[Keys.lastStudyDate] ?: ""
        if (last == today) return

        val nextStreak = if (last == yesterdayKey()) {
            (prefs[Keys.streak] ?: 0) + 1
        } else {
            1
        }
        prefs[Keys.streak] = nextStreak
        prefs[Keys.lastStudyDate] = today
    }

    private fun applySimpleAchievements(prefs: MutablePreferencesLike) {
        val completed = decodeSet(prefs[Keys.completedLessons])
        val scores = decodeIntMap(prefs[Keys.quizScores])
        val grades = decodeIntMap(prefs[Keys.projectGrades])
        val codingScores = decodeIntMap(prefs[Keys.codingDrillScores])
        val achievements = decodeSet(prefs[Keys.achievements]).toMutableSet()

        if (completed.isNotEmpty()) achievements += "first_lesson"
        if (scores.any { it.value >= 70 }) achievements += "first_quiz"
        if ((prefs[Keys.streak] ?: 0) >= 7) achievements += "seven_day_streak"
        if (completed.size >= 10) achievements += "java_basics_completed"
        if (grades.any { it.value >= 70 }) achievements += "project_builder"
        if (codingScores.count { it.value >= 100 } >= 10) achievements += "quiz_grinder"
        if (completed.size >= 30) achievements += "java_master"

        prefs[Keys.achievements] = encodeSet(achievements)
    }

    private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun yesterdayKey(): String {
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_YEAR, -1)
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.time)
    }

    private fun encodeSet(values: Set<String>): String = JSONArray(values.sorted()).toString()

    private fun decodeSet(raw: String?): Set<String> {
        if (raw.isNullOrBlank()) return emptySet()
        return runCatching {
            val array = JSONArray(raw)
            buildSet {
                for (index in 0 until array.length()) add(array.getString(index))
            }
        }.getOrDefault(emptySet())
    }

    private fun encodeIntMap(values: Map<String, Int>): String {
        val json = JSONObject()
        values.forEach { (key, value) -> json.put(key, value) }
        return json.toString()
    }

    private fun decodeIntMap(raw: String?): Map<String, Int> {
        if (raw.isNullOrBlank()) return emptyMap()
        return runCatching {
            val json = JSONObject(raw)
            buildMap {
                json.keys().forEach { key -> put(key, json.optInt(key)) }
            }
        }.getOrDefault(emptyMap())
    }

    private fun encodeStringMap(values: Map<String, String>): String {
        val json = JSONObject()
        values.forEach { (key, value) -> json.put(key, value) }
        return json.toString()
    }

    private fun decodeStringMap(raw: String?): Map<String, String> {
        if (raw.isNullOrBlank()) return emptyMap()
        return runCatching {
            val json = JSONObject(raw)
            buildMap {
                json.keys().forEach { key -> put(key, json.optString(key)) }
            }
        }.getOrDefault(emptyMap())
    }
}

private typealias MutablePreferencesLike = androidx.datastore.preferences.core.MutablePreferences
