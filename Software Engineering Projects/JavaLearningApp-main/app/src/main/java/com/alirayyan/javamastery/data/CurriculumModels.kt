package com.alirayyan.javamastery.data

import kotlinx.serialization.Serializable

@Serializable
data class Curriculum(
    val levels: List<JavaLevel> = emptyList(),
    val practiceExercises: List<PracticeExercise> = emptyList(),
    val playgroundTasks: List<PlaygroundTask> = emptyList(),
    val capstoneProjects: List<CapstoneProject> = emptyList(),
    val flashcards: List<Flashcard> = emptyList(),
    val achievements: List<Achievement> = emptyList(),
    val finalExams: List<FinalExam> = emptyList(),
    val resourceNotes: List<ResourceNote> = emptyList()
)

@Serializable
data class JavaLevel(
    val id: Int,
    val title: String,
    val shortTitle: String,
    val description: String,
    val outcomes: List<String> = emptyList(),
    val lessons: List<Lesson> = emptyList()
)

@Serializable
data class Lesson(
    val id: String,
    val levelId: Int,
    val title: String,
    val estimatedMinutes: Int,
    val simpleExplanation: String,
    val explainLikeTen: String,
    val realLifeAnalogy: String,
    val javaCode: String,
    val deepDiveSections: List<DeepDiveSection> = emptyList(),
    val jobUse: String = "",
    val masteryChecklist: List<String> = emptyList(),
    val dryRun: List<String> = emptyList(),
    val lineByLine: List<String> = emptyList(),
    val commonMistakes: List<String> = emptyList(),
    val miniPractice: String,
    val quiz: List<QuizQuestion> = emptyList(),
    val codingChallenge: CodingChallenge,
    val summary: String,
    val nextLessonId: String? = null,
    val tags: List<String> = emptyList()
)

@Serializable
data class QuizQuestion(
    val id: String,
    val question: String,
    val options: List<String>,
    val correctAnswerIndex: Int,
    val explanation: String
)

@Serializable
data class CodingChallenge(
    val prompt: String,
    val expectedOutput: String,
    val hints: List<String> = emptyList(),
    val solutions: List<ExerciseSolution> = emptyList()
)

@Serializable
data class DeepDiveSection(
    val title: String,
    val body: String
)

@Serializable
data class PracticeExercise(
    val id: String,
    val title: String,
    val levelId: Int,
    val difficulty: String,
    val tags: List<String> = emptyList(),
    val problem: String,
    val constraints: List<String> = emptyList(),
    val sampleInput: String = "",
    val sampleOutput: String = "",
    val hints: List<String> = emptyList(),
    val expectedOutput: String,
    val dryRun: List<String> = emptyList(),
    val commonWrongSolutions: List<ExerciseSolution> = emptyList(),
    val tradeOffs: List<String> = emptyList(),
    val rubric: List<String> = emptyList(),
    val solutions: List<ExerciseSolution> = emptyList()
)

@Serializable
data class ExerciseSolution(
    val title: String,
    val explanation: String,
    val code: String
)

@Serializable
data class Flashcard(
    val id: String,
    val levelId: Int,
    val front: String,
    val back: String,
    val tag: String
)

@Serializable
data class PlaygroundTask(
    val id: String,
    val title: String,
    val levelId: Int,
    val prompt: String,
    val starterCode: String,
    val expectedOutput: String,
    val checks: List<String> = emptyList(),
    val hints: List<String> = emptyList(),
    val explanation: String,
    val tags: List<String> = emptyList()
)

@Serializable
data class CapstoneProject(
    val id: String,
    val title: String,
    val levelId: Int,
    val difficulty: String,
    val goal: String,
    val scenario: String,
    val files: List<ProjectFile> = emptyList(),
    val tests: List<ProjectTest> = emptyList(),
    val rubric: List<RubricCriterion> = emptyList(),
    val milestones: List<String> = emptyList(),
    val runInstructions: List<String> = emptyList(),
    val tags: List<String> = emptyList()
)

@Serializable
data class ProjectFile(
    val path: String,
    val content: String,
    val explanation: String
)

@Serializable
data class ProjectTest(
    val id: String,
    val name: String,
    val input: String = "",
    val expectedOutput: String,
    val points: Int,
    val description: String
)

@Serializable
data class RubricCriterion(
    val title: String,
    val description: String,
    val points: Int
)

@Serializable
data class Achievement(
    val id: String,
    val title: String,
    val description: String,
    val rule: String
)

@Serializable
data class FinalExam(
    val id: String,
    val title: String,
    val levelStart: Int,
    val levelEnd: Int,
    val questions: List<QuizQuestion> = emptyList()
)

@Serializable
data class ResourceNote(
    val name: String,
    val url: String,
    val license: String,
    val usage: String
)

data class UserProgress(
    val completedLessons: Set<String> = emptySet(),
    val quizScores: Map<String, Int> = emptyMap(),
    val bookmarkedLessons: Set<String> = emptySet(),
    val earnedAchievements: Set<String> = emptySet(),
    val notes: Map<String, String> = emptyMap(),
    val projectGrades: Map<String, Int> = emptyMap(),
    val codingDrillScores: Map<String, Int> = emptyMap(),
    val totalStudyMinutes: Int = 0,
    val streakCount: Int = 0,
    val lastStudyDate: String = "",
    val highestUnlockedLevel: Int = 0,
    val darkMode: Boolean = false,
    val practiceMode: Boolean = true
)

fun Curriculum.allLessons(): List<Lesson> = levels.flatMap { it.lessons }

fun Curriculum.findLesson(lessonId: String): Lesson? = allLessons().firstOrNull { it.id == lessonId }

fun Curriculum.findLevel(levelId: Int): JavaLevel? = levels.firstOrNull { it.id == levelId }

fun UserProgress.completionPercent(totalLessons: Int): Int {
    if (totalLessons == 0) return 0
    return ((completedLessons.size.toFloat() / totalLessons.toFloat()) * 100).toInt().coerceIn(0, 100)
}
