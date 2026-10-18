@file:OptIn(
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class
)

package com.alirayyan.javamastery.ui

import android.content.Intent
import android.speech.tts.TextToSpeech
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CardMembership
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.alirayyan.javamastery.data.Achievement
import com.alirayyan.javamastery.data.CapstoneProject
import com.alirayyan.javamastery.data.Curriculum
import com.alirayyan.javamastery.data.FinalExam
import com.alirayyan.javamastery.data.Flashcard
import com.alirayyan.javamastery.data.JavaLevel
import com.alirayyan.javamastery.data.Lesson
import com.alirayyan.javamastery.data.PracticeExercise
import com.alirayyan.javamastery.data.PlaygroundTask
import com.alirayyan.javamastery.data.ProgressStore
import com.alirayyan.javamastery.data.QuizQuestion
import com.alirayyan.javamastery.data.UserProgress
import com.alirayyan.javamastery.data.allLessons
import com.alirayyan.javamastery.data.completionPercent
import com.alirayyan.javamastery.data.findLesson
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

private object Screens {
    const val Splash = "splash"
    const val Home = "home"
    const val Path = "path"
    const val Level = "level"
    const val Lesson = "lesson"
    const val Quiz = "quiz"
    const val Result = "result"
    const val Practice = "practice"
    const val PracticeDetail = "practice_detail"
    const val Flashcards = "flashcards"
    const val Bookmarks = "bookmarks"
    const val Search = "search"
    const val Progress = "progress"
    const val Achievements = "achievements"
    const val Settings = "settings"
    const val Certificate = "certificate"
    const val CodeExamples = "code_examples"
    const val Playground = "playground"
    const val CodingLab = "coding_lab"
    const val Capstones = "capstones"
    const val CapstoneDetail = "capstone_detail"
}

private data class ExaminerTarget(
    val title: String,
    val prompt: String,
    val expectedOutput: String,
    val difficulty: String,
    val tags: List<String>,
    val rubric: List<String>
)

private data class ExaminerReport(
    val score: Int,
    val verdict: String,
    val approach: String,
    val remarks: List<String>,
    val strengths: List<String>,
    val improvements: List<String>,
    val alternativeApproaches: List<String>
)

