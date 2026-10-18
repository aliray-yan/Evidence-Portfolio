# Java Mastery Project Reference

Use this file as the compact working reference for continuing the project.

## Original Goal

Build **Java Mastery: Zero to Advanced**, an offline Android APK app for learning Java from absolute beginner level to expert/job-ready level.

Package: `com.alirayyan.javamastery`

Developer: `Ali Rayyan`

Core requirements:

- Android Studio compatible project
- Kotlin app code
- Jetpack Compose UI
- Minimum SDK 23+
- Offline-first, no login, no paid APIs, no required internet
- Local progress persistence
- Clean beginner-friendly architecture
- Buildable APK
- Local expandable curriculum data
- Java levels 0 through 30
- Lessons, quizzes, practice, flashcards, progress, badges, bookmarks, search, streak, final exams, certificate, dark/light mode
- Practical job-ready path with real projects, scalable-code thinking, clean code, OOP, DSA, testing, databases, networking, Android basics, advanced Java, and portfolio projects

## Implemented In Current Android App

- Kotlin + Jetpack Compose Android project
- App package `com.alirayyan.javamastery`
- App name `Java Mastery`
- Offline JSON curriculum in `app/src/main/assets/curriculum.json`
- DataStore local progress persistence
- Splash screen
- Home screen
- Learning path screen
- Level detail screen
- Lesson reader
- Code examples screen
- Quiz/test screen with immediate correct/incorrect feedback
- Quiz result screen
- Practice list and detail screens
- Multiple solution views for practice tasks
- Local examiner for practice answers with approach detection, score, strengths, improvements, and alternate solution styles
- Intensive Must-Code / Coding Lab area using compiler validation and saved drill scores
- Flashcards screen
- Bookmarks screen
- Search screen
- Progress screen
- Achievements screen
- Settings screen
- Certificate screen
- Dark/light mode toggle
- Practice mode toggle
- Completed lessons tracking
- Quiz score tracking
- Current/unlocked level tracking
- Daily streak tracking
- Total study time tracking
- Bookmarks/favorites
- Notes per lesson
- Built-in Android Text-to-Speech for lesson explanation
- Offline code playground simulator screen
- Optional local `javac` compiler service for capstone compile/run tests
- Optional local `javac` compiler service for required Coding Lab drills
- Capstone project screens with multi-file templates, automated tests, rubrics, saved grades, and local project examiner
- Export progress as text
- Static web version with matching curriculum, localStorage progress, real `javac` playground checks, capstone compiler checks, project grading, and local examiner feedback
- Windows one-click launcher `JavaMasteryLauncher.exe` that starts local servers, opens Chrome, prompts on close, and cleans up launcher-owned processes
- External public/open resources downloaded into `external_resources/` for future reference
- Dedicated Java for Android Developer Track covering Java Android calculator, to-do, quiz, notes, RecyclerView, Room, Retrofit/API, Firebase-free offline app design, MVVM, XML/Compose concepts, and APK signing/release workflow
- Original build-your-own style Java projects inspired by CodeCrafters Build Your Own X, JavaRevisited HTTP server concepts, and the official Spring Security getting-started guide
- Debug APK builds successfully
- Unsigned release APK builds successfully

## Verified Build Outputs

- Debug APK: `app/build/outputs/apk/debug/app-debug.apk`
- Unsigned release APK: `app/build/outputs/apk/release/app-release-unsigned.apk`

Phone install recommendation:

- Use `app-debug.apk` for direct phone installation.
- Use `app-release-unsigned.apk` only after signing with a release keystore.

## Current Content Baseline After Full Academy Expansion Pass

- 31 levels
- 414 lessons
- 3,312 lesson quiz questions
- 7 final exams
- 175 final exam questions
- 485 practice exercises
- 161 playground tasks
- 161 required Coding Lab drills backed by local compiler validation
- 16 multi-file capstone projects
- 414 flashcards
- 33 achievements

Expansion notes:

