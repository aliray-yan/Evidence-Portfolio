# Java Mastery

**Java Mastery: Zero to Advanced** is an offline-first Android learning app for Java programming.

- Package: `com.alirayyan.javamastery`
- App name: `Java Mastery`
- Developer: `Ali Rayyan`
- UI: Kotlin + Jetpack Compose
- Minimum SDK: 23
- Target SDK: 34
- Storage: local DataStore progress
- APIs/backends: none
- Internet requirement: none for app learning

## What Is Implemented

- Splash, Home, Learning Path, Level Detail, Lesson Reader, Quiz, Quiz Result, Practice, Practice Detail, Coding Lab, Flashcards, Bookmarks, Search, Progress, Achievements, Settings, Certificate, Code Examples, Playground, Capstones, and Capstone Detail screens.
- Static web version under `web/`.
- Offline curriculum stored in `app/src/main/assets/curriculum.json`.
- 31 Java levels from absolute computer/programming basics to expert Java topics and a dedicated Java Android developer track.
- 414 lessons.
- 3,312 lesson quiz questions.
- 7 final exams, one after every 5 levels plus an Android developer track final.
- 175 final exam questions.
- 485 practice exercises with hints, expected output, and multiple solution approaches.
- 161 playground tasks.
- 161 required Coding Lab drills using the same task bank, with local compiler validation and saved pass scores.
- 16 multi-file capstone projects with tests, rubrics, and saved grades.
- 414 flashcards.
- 33 achievements.
- Java Android developer track covering calculator, to-do, quiz, notes, RecyclerView, Room, Retrofit/API, Firebase-free offline apps, MVVM, XML/Compose concepts, and APK signing/release workflow.
- Original build-your-own style Java projects inspired by open references, including HTTP server core, JSON parser, grep-style search, Redis-style key-value store, Git-lite object store, and Spring Security flow simulator.
- Local examiner for practice answers and capstone project approaches. It gives an offline score, detected approach, strengths, improvement advice, and alternate solution styles without using an API.
- Optional local `javac` compiler service for real playground and capstone compile/run checks.
- Local progress tracking for completed lessons, quiz scores, bookmarks, notes, streak, study minutes, unlocked level, dark mode, and practice mode.
- Lesson text-to-speech using Android built-in TTS.
- Export progress as text.
- Certificate-style completion screen generated inside the app.
- Dark and light theme.

## APK

The debug APK was built successfully:

```text
app/build/outputs/apk/debug/app-debug.apk
```

The release APK was also built successfully as an unsigned artifact:

```text
app/build/outputs/apk/release/app-release-unsigned.apk
```

Sign the release APK with your own keystore before publishing or sharing it as a production build.

Verified APK metadata:

```text
package: com.alirayyan.javamastery
versionName: 1.0
sdkVersion: 23
targetSdkVersion: 34
application-label: Java Mastery
```

## How To Open In Android Studio

1. Open Android Studio.
2. Choose **Open**.
3. Select this project folder.
4. Wait for Gradle sync.
5. Run the `app` configuration on an emulator or physical device.

## How To Build The APK

From the project root:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
& 'C:\Users\Ali Rayyan\.gradle\wrapper\dists\gradle-8.7-bin\bhs2wmbdwecv87pi65oeuq5iu\gradle-8.7\bin\gradle.bat' assembleDebug --no-daemon --offline
```

Output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

For an unsigned release APK:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
& 'C:\Users\Ali Rayyan\.gradle\wrapper\dists\gradle-8.7-bin\bhs2wmbdwecv87pi65oeuq5iu\gradle-8.7\bin\gradle.bat' assembleRelease --no-daemon --offline
```

Output:

```text
app/build/outputs/apk/release/app-release-unsigned.apk
```

## How To Run The Web Version

The web app is in `web/` and uses the same curriculum data copied to `web/data/curriculum.json`.

### One-click Windows launcher

Double-click:

```text
JavaMasteryLauncher.exe
```

The launcher starts the local web server, starts the Java compiler service, opens Java Mastery in Google Chrome, asks for confirmation when the Chrome app window is closed, and then stops the launcher-owned server processes.

A desktop shortcut named `Java Mastery Web` can point to this executable.

### Manual web commands

```powershell
cd web
python -m http.server 4188 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4188
```

The web version includes learning path, lessons, quizzes, practice, local examiner feedback, wrong-solution review, required Coding Lab drills, capstones, project grading, optional compiler-service checks, flashcards, bookmarks, search, progress, achievements, settings, certificate, code examples, the offline playground simulator, and real `javac` playground runs through the local compiler service.

## Folder Structure