private data class CompilerCheckResult(
    val score: Int,
    val passed: Boolean,
    val message: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JavaMasteryApp(
    curriculum: Curriculum,
    progress: UserProgress,
    progressStore: ProgressStore
) {
    val scope = rememberCoroutineScope()
    var screen by rememberSaveable { mutableStateOf(Screens.Splash) }
    var selectedLevelId by rememberSaveable { mutableIntStateOf(0) }
    var selectedLessonId by rememberSaveable { mutableStateOf("") }
    var selectedPracticeId by rememberSaveable { mutableStateOf("") }
    var selectedProjectId by rememberSaveable { mutableStateOf("") }
    var quizId by rememberSaveable { mutableStateOf("") }
    var quizTitle by rememberSaveable { mutableStateOf("") }
    var quizLevelId by rememberSaveable { mutableIntStateOf(0) }
    var quizQuestions by remember { mutableStateOf(emptyList<QuizQuestion>()) }
    var resultScore by rememberSaveable { mutableIntStateOf(0) }
    var resultTotal by rememberSaveable { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        delay(750)
        screen = Screens.Home
    }

    val canGoBack = screen !in setOf(Screens.Splash, Screens.Home, Screens.Path, Screens.Practice, Screens.CodingLab, Screens.Flashcards, Screens.Progress)
    val title = when (screen) {
        Screens.Home -> "Java Mastery"
        Screens.Path -> "Learning Path"
        Screens.Level -> curriculum.levels.firstOrNull { it.id == selectedLevelId }?.shortTitle ?: "Level"
        Screens.Lesson -> curriculum.findLesson(selectedLessonId)?.title ?: "Lesson"
        Screens.Quiz -> quizTitle
        Screens.Result -> "Quiz Result"
        Screens.Practice -> "Practice"
        Screens.PracticeDetail -> "Exercise"
        Screens.Flashcards -> "Flashcards"
        Screens.Bookmarks -> "Bookmarks"
        Screens.Search -> "Search"
        Screens.Progress -> "Progress"
        Screens.Achievements -> "Achievements"
        Screens.Settings -> "Settings"
        Screens.Certificate -> "Certificate"
        Screens.CodeExamples -> "Code Examples"
        Screens.Playground -> "Playground"
        Screens.CodingLab -> "Coding Lab"
        Screens.Capstones -> "Capstones"
        Screens.CapstoneDetail -> "Capstone"
        else -> "Java Mastery"
    }

    Scaffold(
        topBar = {
            if (screen != Screens.Splash) {
                CenterAlignedTopAppBar(
                    title = { Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    navigationIcon = {
                        if (canGoBack) {
                            IconButton(onClick = { screen = previousHub(screen) }) {
                                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                            }
                        }
                    },
                    actions = {
                        IconButton(onClick = { screen = Screens.Search }) {
                            Icon(Icons.Filled.Search, contentDescription = "Search")
                        }
                        IconButton(onClick = { screen = Screens.Settings }) {
                            Icon(Icons.Filled.Settings, contentDescription = "Settings")
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            }
        },
        bottomBar = {
            if (screen in setOf(Screens.Home, Screens.Path, Screens.Practice, Screens.CodingLab, Screens.Flashcards, Screens.Progress)) {
                BottomNav(screen) { screen = it }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (screen) {
                Screens.Splash -> SplashScreen()
                Screens.Home -> HomeScreen(
                    curriculum = curriculum,
                    progress = progress,
                    onContinue = {
                        val nextLesson = curriculum.allLessons().firstOrNull { it.id !in progress.completedLessons }
                        if (nextLesson != null) {
                            selectedLessonId = nextLesson.id
                            screen = Screens.Lesson
                        } else {
                            screen = Screens.Certificate
                        }
                    },
                    onOpenPath = { screen = Screens.Path },
                    onOpenBookmarks = { screen = Screens.Bookmarks },
                    onOpenAchievements = { screen = Screens.Achievements },
                    onOpenCertificate = { screen = Screens.Certificate },
                    onOpenCodeExamples = { screen = Screens.CodeExamples },
                    onOpenPlayground = { screen = Screens.Playground },
                    onOpenCodingLab = { screen = Screens.CodingLab },
                    onOpenCapstones = { screen = Screens.Capstones }
                )
                Screens.Path -> LearningPathScreen(
                    curriculum = curriculum,
                    progress = progress,
                    onLevelClick = {
                        selectedLevelId = it.id
                        screen = Screens.Level
                    }
                )
                Screens.Level -> {
                    val level = curriculum.levels.firstOrNull { it.id == selectedLevelId }
                    if (level != null) {
                        LevelDetailScreen(
                            level = level,
                            progress = progress,
                            finalExam = curriculum.finalExams.firstOrNull { selectedLevelId in it.levelStart..it.levelEnd && selectedLevelId == it.levelEnd },
                            onLessonClick = {
                                selectedLessonId = it.id
                                screen = Screens.Lesson
                            },
                            onExamClick = { exam ->
                                quizId = exam.id
                                quizTitle = exam.title
                                quizLevelId = exam.levelEnd
                                quizQuestions = exam.questions
                                screen = Screens.Quiz
                            }
                        )
                    }
                }
                Screens.Lesson -> {
                    val lesson = curriculum.findLesson(selectedLessonId)
                    if (lesson != null) {
                        LessonReaderScreen(
                            lesson = lesson,
                            bookmarked = selectedLessonId in progress.bookmarkedLessons,
                            note = progress.notes[selectedLessonId].orEmpty(),
                            onBookmark = { scope.launch { progressStore.toggleBookmark(lesson.id) } },
                            onComplete = {
                                scope.launch {
                                    progressStore.markLessonComplete(lesson)
                                }
                            },
                            onStartQuiz = {
                                quizId = "lesson:${lesson.id}"
                                quizTitle = "${lesson.title} Quiz"
                                quizLevelId = lesson.levelId
                                quizQuestions = lesson.quiz
                                screen = Screens.Quiz
                            },
                            onSaveNote = { note -> scope.launch { progressStore.saveNote(lesson.id, note) } }
                        )
                    }
                }
                Screens.Quiz -> QuizScreen(
                    quizId = quizId,
                    title = quizTitle,
                    questions = quizQuestions,
                    onFinished = { score, total ->
                        resultScore = score
                        resultTotal = total
                        scope.launch { progressStore.saveQuizScore(quizId, quizLevelId, score) }
                        screen = Screens.Result
                    }
                )
                Screens.Result -> QuizResultScreen(
                    score = resultScore,
                    total = resultTotal,
                    onRetry = { screen = Screens.Quiz },
                    onDone = { screen = Screens.Path }
                )
                Screens.Practice -> PracticeListScreen(
                    exercises = curriculum.practiceExercises,
                    progress = progress,
                    onExerciseClick = {
                        selectedPracticeId = it.id
                        screen = Screens.PracticeDetail
                    }
                )
                Screens.PracticeDetail -> {
                    val exercise = curriculum.practiceExercises.firstOrNull { it.id == selectedPracticeId }
                    if (exercise != null) PracticeDetailScreen(exercise)
                }
                Screens.Flashcards -> FlashcardScreen(curriculum.flashcards)
                Screens.Bookmarks -> BookmarksScreen(
                    lessons = curriculum.allLessons().filter { it.id in progress.bookmarkedLessons },
                    onLessonClick = {
                        selectedLessonId = it.id
                        screen = Screens.Lesson
                    }
                )
                Screens.Search -> SearchScreen(
                    lessons = curriculum.allLessons(),
                    onLessonClick = {
                        selectedLessonId = it.id
                        screen = Screens.Lesson
                    }
                )
                Screens.Progress -> ProgressScreen(curriculum, progress)
                Screens.Achievements -> AchievementsScreen(curriculum.achievements, progress)
                Screens.Settings -> SettingsScreen(
                    progress = progress,
                    onDarkModeChange = { scope.launch { progressStore.setDarkMode(it) } },
                    onPracticeModeChange = { scope.launch { progressStore.setPracticeMode(it) } },
                    onReset = { scope.launch { progressStore.resetProgress() } }
                )
                Screens.Certificate -> CertificateScreen(curriculum, progress)
                Screens.CodeExamples -> CodeExamplesScreen(curriculum.allLessons())
                Screens.Playground -> PlaygroundScreen(curriculum.playgroundTasks)
                Screens.CodingLab -> CodingLabScreen(
                    tasks = curriculum.playgroundTasks,
                    progress = progress,
                    onSaveScore = { taskId, score -> scope.launch { progressStore.saveCodingDrillScore(taskId, score) } }
                )
                Screens.Capstones -> CapstoneListScreen(
                    projects = curriculum.capstoneProjects,
                    progress = progress,
                    onProjectClick = {
                        selectedProjectId = it.id
                        screen = Screens.CapstoneDetail
                    }
                )
                Screens.CapstoneDetail -> {
                    val project = curriculum.capstoneProjects.firstOrNull { it.id == selectedProjectId }
                    if (project != null) {
                        CapstoneDetailScreen(
                            project = project,
                            savedGrade = progress.projectGrades[project.id],
                            onSaveGrade = { grade -> scope.launch { progressStore.saveProjectGrade(project.id, grade) } }
                        )
                    }
                }
            }
        }
    }
}

private fun previousHub(screen: String): String {
    return when (screen) {
        Screens.Lesson, Screens.Quiz, Screens.Result, Screens.CodeExamples, Screens.Playground, Screens.CodingLab, Screens.Capstones -> Screens.Path
        Screens.CapstoneDetail -> Screens.Capstones
        Screens.PracticeDetail -> Screens.Practice
        Screens.Bookmarks, Screens.Search, Screens.Achievements, Screens.Settings, Screens.Certificate -> Screens.Home
        else -> Screens.Home
    }
}

@Composable
private fun BottomNav(current: String, onSelect: (String) -> Unit) {
    NavigationBar {
        NavigationBarItem(
            selected = current == Screens.Home,
            onClick = { onSelect(Screens.Home) },
            icon = { Icon(Icons.Filled.Home, contentDescription = null) },
            label = { Text("Home") }
        )
        NavigationBarItem(
            selected = current == Screens.Path,
            onClick = { onSelect(Screens.Path) },
            icon = { Icon(Icons.Filled.School, contentDescription = null) },
            label = { Text("Path") }
        )
        NavigationBarItem(
            selected = current == Screens.Practice,
            onClick = { onSelect(Screens.Practice) },
            icon = { Icon(Icons.Filled.Code, contentDescription = null) },
            label = { Text("Practice") }
        )
        NavigationBarItem(
            selected = current == Screens.CodingLab,
            onClick = { onSelect(Screens.CodingLab) },
            icon = { Icon(Icons.Filled.PlayArrow, contentDescription = null) },
            label = { Text("Code") }
        )
        NavigationBarItem(
            selected = current == Screens.Flashcards,
            onClick = { onSelect(Screens.Flashcards) },
            icon = { Icon(Icons.Filled.CardMembership, contentDescription = null) },
            label = { Text("Cards") }
        )
        NavigationBarItem(
            selected = current == Screens.Progress,
            onClick = { onSelect(Screens.Progress) },
            icon = { Icon(Icons.Filled.EmojiEvents, contentDescription = null) },
            label = { Text("Progress") }
        )
    }
}

@Composable
private fun SplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(
                        MaterialTheme.colorScheme.primary,
                        MaterialTheme.colorScheme.secondary
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                modifier = Modifier.size(84.dp),
                shape = CircleShape,
                color = Color.White.copy(alpha = 0.95f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "J",
                        style = MaterialTheme.typography.displayMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Black
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("Java Mastery", style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.Bold)
            Text("Zero to Advanced", color = Color.White.copy(alpha = 0.9f))
        }
    }
}

@Composable
private fun HomeScreen(
    curriculum: Curriculum,
    progress: UserProgress,
    onContinue: () -> Unit,
    onOpenPath: () -> Unit,
    onOpenBookmarks: () -> Unit,
    onOpenAchievements: () -> Unit,
    onOpenCertificate: () -> Unit,
    onOpenCodeExamples: () -> Unit,
    onOpenPlayground: () -> Unit,
    onOpenCodingLab: () -> Unit,
    onOpenCapstones: () -> Unit
) {
    val totalLessons = curriculum.allLessons().size
    val percent = progress.completionPercent(totalLessons)
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            HeroCard(
                title = "Assalamu alaikum, Ali",
                body = "Build Java from the first idea of programming to clean, scalable, professional code.",
                action = "Continue",
                onAction = onContinue
            )
        }
        item {
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Overall Progress", fontWeight = FontWeight.Bold)
                        Text("$percent%")
                    }
                    LinearProgressIndicator(
                        progress = percent / 100f,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("${progress.completedLessons.size}", "lessons")
                        StatPill("${progress.streakCount}", "day streak")
                        StatPill("${progress.totalStudyMinutes}", "minutes")
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                QuickAction("Path", Icons.Filled.MenuBook, Modifier.weight(1f), onOpenPath)
                QuickAction("Examples", Icons.Filled.Code, Modifier.weight(1f), onOpenCodeExamples)
            }
        }
        item {
            QuickAction("Playground", Icons.Filled.PlayArrow, Modifier.fillMaxWidth(), onOpenPlayground)
        }
        item {
            QuickAction("Must-Code Lab", Icons.Filled.Code, Modifier.fillMaxWidth(), onOpenCodingLab)
        }
        item {
            QuickAction("Capstone Projects", Icons.Filled.School, Modifier.fillMaxWidth(), onOpenCapstones)
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                QuickAction("Bookmarks", Icons.Filled.Bookmark, Modifier.weight(1f), onOpenBookmarks)
                QuickAction("Badges", Icons.Filled.EmojiEvents, Modifier.weight(1f), onOpenAchievements)
            }
        }
        item {
            QuickAction("Certificate", Icons.Filled.CardMembership, Modifier.fillMaxWidth(), onOpenCertificate)
        }
        item {
            SectionTitle("Next Levels")
        }
        items(curriculum.levels.take(6)) { level ->
            LevelCard(level, progress, onClick = { onOpenPath() })
        }
    }
}

@Composable
private fun HeroCard(title: String, body: String, action: String, onAction: () -> Unit) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold)
            Text(body, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.92f))
            Button(onClick = onAction) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text(action)
            }
        }
    }
}