- All original level topics from the prompt are now represented.
- Lessons include deep-dive sections, real-work usage notes, dry-run guidance, and mastery checklists.
- Practice exercises include constraints, sample input/output, dry-run guidance, common wrong solutions, trade-offs, rubrics, and direct/method/scalable solution views.
- Practice and capstone screens include a local rule-based examiner that reviews learner answers without APIs. It recognizes direct, method-based, OOP, collections, stream, input-driven, decision-based, loop-based, and test-aware approaches, then gives remarks and improvement advice.
- Project practice now includes calculator, guessing game, grade system, bank account, library management, to-do, expense tracker, quiz app, contact book, REST client, JDBC CRUD, inventory system, DSA drills, testing drills, security drills, performance drills, portfolio refactoring, Java Android apps, RecyclerView, Room, Retrofit, MVVM, APK release workflow, and build-your-own Java systems projects.
- Questions are original and designed around understanding, dry runs, maintainability, debugging, and professional habits.
- Web version exists under `web/` and uses `web/data/curriculum.json`.
- Web playground now supports both beginner-safe simulation and real local `javac` compile/run checks through `tools/java-compiler-service/server.mjs`.
- Android and web both include a Coding Lab where drills count only when code compiles and matches expected output.
- Generator now writes both `app/src/main/assets/curriculum.json` and `web/data/curriculum.json`, so mobile and web curriculum stay synchronized.

## Still Pending / Needs Expansion

- More hand-authored long-form explanations and walkthroughs for the hardest topics
- More full capstone project milestones with screenshots/diagrams
- More realistic multi-file project templates beyond the current starter capstones
- More full native Android Studio starter projects that learners can open separately from the learning app
- More DSA problems with detailed dry-run tables
- More interview-style explanation prompts and answer rubrics
- Full in-app Java compiler-grade playground without a companion desktop service
- Stronger weak-topic review/adaptive difficulty
- Daily reminder notifications
- Spaced repetition for flashcards
- Proper release signing configuration
- Proper web packaging/PWA install support

## Content Policy For Continuing

- No API keys.
- No paid APIs.
- No Firebase/Supabase/OpenAI dependency.
- No required internet at runtime.
- Use original lesson text and original questions wherever possible.
- Open-source resources may be used only when license and attribution are appropriate.
- Avoid copying large copyrighted online question banks verbatim; create original equivalents instead.

## Current Architecture

Important files:

- `app/src/main/java/com/alirayyan/javamastery/MainActivity.kt`
- `app/src/main/java/com/alirayyan/javamastery/ui/JavaMasteryApp.kt`
- `app/src/main/java/com/alirayyan/javamastery/data/CurriculumModels.kt`
- `app/src/main/java/com/alirayyan/javamastery/data/CurriculumRepository.kt`
- `app/src/main/java/com/alirayyan/javamastery/data/ProgressStore.kt`
- `app/src/main/assets/curriculum.json`
- `tools/generate_curriculum.mjs`
- `web/index.html`
- `web/styles.css`
- `web/app.js`
- `web/data/curriculum.json`
- `JavaMasteryLauncher.exe`
- `launcher/JavaMasteryLauncher.cs`
- `launcher/make-icon.ps1`
- `launcher/JavaMastery.ico`
- `README.md`
- `TODO_ROADMAP.md`

Build commands:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
& 'C:\Users\Ali Rayyan\.gradle\wrapper\dists\gradle-8.7-bin\bhs2wmbdwecv87pi65oeuq5iu\gradle-8.7\bin\gradle.bat' assembleDebug --no-daemon --offline
```

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
& 'C:\Users\Ali Rayyan\.gradle\wrapper\dists\gradle-8.7-bin\bhs2wmbdwecv87pi65oeuq5iu\gradle-8.7\bin\gradle.bat' assembleRelease --no-daemon --offline
```

Known build compatibility setting:

```properties
android.disableJdkImageTransform=true
```

Web local server command:

```powershell
cd web
python -m http.server 4188 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4188
```