```text
app/
  src/main/
    assets/
      curriculum.json
    java/com/alirayyan/javamastery/
      MainActivity.kt
      data/
        CurriculumModels.kt
        CurriculumRepository.kt
        ProgressStore.kt
      ui/
        JavaMasteryApp.kt
        theme/
          JavaMasteryTheme.kt
tools/
  generate_curriculum.mjs
external_resources/
  downloaded public/open reference archives
```

## How To Add More Lessons

Edit `app/src/main/assets/curriculum.json`.

Add a new lesson inside a level:

```json
{
  "id": "level-2-final-constants",
  "levelId": 2,
  "title": "final Constants",
  "estimatedMinutes": 8,
  "simpleExplanation": "A final variable is a value you do not want to change.",
  "explainLikeTen": "It is like writing a rule in marker instead of pencil.",
  "realLifeAnalogy": "A school ID number should stay the same.",
  "javaCode": "final int PASS_MARKS = 50;",
  "lineByLine": ["final means this value should not be changed."],
  "commonMistakes": ["Trying to change a final value later."],
  "miniPractice": "Create a final variable named MAX_SCORE.",
  "quiz": [],
  "codingChallenge": {
    "prompt": "Create a constant for tax rate.",
    "expectedOutput": "Tax rate printed",
    "hints": [],
    "solutions": []
  },
  "summary": "final helps protect values that should stay fixed.",
  "nextLessonId": null,
  "tags": ["variables", "constants"]
}
```

You can also update `tools/generate_curriculum.mjs` and rerun:

```powershell
node tools\generate_curriculum.mjs
```

## How To Add Quiz Questions

Each lesson has a `quiz` array. Add questions like this:

```json
{
  "id": "unique-question-id",
  "question": "Which Java type stores whole numbers?",
  "options": ["int", "flower", "print", "main"],
  "correctAnswerIndex": 0,
  "explanation": "int stores whole numbers like 10, 25, or -3."
}
```

Final exams are stored in the `finalExams` array.

## How To Add Practice Exercises

Add to `practiceExercises`. Every exercise can include multiple solutions so learners see different ways to solve the same problem:

- simple direct approach
- reusable method approach
- scalable design approach

## How To Customize App Name, Icon, Or Theme

- App name: edit `app/src/main/res/values/strings.xml`.
- Package name: edit `namespace` and `applicationId` in `app/build.gradle.kts`, then move Kotlin packages if needed.
- Icon: edit files under `app/src/main/res/drawable/` and `app/src/main/res/mipmap-anydpi-v26/`.
- Theme colors: edit `app/src/main/java/com/alirayyan/javamastery/ui/theme/JavaMasteryTheme.kt`.

## External Resources

The app curriculum is original local JSON content. Public/open resources were downloaded into `external_resources/` only as future reference material. They are not required by the app at runtime and no Kaggle credentials or API keys were used.

Downloaded references include:

- Exercism Java Track
- TheAlgorithms Java
- Java Design Patterns
- small public Kaggle programming-language context datasets
- CodeCrafters Build Your Own X, used as inspiration for original from-scratch Java project prompts
- JavaRevisited simple HTTP server article, used only as conceptual HTTP server inspiration
- Spring official "Securing a Web Application" guide, used as conceptual Spring Security inspiration

Check each source license before copying any external text or code directly into the app.

## Troubleshooting

If Gradle fails with a JDK image transform or `jlink.exe` error, keep this property in `gradle.properties`:

```properties
android.disableJdkImageTransform=true
```

If Android Studio asks for a newer SDK target, install the matching SDK from SDK Manager or keep `compileSdk = 34` and `targetSdk = 34`.

If Gradle tries to download dependencies, open the project once with internet in Android Studio or use cached versions already listed in `app/build.gradle.kts`.

## Roadmap

Version 1:

- Offline lessons
- Quizzes
- Progress tracking
- Practice exercises
- Flashcards
- Achievements
- Bookmarks
- Search
- Certificate screen

Version 2:

- In-app Java compiler-grade playground without a companion desktop service
- Richer notes system
- Daily reminder notification
- Adaptive quiz difficulty
- Weak-topic review queue
- More real project tracks with milestones

Version 3:

- Optional AI tutor mode
- Optional cloud sync
- Community challenges
- Much deeper advanced Java, Spring Boot, system design, testing, deployment, and enterprise project material

## Current Limits

- The app now has a large job-ready academy foundation, but the hardest topics can still benefit from more hand-authored long-form walkthroughs, diagrams, and project milestones.
- The Android beginner playground is still simulated. Real `javac` compile/run checks are available for Android Coding Lab drills/capstones and the web Coding Lab/playground/capstones through the optional local desktop compiler service.
- The examiner is local and heuristic. It is useful for coaching, approach review, and maintainability feedback, while compiler tests remain the final proof for runnable code.
- The web app is implemented as a static local app. PWA install support can be added later.