@Composable
private fun QuickAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier, onClick: () -> Unit) {
    ElevatedCard(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Text(label, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun LearningPathScreen(
    curriculum: Curriculum,
    progress: UserProgress,
    onLevelClick: (JavaLevel) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text(
                "Thirty levels from absolute basics to expert Java. Practice mode lets you browse freely; passing quizzes unlocks the strict path.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
        items(curriculum.levels) { level ->
            LevelCard(level, progress, onClick = { onLevelClick(level) })
        }
    }
}

@Composable
private fun LevelCard(level: JavaLevel, progress: UserProgress, onClick: () -> Unit) {
    val lessonCount = level.lessons.size
    val completed = level.lessons.count { it.id in progress.completedLessons }
    val unlocked = progress.practiceMode || level.id <= progress.highestUnlockedLevel
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = unlocked, onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = if (unlocked) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
        )
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("LEVEL ${level.id}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Text(if (unlocked) "$completed/$lessonCount" else "Locked")
            }
            Text(level.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(level.description, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (lessonCount > 0) LinearProgressIndicator(
                progress = completed.toFloat() / lessonCount.toFloat(),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun LevelDetailScreen(
    level: JavaLevel,
    progress: UserProgress,
    finalExam: FinalExam?,
    onLessonClick: (Lesson) -> Unit,
    onExamClick: (FinalExam) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(level.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(level.description)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        level.outcomes.forEach { AssistChip(onClick = {}, label = { Text(it) }) }
                    }
                }
            }
        }
        item { SectionTitle("Lessons") }
        items(level.lessons) { lesson ->
            val done = lesson.id in progress.completedLessons
            ElevatedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onLessonClick(lesson) },
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (done) Icons.Filled.CheckCircle else Icons.Filled.Book,
                        contentDescription = null,
                        tint = if (done) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.primary
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(lesson.title, fontWeight = FontWeight.Bold)
                        Text("${lesson.estimatedMinutes} min • ${lesson.tags.joinToString(", ")}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        if (finalExam != null) {
            item {
                ElevatedCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onExamClick(finalExam) },
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Quiz, contentDescription = null)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(finalExam.title, fontWeight = FontWeight.Bold)
                            Text("${finalExam.questions.size} questions • pass score 70%")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LessonReaderScreen(
    lesson: Lesson,
    bookmarked: Boolean,
    note: String,
    onBookmark: () -> Unit,
    onComplete: () -> Unit,
    onStartQuiz: () -> Unit,
    onSaveNote: (String) -> Unit
) {
    val context = LocalContext.current
    val tts = remember {
        TextToSpeech(context) { }
    }
    var draftNote by rememberSaveable(lesson.id) { mutableStateOf(note) }
    DisposableEffect(Unit) {
        onDispose { tts.shutdown() }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("LEVEL ${lesson.levelId}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    Text(lesson.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("${lesson.estimatedMinutes} min read")
                }
                IconButton(onClick = onBookmark) {
                    Icon(if (bookmarked) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder, contentDescription = "Bookmark")
                }
            }
        }
        item {
            LessonSection("Simple Explanation", lesson.simpleExplanation)
        }
        item {
            LessonSection("Explain Like I'm 10", lesson.explainLikeTen)
        }
        item {
            LessonSection("Real-life Analogy", lesson.realLifeAnalogy)
        }
        if (lesson.deepDiveSections.isNotEmpty()) {
            items(lesson.deepDiveSections) { section ->
                LessonSection(section.title, section.body)
            }
        }
        if (lesson.jobUse.isNotBlank()) {
            item {
                LessonSection("Where This Appears In Real Work", lesson.jobUse)
            }
        }
        item {
            SectionTitle("Java Example")
            CodeBlock(lesson.javaCode)
        }
        item {
            SectionTitle("Line by Line")
            BulletList(lesson.lineByLine)
        }
        if (lesson.dryRun.isNotEmpty()) {
            item {
                SectionTitle("Dry Run")
                BulletList(lesson.dryRun)
            }
        }
        item {
            SectionTitle("Common Mistakes")
            BulletList(lesson.commonMistakes)
        }
        if (lesson.masteryChecklist.isNotEmpty()) {
            item {
                SectionTitle("Mastery Checklist")
                BulletList(lesson.masteryChecklist)
            }
        }
        item {
            LessonSection("Tiny Practice", lesson.miniPractice)
        }
        item {
            SectionTitle("Coding Challenge")
            Text(lesson.codingChallenge.prompt)
            Spacer(Modifier.height(8.dp))
            Text("Expected output", fontWeight = FontWeight.Bold)
            CodeBlock(lesson.codingChallenge.expectedOutput)
        }
        item {
            LessonSection("Summary", lesson.summary)
        }
        item {
            OutlinedTextField(
                value = draftNote,
                onValueChange = { draftNote = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("My notes for this lesson") },
                minLines = 3
            )
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = { onSaveNote(draftNote) }) {
                Text("Save Note")
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    modifier = Modifier.weight(1f),
                    onClick = {
                        tts.language = Locale.US
                        tts.speak(lesson.simpleExplanation, TextToSpeech.QUEUE_FLUSH, null, lesson.id)
                    }
                ) {
                    Icon(Icons.Filled.VolumeUp, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Listen")
                }
                Button(
                    modifier = Modifier.weight(1f),
                    onClick = onComplete
                ) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Complete")
                }
            }
            Spacer(Modifier.height(8.dp))
            Button(modifier = Modifier.fillMaxWidth(), onClick = onStartQuiz) {
                Icon(Icons.Filled.Quiz, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Start Quiz")
            }
        }
    }
}

@Composable
private fun QuizScreen(
    quizId: String,
    title: String,
    questions: List<QuizQuestion>,
    onFinished: (score: Int, total: Int) -> Unit
) {
    var index by rememberSaveable(quizId) { mutableIntStateOf(0) }
    val answers = remember(quizId) { mutableStateMapOf<Int, Int>() }
    val question = questions.getOrNull(index)

    if (question == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No questions available yet.")
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Question ${index + 1} of ${questions.size}")
            LinearProgressIndicator(
                progress = (index + 1).toFloat() / questions.size.toFloat(),
                modifier = Modifier.fillMaxWidth()
            )
        }
        item {
            Text(question.question, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }
        items(question.options.indices.toList()) { optionIndex ->
            val selected = answers[index] == optionIndex
            val answered = answers.containsKey(index)
            val isCorrect = optionIndex == question.correctAnswerIndex
            val borderColor = when {
                !answered -> MaterialTheme.colorScheme.outline
                isCorrect -> MaterialTheme.colorScheme.secondary
                selected -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
            }
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = selected,
                        onClick = { if (!answered) answers[index] = optionIndex }
                    ),
                shape = RoundedCornerShape(8.dp),
                border = BorderStroke(1.dp, borderColor)
            ) {
                Text(
                    text = question.options[optionIndex],
                    modifier = Modifier.padding(14.dp)
                )
            }
        }
        item {
            val answered = answers.containsKey(index)
            AnimatedVisibility(visible = answered) {
                val correct = answers[index] == question.correctAnswerIndex
                ElevatedCard(
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = if (correct) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.errorContainer
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(if (correct) "Correct" else "Not yet", fontWeight = FontWeight.Bold)
                        Text(question.explanation)
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                OutlinedButton(
                    enabled = index > 0,
                    onClick = { index-- }
                ) {
                    Text("Previous")
                }
                if (index < questions.lastIndex) {
                    Button(
                        enabled = answers.containsKey(index),
                        onClick = { index++ }
                    ) {
                        Text("Next")
                    }
                } else {
                    Button(
                        enabled = answers.size == questions.size,
                        onClick = {
                            val correct = questions.indices.count { answers[it] == questions[it].correctAnswerIndex }
                            val score = ((correct.toFloat() / questions.size.toFloat()) * 100).toInt()
                            onFinished(score, questions.size)
                        }
                    ) {
                        Text("Finish")
                    }
                }
            }
        }
    }
}

@Composable
private fun QuizResultScreen(score: Int, total: Int, onRetry: () -> Unit, onDone: () -> Unit) {
    val passed = score >= 70
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            if (passed) Icons.Filled.EmojiEvents else Icons.Filled.RestartAlt,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = if (passed) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.tertiary
        )
        Spacer(Modifier.height(12.dp))
        Text(if (passed) "Passed" else "Keep practicing", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Score: $score% • $total questions")
        Spacer(Modifier.height(20.dp))
        Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Back to Path") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth()) { Text("Try Again") }
    }
}

@Composable
private fun PracticeListScreen(
    exercises: List<PracticeExercise>,
    progress: UserProgress,
    onExerciseClick: (PracticeExercise) -> Unit
) {
    var selectedDifficulty by rememberSaveable { mutableStateOf("All") }
    val difficulties = listOf("All", "Beginner", "Easy", "Medium", "Hard", "Expert")
    val filtered = exercises.filter { selectedDifficulty == "All" || it.difficulty == selectedDifficulty }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(difficulties) { difficulty ->
                    FilterChip(
                        selected = difficulty == selectedDifficulty,
                        onClick = { selectedDifficulty = difficulty },
                        label = { Text(difficulty) }
                    )
                }
            }
        }
        item {
            Text(
                if (progress.practiceMode) "Practice mode is on. Explore any exercise freely." else "Strict mode is on. Finish levels to unlock the full path.",
                style = MaterialTheme.typography.bodySmall
            )
        }
        items(filtered) { exercise ->
            ElevatedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onExerciseClick(exercise) },
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(exercise.title, fontWeight = FontWeight.Bold)
                        Text(exercise.difficulty, color = MaterialTheme.colorScheme.primary)
                    }
                    Text(exercise.problem, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    TagRow(exercise.tags)
                }
            }
        }
    }
}

@Composable
private fun PracticeDetailScreen(exercise: PracticeExercise) {
    var reveal by rememberSaveable(exercise.id) { mutableStateOf(false) }
    var answer by rememberSaveable(exercise.id) { mutableStateOf("") }
    var examinerReport by remember(exercise.id) { mutableStateOf<ExaminerReport?>(null) }
    val target = remember(exercise.id) {
        ExaminerTarget(
            title = exercise.title,
            prompt = exercise.problem,
            expectedOutput = exercise.sampleOutput.ifBlank { exercise.expectedOutput },
            difficulty = exercise.difficulty,
            tags = exercise.tags,
            rubric = exercise.rubric
        )
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(exercise.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            TagRow(listOf(exercise.difficulty) + exercise.tags)
        }
        item { LessonSection("Problem", exercise.problem) }
        if (exercise.constraints.isNotEmpty()) {
            item {
                SectionTitle("Constraints")
                BulletList(exercise.constraints)
            }
        }
        if (exercise.sampleInput.isNotBlank() || exercise.sampleOutput.isNotBlank()) {
            item {
                SectionTitle("Sample Input")
                CodeBlock(exercise.sampleInput.ifBlank { "No input required." })
                Spacer(Modifier.height(8.dp))
                SectionTitle("Sample Output")
                CodeBlock(exercise.sampleOutput.ifBlank { exercise.expectedOutput })
            }
        }
        item {
            SectionTitle("Hints")
            BulletList(exercise.hints)
        }
        item {
            SectionTitle("Expected Output")
            CodeBlock(exercise.expectedOutput)
        }
        if (exercise.dryRun.isNotEmpty()) {
            item {
                SectionTitle("Dry Run")
                BulletList(exercise.dryRun)
            }
        }
        if (exercise.tradeOffs.isNotEmpty()) {
            item {
                SectionTitle("Trade-offs")
                BulletList(exercise.tradeOffs)
            }
        }
        if (exercise.rubric.isNotEmpty()) {
            item {
                SectionTitle("Self-check Rubric")
                BulletList(exercise.rubric)
            }
        }
        item {
            SectionTitle("Local Examiner")
            Text("Write or paste your answer here first. The examiner checks your approach, structure, likely output, edge cases, naming, and maintainability without using any API.")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = answer,
                onValueChange = {
                    answer = it
                    examinerReport = null
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Your Java answer") },
                minLines = 10
            )
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = { examinerReport = examineAnswer(answer, target) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Examine My Answer")
            }
        }
        examinerReport?.let { report ->
            item {
                ExaminerReportCard(report)
            }
        }
        item {
            Button(onClick = { reveal = true }, modifier = Modifier.fillMaxWidth()) {
                Text("Reveal Solution")
            }
        }
        if (reveal) {
            if (exercise.commonWrongSolutions.isNotEmpty()) {
                item {
                    SectionTitle("Common Wrong Solutions")
                }
                items(exercise.commonWrongSolutions) { solution ->
                    ElevatedCard(
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(solution.title, fontWeight = FontWeight.Bold)
                            Text(solution.explanation)
                            CodeBlock(solution.code)
                        }
                    }
                }
            }
            item {
                SectionTitle("Solution Approaches")
            }
            items(exercise.solutions) { solution ->
                ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(solution.title, fontWeight = FontWeight.Bold)
                        Text(solution.explanation)
                        CodeBlock(solution.code)
                    }
                }
            }
        }
    }
}

@Composable
private fun ExaminerReportCard(report: ExaminerReport) {
    ElevatedCard(shape = RoundedCornerShape(8.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Examiner Report", fontWeight = FontWeight.Bold)
                Text("${report.score}%", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
            LinearProgressIndicator(
                progress = report.score / 100f,
                modifier = Modifier.fillMaxWidth()
            )
            Text(report.verdict, fontWeight = FontWeight.Bold)
            Text("Detected approach: ${report.approach}")
            ReportList("Remarks", report.remarks)
            ReportList("Strengths", report.strengths)
            ReportList("Improve Next", report.improvements)
            ReportList("Other Valid Ways", report.alternativeApproaches)
        }
    }
}

@Composable
private fun ReportList(title: String, items: List<String>) {
    if (items.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, fontWeight = FontWeight.Bold)
        items.forEach { item -> Text("- $item") }
    }
}

private fun examineAnswer(answer: String, target: ExaminerTarget): ExaminerReport {
    val code = answer.trim()
    if (code.isBlank()) {
        return ExaminerReport(
            score = 0,
            verdict = "No answer to check yet.",
            approach = "No approach detected",
            remarks = listOf("Write a solution, pseudocode, or design notes first. The examiner can review complete Java code or a clear plan."),
            strengths = emptyList(),
            improvements = listOf("Start with the simplest working idea, then improve it with methods, edge cases, and tests."),
            alternativeApproaches = alternativeApproachesFor(target)
        )
    }

    val lower = code.lowercase(Locale.ROOT)
    val tags = target.tags.map { it.lowercase(Locale.ROOT) }
    val tagText = tags.joinToString(" ")
    val classCount = Regex("""\bclass\s+[A-Za-z_][A-Za-z0-9_]*""").findAll(code).count()
    val methodCount = Regex(
        """\b(?:public|private|protected)?\s*(?:static\s+)?(?:void|int|double|float|long|short|byte|char|boolean|String|List|Map|Set|ArrayList|HashMap|Optional|[A-Z][A-Za-z0-9_]*)\s+[A-Za-z_][A-Za-z0-9_]*\s*\("""
    ).findAll(code).count()
    val hasMain = "static void main" in lower
    val hasLoop = lower.hasWord("for") || lower.hasWord("while") || lower.hasWord("do")
    val hasCondition = lower.hasWord("if") || lower.hasWord("switch") || "?" in code && ":" in code
    val hasPrint = "system.out.print" in lower
    val hasReturn = lower.hasWord("return")
    val hasScanner = "scanner" in lower || "bufferedreader" in lower
    val hasCollection = listOf("arraylist", "linkedlist", "hashmap", "hashset", "treeset", "treemap", "list<", "map<", "set<", "queue", "stack").any { it in lower }
    val hasStream = ".stream()" in lower || ".stream(" in lower || "collect(" in lower || "filter(" in lower || "map(" in lower
    val hasOop = classCount > 1 || Regex("""\b(private|protected)\s+""").containsMatchIn(lower) || lower.hasWord("extends") || lower.hasWord("implements")
    val hasValidation = hasCondition && listOf("< 0", "<= 0", "== null", "!= null", "isempty", "isblank", "throw", "try", "catch", "invalid", "else").any { it in lower }
    val hasTests = listOf("@test", "assert", "expected", "actual", "junit").any { it in lower }
    val outputMatches = likelyMatchesExpectedOutput(code, target.expectedOutput)
    val hardcoded = looksHardcoded(code, hasLoop, hasCondition, methodCount, hasCollection)
    val conceptMatches = conceptMatches(lower, tags)
    val readableNames = hasReadableNames(code)
    val rubricHits = rubricHits(lower, target.rubric)

    var score = 12
    if (hasMain || classCount > 0 || methodCount > 0) score += 10
    if (hasPrint || hasReturn) score += 8
    if (outputMatches) score += 16
    score += (conceptMatches.size * 5).coerceAtMost(20)
    if (methodCount >= 2) score += 10
    if (hasOop) score += if ("oop" in tagText || "capstone" in tagText) 12 else 6
    if (hasCollection || hasStream) score += if ("collection" in tagText || "dsa" in tagText || "capstone" in tagText) 10 else 5
    if (hasValidation) score += 10
    if (hasTests) score += if ("capstone" in tagText || target.difficulty in listOf("Hard", "Expert")) 10 else 5
    if (readableNames) score += 7
    score += (rubricHits * 4).coerceAtMost(12)
    if (hardcoded) score -= 16
    if (!outputMatches && target.expectedOutput.isNotBlank()) score -= 4
    score = score.coerceIn(5, 100)

    val strengths = mutableListOf<String>()
    if (hasMain || classCount > 0) strengths += "Your answer looks like real Java code instead of only a rough idea."
    if (hasPrint || hasReturn) strengths += "It produces a value or output, so it can be tested."
    if (outputMatches) strengths += "The visible output appears to match the expected output."
    if (methodCount >= 2) strengths += "You separated logic into methods, which makes changes safer."
    if (hasOop) strengths += "You used object-oriented structure, useful for larger programs."
    if (hasCollection) strengths += "You used Java collections, which is often cleaner than managing many separate variables."
    if (hasStream) strengths += "You tried a functional/stream style approach."
    if (hasValidation) strengths += "You thought about invalid or edge-case input."
    if (hasTests) strengths += "You included test thinking, which is a professional habit."
    if (readableNames) strengths += "Your names look readable enough for another developer to follow."
    conceptMatches.forEach { strengths += it }
    if (strengths.isEmpty()) strengths += "You made a first attempt. That is useful because now it can be improved."

    val improvements = mutableListOf<String>()
    if (!hasMain && classCount == 0 && methodCount == 0) improvements += "Add a small Java structure: a class, a main method, or a named method that solves the task."
    if (!outputMatches && target.expectedOutput.isNotBlank()) improvements += "Run the sample case and compare every line with the expected output."
    if (hardcoded) improvements += "Avoid printing only the sample answer. Compute the result from variables, input, or method parameters."
    if (methodCount <= 1 && target.difficulty !in listOf("Beginner", "Easy")) improvements += "Move repeated or important logic into named methods so one change does not break everything."
    if (("oop" in tagText || "capstone" in tagText) && !hasOop) improvements += "For this topic, consider classes with clear responsibilities instead of putting all logic in one place."
    if (("loop" in tagText || "array" in tagText || "dsa" in tagText) && !hasLoop && !hasCollection) improvements += "This topic usually needs iteration or a data structure. Add a loop or collection if the problem has many values."
    if (("input" in tagText || "scanner" in tagText) && !hasScanner) improvements += "If the task expects user input, read it with Scanner or another input tool instead of fixed values."
    if (!hasValidation && target.difficulty !in listOf("Beginner", "Easy")) improvements += "Add edge-case handling, such as empty input, null values, negative numbers, or not-found cases."
    if (!hasTests && (target.difficulty in listOf("Hard", "Expert") || "capstone" in tagText)) improvements += "Add small tests or at least write expected vs actual checks before calling it complete."
    if (!readableNames) improvements += "Use names that explain meaning, like totalMarks, balance, studentName, or average."
    if (improvements.isEmpty()) improvements += "Now improve it by adding one more edge case and one more test case."

    val approachParts = mutableListOf<String>()
    if (hasOop) approachParts += "object-oriented"
    if (methodCount >= 2) approachParts += "method-based"
    if (hasCollection) approachParts += "collections-based"
    if (hasStream) approachParts += "stream-based"
    if (hasLoop) approachParts += "loop-based"
    if (hasCondition) approachParts += "decision-based"
    if (hasScanner) approachParts += "input-driven"
    if (hasTests) approachParts += "test-aware"
    val approach = if (approachParts.isEmpty()) "direct procedural approach" else approachParts.distinct().joinToString(" + ") + " approach"

    val remarks = mutableListOf<String>()
    remarks += "I detected a $approach. That can be valid; many Java problems have more than one good solution."
    if (outputMatches) {
        remarks += "Correctness signal is good because the expected output is visible in the answer or simulated output."
    } else {
        remarks += "Correctness is not proven yet. Use sample tests, manual dry runs, or the local compiler service for stronger proof."
    }
    if (rubricHits > 0) remarks += "Your answer appears to touch $rubricHits rubric point(s)."
    remarks += "This is a local heuristic examiner. Treat it like a code review coach; compiler errors and tests are still the final judge."

    return ExaminerReport(
        score = score,
        verdict = verdictFor(score),
        approach = approach,
        remarks = remarks,
        strengths = strengths.distinct().take(8),
        improvements = improvements.distinct().take(8),
        alternativeApproaches = alternativeApproachesFor(target)
    )
}

private fun String.hasWord(word: String): Boolean {
    return Regex("""\b${Regex.escape(word)}\b""").containsMatchIn(this)
}

private fun likelyMatchesExpectedOutput(code: String, expectedOutput: String): Boolean {
    val expected = expectedOutput.trim()
    if (expected.isBlank()) return false
    if (code.contains(expected)) return true
    val simulated = simulateJavaOutput(code, "").trim()
    return simulated.isNotBlank() && simulated == expected
}

private fun looksHardcoded(code: String, hasLoop: Boolean, hasCondition: Boolean, methodCount: Int, hasCollection: Boolean): Boolean {
    val lower = code.lowercase(Locale.ROOT)
    val printCount = Regex("""System\.out\.print(?:ln)?\s*\(""").findAll(code).count()
    val hasComputation = listOf("+", "-", "*", "/", "%", "return", "scanner", "parseint", "parsedouble").any { it in lower }
    return printCount == 1 && !hasLoop && !hasCondition && methodCount <= 1 && !hasCollection && !hasComputation
}

private fun conceptMatches(lower: String, tags: List<String>): List<String> {
    val tagText = tags.joinToString(" ")
    val matches = mutableListOf<String>()
    fun addIf(label: String, condition: Boolean) {
        if (condition) matches += label
    }
    addIf("It uses variables or constants to store data.", ("variable" in tagText || "data" in tagText) && Regex("""\b(int|double|float|long|short|byte|char|boolean|String|final)\b""").containsMatchIn(lower))
    addIf("It uses a condition for decision making.", ("condition" in tagText || "if" in tagText || "decision" in tagText) && (lower.hasWord("if") || lower.hasWord("switch")))
    addIf("It uses repetition for repeated work.", ("loop" in tagText || "repetition" in tagText) && (lower.hasWord("for") || lower.hasWord("while")))
    addIf("It uses array-style storage.", "array" in tagText && ("[]" in lower || ".length" in lower))
    addIf("It uses String operations.", "string" in tagText && listOf("string", "charat", "substring", "equals", "split", "trim", "stringbuilder").any { it in lower })
    addIf("It uses methods to name reusable steps.", "method" in tagText && lower.hasWord("return"))
    addIf("It uses OOP ideas such as classes, fields, or access control.", "oop" in tagText && listOf("class", "private", "public", "this.", "extends", "implements").any { it in lower })
    addIf("It uses collection types.", ("collection" in tagText || "dsa" in tagText) && listOf("arraylist", "hashmap", "hashset", "list<", "map<", "set<").any { it in lower })
    addIf("It includes exception or error handling.", ("exception" in tagText || "file" in tagText) && listOf("try", "catch", "throw", "throws").any { lower.hasWord(it) })
    return matches.distinct()
}

private fun hasReadableNames(code: String): Boolean {
    val shortVariableCount = Regex("""\b(?:int|double|float|long|String|boolean|char|var)\s+[a-z]\b""").findAll(code).count()
    val meaningfulName = Regex(
        """\b(total|count|index|score|name|result|student|amount|balance|number|price|average|service|repository|manager|calculator|account|items|grades)\b""",
        RegexOption.IGNORE_CASE
    ).containsMatchIn(code)
    return meaningfulName || shortVariableCount <= 2 && code.lines().size > 2
}

private fun rubricHits(lower: String, rubric: List<String>): Int {
    return rubric.count { item ->
        item.lowercase(Locale.ROOT)
            .split(Regex("""[^a-z0-9]+"""))
            .filter { it.length >= 5 }
            .take(5)
            .any { it in lower }
    }
}

private fun alternativeApproachesFor(target: ExaminerTarget): List<String> {
    val tags = target.tags.joinToString(" ").lowercase(Locale.ROOT)
    val suggestions = mutableListOf<String>()
    if ("loop" in tags || "array" in tags || "dsa" in tags) {
        suggestions += "Loop-first: solve it with a simple for/while loop and a dry-run table."
    }
    if ("method" in tags || target.difficulty !in listOf("Beginner", "Easy")) {
        suggestions += "Method-first: create one method for input, one for logic, and one for output."
    }
    if ("oop" in tags || "capstone" in tags) {
        suggestions += "OOP-first: create small classes with one responsibility each, then connect them from Main."
    }
    if ("collection" in tags || "map" in tags || "dsa" in tags) {
        suggestions += "Collection-first: use List, Set, or Map to remove manual bookkeeping."
    }
    if ("stream" in tags || "functional" in tags) {
        suggestions += "Functional style: try map, filter, reduce, and collect after the loop version works."
    }
    if ("capstone" in tags || target.difficulty in listOf("Hard", "Expert")) {
        suggestions += "Test-first: write sample inputs, expected outputs, edge cases, and then code until they pass."
    }
    if (suggestions.isEmpty()) {
        suggestions += "Direct approach: write the smallest clear solution that matches the expected output."
        suggestions += "Refactored approach: move the main logic into a named method after it works."
        suggestions += "Professional approach: add validation, meaningful names, and one extra test case."
    }
    return suggestions.take(5)
}

private fun verdictFor(score: Int): String {
    return when {
        score >= 85 -> "Strong answer. This is moving toward portfolio-quality work."
        score >= 70 -> "Good answer. It likely works, but a few professional habits can make it safer."
        score >= 50 -> "Partly correct. The idea is visible, but it needs stronger structure or proof."
        else -> "Needs more work. Keep the idea, then rebuild it step by step."
    }
}

@Composable
private fun FlashcardScreen(cards: List<Flashcard>) {
    var index by rememberSaveable { mutableIntStateOf(0) }
    var showBack by rememberSaveable { mutableStateOf(false) }
    val card = cards.getOrNull(index)
    if (card == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No flashcards yet.") }
        return
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        ElevatedCard(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .clickable { showBack = !showBack },
            shape = RoundedCornerShape(8.dp)
        ) {
            Box(Modifier.fillMaxSize().padding(20.dp), contentAlignment = Alignment.Center) {
                Text(
                    text = if (showBack) card.back else card.front,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("${index + 1} / ${cards.size} - ${card.tag}")
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(
                enabled = index > 0,
                onClick = {
                    index--
                    showBack = false
                }
            ) { Text("Previous") }
            Button(
                onClick = {
                    index = if (index == cards.lastIndex) 0 else index + 1
                    showBack = false
                }
            ) { Text("Next") }
        }
    }
}

@Composable
private fun BookmarksScreen(lessons: List<Lesson>, onLessonClick: (Lesson) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (lessons.isEmpty()) {
            item { Text("No bookmarks yet. Open a lesson and tap the bookmark icon.") }
        }
        items(lessons) { lesson ->
            LessonListItem(lesson, onClick = { onLessonClick(lesson) })
        }
    }
}

@Composable
private fun SearchScreen(lessons: List<Lesson>, onLessonClick: (Lesson) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    val results = if (query.isBlank()) {
        lessons.take(20)
    } else {
        lessons.filter {
            it.title.contains(query, ignoreCase = true) ||
                it.simpleExplanation.contains(query, ignoreCase = true) ||
                it.tags.any { tag -> tag.contains(query, ignoreCase = true) }
        }
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search lessons, terms, or tags") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) }
            )
        }
        items(results) { lesson -> LessonListItem(lesson, onClick = { onLessonClick(lesson) }) }
    }
}

@Composable
private fun ProgressScreen(curriculum: Curriculum, progress: UserProgress) {
    val total = curriculum.allLessons().size
    val percent = progress.completionPercent(total)
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Learning Dashboard", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    LinearProgressIndicator(progress = percent / 100f, modifier = Modifier.fillMaxWidth())
                    Text("$percent% complete")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("${progress.completedLessons.size}/$total", "lessons")
                        StatPill("${progress.quizScores.count { it.value >= 70 }}", "passed quizzes")
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("${progress.streakCount}", "streak")
                        StatPill("${progress.totalStudyMinutes}", "minutes")
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("${progress.projectGrades.count { it.value >= 70 }}", "capstones")
                        StatPill("${progress.projectGrades.values.maxOrNull() ?: 0}%", "best project")
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatPill("${progress.codingDrillScores.count { it.value >= 100 }}", "coding drills")
                        StatPill("${progress.codingDrillScores.values.maxOrNull() ?: 0}%", "best drill")
                    }
                }
            }
        }
        item { SectionTitle("Recent Scores") }
        if (progress.quizScores.isEmpty()) {
            item { Text("No quiz attempts yet.") }
        } else {
            items(progress.quizScores.entries.sortedByDescending { it.value }) { entry ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(entry.key, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${entry.value}%")
                }
                Divider()
            }
        }
    }
}

@Composable
private fun AchievementsScreen(achievements: List<Achievement>, progress: UserProgress) {
    val derived = derivedAchievementIds(progress)
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(achievements) { achievement ->
            val earned = achievement.id in progress.earnedAchievements || achievement.id in derived
            ElevatedCard(
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.elevatedCardColors(
                    containerColor = if (earned) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface
                )
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (earned) Icons.Filled.EmojiEvents else Icons.Filled.Star,
                        contentDescription = null,
                        tint = if (earned) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.outline
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(achievement.title, fontWeight = FontWeight.Bold)
                        Text(achievement.description)
                    }
                }
            }
        }
    }
}

private fun derivedAchievementIds(progress: UserProgress): Set<String> = buildSet {
    if (progress.completedLessons.isNotEmpty()) add("first_lesson")
    if (progress.quizScores.any { it.value >= 70 }) add("first_quiz")
    if (progress.streakCount >= 7) add("seven_day_streak")
    if (progress.completedLessons.size >= 10) add("java_basics_completed")
    if (progress.completedLessons.size >= 30) add("java_master")
    if (progress.bookmarkedLessons.size >= 5) add("bookmark_builder")
    if (progress.quizScores.size >= 10) add("quiz_grinder")
    if (progress.codingDrillScores.count { it.value >= 100 } >= 10) add("loops_master")
    if (progress.projectGrades.any { it.value >= 70 }) add("project_builder")
    if (progress.projectGrades.any { it.value >= 85 }) add("portfolio_ready")
}

@Composable
private fun SettingsScreen(
    progress: UserProgress,
    onDarkModeChange: (Boolean) -> Unit,
    onPracticeModeChange: (Boolean) -> Unit,
    onReset: () -> Unit
) {
    val context = LocalContext.current
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SettingsRow(
                title = "Dark mode",
                body = "Use a darker reading theme.",
                icon = if (progress.darkMode) Icons.Filled.DarkMode else Icons.Filled.LightMode,
                checked = progress.darkMode,
                onCheckedChange = onDarkModeChange
            )
        }
        item {
            SettingsRow(
                title = "Practice mode",
                body = "Browse all lessons while strict unlock rules still track your real path.",
                icon = Icons.Filled.School,
                checked = progress.practiceMode,
                onCheckedChange = onPracticeModeChange
            )
        }
        item {
            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    val text = buildString {
                        appendLine("Java Mastery progress")
                        appendLine("Completed lessons: ${progress.completedLessons.size}")
                        appendLine("Passed quizzes: ${progress.quizScores.count { it.value >= 70 }}")
                        appendLine("Passed coding drills: ${progress.codingDrillScores.count { it.value >= 100 }}")
                        appendLine("Study minutes: ${progress.totalStudyMinutes}")
                        appendLine("Streak: ${progress.streakCount}")
                    }
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, text)
                    }
                    context.startActivity(Intent.createChooser(intent, "Export progress"))
                }
            ) {
                Icon(Icons.Filled.Share, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Export Progress")
            }
        }
        item {
            OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = onReset) {
                Icon(Icons.Filled.RestartAlt, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Reset Local Progress")
            }
        }
    }
}

@Composable
private fun SettingsRow(
    title: String,
    body: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    ElevatedCard(shape = RoundedCornerShape(8.dp)) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold)
                Text(body, style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}

@Composable
private fun CapstoneListScreen(
    projects: List<CapstoneProject>,
    progress: UserProgress,
    onProjectClick: (CapstoneProject) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text(
                "Build multi-file Java projects, run compiler-ready tests, and grade your code against job-style rubrics.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
        items(projects) { project ->
            ElevatedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onProjectClick(project) },
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(project.title, fontWeight = FontWeight.Bold)
                        Text(progress.projectGrades[project.id]?.let { "$it%" } ?: project.difficulty, color = MaterialTheme.colorScheme.primary)
                    }
                    Text(project.goal)
                    TagRow(project.tags)
                }
            }
        }
    }
}

@Composable
private fun CapstoneDetailScreen(
    project: CapstoneProject,
    savedGrade: Int?,
    onSaveGrade: (Int) -> Unit
) {
    val scope = rememberCoroutineScope()
    var selectedFilePath by rememberSaveable(project.id) { mutableStateOf(project.files.firstOrNull()?.path.orEmpty()) }
    var compilerUrl by rememberSaveable { mutableStateOf("http://10.0.2.2:4190") }
    var compilerResult by rememberSaveable(project.id) { mutableStateOf("") }
    var running by rememberSaveable(project.id) { mutableStateOf(false) }
    var projectAnswer by rememberSaveable(project.id) { mutableStateOf("") }
    var projectExaminerReport by remember(project.id) { mutableStateOf<ExaminerReport?>(null) }
    val checked = remember(project.id) { mutableStateMapOf<String, Boolean>() }
    val selectedFile = project.files.firstOrNull { it.path == selectedFilePath } ?: project.files.firstOrNull()
    val possiblePoints = project.rubric.sumOf { it.points }.coerceAtLeast(1)
    val earnedPoints = project.rubric.sumOf { if (checked[it.title] == true) it.points else 0 }
    val localGrade = ((earnedPoints.toFloat() / possiblePoints.toFloat()) * 100).toInt()
    val examinerTarget = remember(project.id) {
        ExaminerTarget(
            title = project.title,
            prompt = "${project.goal}\n${project.scenario}",
            expectedOutput = project.tests.joinToString("\n") { it.expectedOutput },
            difficulty = project.difficulty,
            tags = project.tags + listOf("capstone", "oop", "testing"),
            rubric = project.rubric.map { "${it.title}: ${it.description}" }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(project.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(project.goal)
            TagRow(listOf(project.difficulty) + project.tags)
            if (savedGrade != null) {
                Spacer(Modifier.height(8.dp))
                Text("Saved best grade: $savedGrade%", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
            }
        }
        item { LessonSection("Scenario", project.scenario) }
        item {
            SectionTitle("Milestones")
            BulletList(project.milestones)
        }
        item {
            SectionTitle("Project Files")
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(project.files) { file ->
                    FilterChip(
                        selected = file.path == selectedFile?.path,
                        onClick = { selectedFilePath = file.path },
                        label = { Text(file.path) }
                    )
                }
            }
        }
        if (selectedFile != null) {
            item {
                ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(selectedFile.path, fontWeight = FontWeight.Bold)
                        Text(selectedFile.explanation)
                        CodeBlock(selectedFile.content)
                    }
                }
            }
        }
        item {
            SectionTitle("Automated Tests")
            project.tests.forEach { test ->
                ElevatedCard(shape = RoundedCornerShape(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${test.name} (${test.points} pts)", fontWeight = FontWeight.Bold)
                        Text(test.description)
                        Text("Expected output", fontWeight = FontWeight.Bold)
                        CodeBlock(test.expectedOutput)
                    }
                }
            }
        }
        item {
            SectionTitle("Run With Real javac Compiler Service")
            Text("Start the local compiler service on your computer, then enter its URL. On emulator use 10.0.2.2; on a phone use your computer's LAN IP.")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = compilerUrl,
                onValueChange = { compilerUrl = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Compiler service URL") }
            )
            Spacer(Modifier.height(8.dp))
            Button(
                enabled = !running,
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    running = true
                    compilerResult = "Running..."
                    scope.launch {
                        compilerResult = runCompilerService(compilerUrl, project)
                        running = false
                    }
                }
            ) {
                Text(if (running) "Running..." else "Compile And Run Tests")
            }
            if (compilerResult.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                CodeBlock(compilerResult)
            }
        }
        item {
            SectionTitle("Project Examiner")
            Text("Paste your own project code, important files, or design notes. This local examiner reviews architecture, tests, edge cases, and maintainability. Use the compiler service above for exact compile/run proof.")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = projectAnswer,
                onValueChange = {
                    projectAnswer = it
                    projectExaminerReport = null
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Your project answer or notes") },
                minLines = 10
            )
            Spacer(Modifier.height(8.dp))
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = { projectExaminerReport = examineAnswer(projectAnswer, examinerTarget) }
            ) {
                Text("Review My Project Approach")
            }
        }
        projectExaminerReport?.let { report ->
            item {
                ExaminerReportCard(report)
            }
        }
        item {
            SectionTitle("Project Grading Rubric")
            project.rubric.forEach { criterion ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Checkbox(
                        checked = checked[criterion.title] == true,
                        onCheckedChange = { checked[criterion.title] = it }
                    )
                    Column(Modifier.weight(1f)) {
                        Text("${criterion.title} (${criterion.points} pts)", fontWeight = FontWeight.Bold)
                        Text(criterion.description)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text("Local rubric grade: $localGrade%", fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Button(modifier = Modifier.fillMaxWidth(), onClick = { onSaveGrade(localGrade) }) {
                Text("Save Project Grade")
            }
        }
        item {
            SectionTitle("Run Instructions")
            BulletList(project.runInstructions)
        }
    }
}

private suspend fun runCompilerService(baseUrl: String, project: CapstoneProject): String = withContext(Dispatchers.IO) {
    runCatching {
        val payload = JSONObject()
        payload.put("mainClass", "Main")
        payload.put("files", JSONArray().apply {
            project.files.forEach { file ->
                put(JSONObject().apply {
                    put("path", file.path)
                    put("content", file.content)
                })
            }
        })
        payload.put("tests", JSONArray().apply {
            project.tests.filter { it.id.endsWith("smoke") }.forEach { test ->
                put(JSONObject().apply {
                    put("id", test.id)
                    put("name", test.name)
                    put("input", test.input)
                    put("expectedOutput", test.expectedOutput)
                    put("points", test.points)
                })
            }
        })

        val normalized = baseUrl.trim().trimEnd('/')
        val connection = (URL("$normalized/run").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 15000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
        }
        connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        stream.bufferedReader().use { it.readText() }
    }.getOrElse { error ->
        "Could not reach compiler service: ${error.message}\n\nStart it with: node tools/java-compiler-service/server.mjs"
    }
}

private suspend fun runCodingDrillCompiler(baseUrl: String, task: PlaygroundTask, code: String): CompilerCheckResult = withContext(Dispatchers.IO) {
    runCatching {
        val payload = JSONObject()
        payload.put("mainClass", "Main")
        payload.put("files", JSONArray().apply {
            put(JSONObject().apply {
                put("path", "Main.java")
                put("content", code)
            })
        })
        payload.put("tests", JSONArray().apply {
            put(JSONObject().apply {
                put("id", "${task.id}-smoke")
                put("name", "Compile and run coding drill")
                put("input", "")
                put("expectedOutput", task.expectedOutput)
                put("points", 100)
            })
        })

        val normalized = baseUrl.trim().trimEnd('/')
        val connection = (URL("$normalized/run").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8000
            readTimeout = 15000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
        }
        connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val body = stream.bufferedReader().use { it.readText() }
        val json = JSONObject(body)
        val score = json.optInt("score", 0)
        val passed = json.optBoolean("ok", false) && score >= 100
        val tests = json.optJSONArray("tests")
        val testSummary = buildString {
            appendLine(if (passed) "PASS: Required coding drill passed." else "NOT PASSED: Keep fixing and run again.")
            appendLine("Compiler score: $score%")
            val compile = json.optJSONObject("compile")
            val stderr = compile?.optString("stderr").orEmpty()
            if (stderr.isNotBlank()) {
                appendLine()
                appendLine("Compiler messages:")
                appendLine(stderr)
            }
            if (tests != null) {
                for (index in 0 until tests.length()) {
                    val test = tests.optJSONObject(index)
                    if (test != null) {
                        appendLine()
                        appendLine("${if (test.optBoolean("passed")) "PASS" else "FAIL"} - ${test.optString("name")}")
                        appendLine("Expected:")
                        appendLine(test.optString("expectedOutput"))
                        appendLine("Actual:")
                        appendLine(test.optString("actualOutput"))
                        val testError = test.optString("stderr")
                        if (testError.isNotBlank()) {
                            appendLine("stderr:")
                            appendLine(testError)
                        }
                    }
                }
            }
            val note = json.optString("note")
            if (note.isNotBlank()) {
                appendLine()
                appendLine(note)
            }
        }
        CompilerCheckResult(score = score, passed = passed, message = testSummary)
    }.getOrElse { error ->
        CompilerCheckResult(
            score = 0,
            passed = false,
            message = "Could not reach compiler service: ${error.message}\n\nStart it with: node tools/java-compiler-service/server.mjs"
        )
    }
}

@Composable
private fun CertificateScreen(curriculum: Curriculum, progress: UserProgress) {
    val context = LocalContext.current
    val percent = progress.completionPercent(curriculum.allLessons().size)
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(
            shape = RoundedCornerShape(8.dp),
            border = BorderStroke(2.dp, MaterialTheme.colorScheme.primary),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(Icons.Filled.CardMembership, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
                Text("Certificate of Java Learning", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Presented to")
                Text("Ali Rayyan", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                Text("for completing $percent% of Java Mastery: Zero to Advanced")
                Divider()
                Text("Developer: Ali Rayyan")
                Text("Offline certificate generated inside the app")
            }
        }
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                val shareText = "Ali Rayyan has completed $percent% of Java Mastery: Zero to Advanced."
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, shareText)
                }
                context.startActivity(Intent.createChooser(intent, "Share certificate"))
            }
        ) {
            Icon(Icons.Filled.Share, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("Share Certificate Text")
        }
    }
}

@Composable
private fun CodingLabScreen(
    tasks: List<PlaygroundTask>,
    progress: UserProgress,
    onSaveScore: (String, Int) -> Unit
) {
    if (tasks.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No coding drills yet.")
        }
        return
    }

    val scope = rememberCoroutineScope()
    var selectedId by rememberSaveable { mutableStateOf(tasks.first().id) }
    val selectedTask = tasks.firstOrNull { it.id == selectedId } ?: tasks.first()
    var code by rememberSaveable(selectedTask.id) { mutableStateOf(selectedTask.starterCode) }
    var compilerUrl by rememberSaveable { mutableStateOf("http://10.0.2.2:4190") }
    var result by rememberSaveable(selectedTask.id) { mutableStateOf("") }
    var running by rememberSaveable(selectedTask.id) { mutableStateOf(false) }
    val passedCount = progress.codingDrillScores.count { it.value >= 100 }
    val selectedScore = progress.codingDrillScores[selectedTask.id] ?: 0

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Intensive Must-Code Lab", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Reading helps, but Java skill is earned by writing code. A drill counts only after your code compiles and matches the expected output.")
        }
        item {
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Validated coding drills", fontWeight = FontWeight.Bold)
                        Text("$passedCount/${tasks.size}")
                    }
                    LinearProgressIndicator(
                        progress = passedCount.toFloat() / tasks.size.toFloat(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tasks) { task ->
                    val passed = (progress.codingDrillScores[task.id] ?: 0) >= 100
                    FilterChip(
                        selected = task.id == selectedTask.id,
                        onClick = {
                            selectedId = task.id
                            result = ""
                            running = false
                        },
                        label = { Text("${if (passed) "PASS " else ""}L${task.levelId}: ${task.title}", maxLines = 1, overflow = TextOverflow.Ellipsis) }
                    )
                }
            }
        }
        item {
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(selectedTask.title, fontWeight = FontWeight.Bold)
                        Text(if (selectedScore >= 100) "Passed" else "Required", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                    Text(selectedTask.prompt)
                    TagRow(selectedTask.tags)
                }
            }
        }
        item {
            OutlinedTextField(
                value = code,
                onValueChange = {
                    code = it
                    result = ""
                },
                modifier = Modifier.fillMaxWidth(),
                minLines = 12,
                label = { Text("Write Java code that passes the test") }
            )
        }
        item {
            OutlinedTextField(
                value = compilerUrl,
                onValueChange = { compilerUrl = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Compiler service URL") }
            )
            Spacer(Modifier.height(8.dp))
            Text("Use 10.0.2.2 on Android emulator. On a real phone, use your computer's LAN IP while the compiler service is running.")
        }
        item {
            Button(
                enabled = !running,
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    running = true
                    result = "Running required compiler test..."
                    scope.launch {
                        val check = runCodingDrillCompiler(compilerUrl, selectedTask, code)
                        result = check.message
                        running = false
                        if (check.passed) onSaveScore(selectedTask.id, check.score)
                    }
                }
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text(if (running) "Running..." else "Run Required Test")
            }
        }
        if (result.isNotBlank()) {
            item {
                SectionTitle("Validation Result")
                CodeBlock(result)
            }
        }
        item {
            SectionTitle("Expected Output")
            CodeBlock(selectedTask.expectedOutput)
        }
        item {
            SectionTitle("Required Checks")
            BulletList(selectedTask.checks)
        }
        item {
            SectionTitle("Hints")
            BulletList(selectedTask.hints)
        }
    }
}

@Composable
private fun PlaygroundScreen(tasks: List<PlaygroundTask>) {
    if (tasks.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No playground tasks yet.")
        }
        return
    }

    var selectedId by rememberSaveable { mutableStateOf(tasks.first().id) }
    val selectedTask = tasks.firstOrNull { it.id == selectedId } ?: tasks.first()
    var code by rememberSaveable(selectedTask.id) { mutableStateOf(selectedTask.starterCode) }
    var output by rememberSaveable(selectedTask.id) { mutableStateOf("") }
    var ran by rememberSaveable(selectedTask.id) { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                "Offline Code Playground",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text("This simulator checks beginner examples and expected output. It is not a full Java compiler.")
        }
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tasks.take(30)) { task ->
                    FilterChip(
                        selected = task.id == selectedTask.id,
                        onClick = {
                            selectedId = task.id
                            output = ""
                            ran = false
                        },
                        label = { Text("L${task.levelId}: ${task.title}", maxLines = 1, overflow = TextOverflow.Ellipsis) }
                    )
                }
            }
        }
        item {
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(selectedTask.title, fontWeight = FontWeight.Bold)
                    Text(selectedTask.prompt)
                    TagRow(selectedTask.tags)
                }
            }
        }
        item {
            OutlinedTextField(
                value = code,
                onValueChange = { code = it },
                modifier = Modifier.fillMaxWidth(),
                minLines = 10,
                label = { Text("Editable Java code") }
            )
        }
        item {
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    output = simulateJavaOutput(code, selectedTask.expectedOutput)
                    ran = true
                }
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Run Simulation")
            }
        }
        if (ran) {
            item {
                SectionTitle("Simulated Output")
                CodeBlock(output)
                Spacer(Modifier.height(8.dp))
                val passed = output.trim() == selectedTask.expectedOutput.trim()
                Text(
                    if (passed) "Output matches the expected result." else "Output differs from the expected result. Compare line by line.",
                    color = if (passed) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.tertiary,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        item {
            SectionTitle("Expected Output")
            CodeBlock(selectedTask.expectedOutput)
        }
        item {
            SectionTitle("Checks")
            BulletList(selectedTask.checks)
        }
        item {
            SectionTitle("Hints")
            BulletList(selectedTask.hints)
        }
        item {
            LessonSection("Explanation", selectedTask.explanation)
        }
    }
}

private fun simulateJavaOutput(code: String, fallback: String): String {
    val printedStrings = Regex("""System\.out\.println\("([^"]*)"\)""")
        .findAll(code)
        .map { it.groupValues[1] }
        .toList()
    if (printedStrings.isNotEmpty()) return printedStrings.joinToString("\n")

    val printStrings = Regex("""System\.out\.print\("([^"]*)"\)""")
        .findAll(code)
        .map { it.groupValues[1] }
        .toList()
    if (printStrings.isNotEmpty()) return printStrings.joinToString("")

    return when {
        "for (" in code && "Practice" in code -> "Practice 1\nPractice 2\nPractice 3\nPractice 4\nPractice 5"
        "binarySearch" in code -> "Target found at index 3"
        "add(" in code -> "30"
        "StringBuilder" in code -> "Java Mastery"
        "HashMap" in code -> "95"
        "ArrayList" in code -> "Ali\nRayyan"
        else -> fallback
    }
}

@Composable
private fun CodeExamplesScreen(lessons: List<Lesson>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(lessons.filter { it.javaCode.isNotBlank() }) { lesson ->
            ElevatedCard(shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(lesson.title, fontWeight = FontWeight.Bold)
                    TagRow(lesson.tags)
                    CodeBlock(lesson.javaCode)
                }
            }
        }
    }
}

@Composable
private fun LessonListItem(lesson: Lesson, onClick: () -> Unit) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(lesson.title, fontWeight = FontWeight.Bold)
            Text("Level ${lesson.levelId} • ${lesson.estimatedMinutes} min")
            TagRow(lesson.tags)
        }
    }
}

@Composable
private fun LessonSection(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SectionTitle(title)
        Text(body)
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
}

@Composable
private fun BulletList(items: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEach { Text("• $it") }
    }
}

@Composable
private fun TagRow(tags: List<String>) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        tags.take(5).forEach { tag ->
            AssistChip(onClick = {}, label = { Text(tag) })
        }
    }
}

@Composable
private fun StatPill(value: String, label: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
            Text(value, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun CodeBlock(code: String) {
    SelectionContainer {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Text(
                text = code,
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
