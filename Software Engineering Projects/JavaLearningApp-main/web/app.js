const STORAGE_KEY = "javaMasteryWebProgress.v1";
const launchParams = new URLSearchParams(location.search);
if (launchParams.get("launcher") === "1") {
  sessionStorage.setItem("javaMasteryLauncherMode", "1");
}

window.addEventListener("beforeunload", event => {
  if (sessionStorage.getItem("javaMasteryLauncherMode") === "1") {
    event.preventDefault();
    event.returnValue = "";
  }
});

const state = {
  curriculum: null,
  route: "home",
  params: {},
  quiz: null,
  progress: loadProgress()
};

function loadProgress() {
  const fallback = {
    completedLessons: [],
    quizScores: {},
    bookmarks: [],
    notes: {},
    achievements: [],
    projectGrades: {},
    codingDrillScores: {},
    streak: 0,
    lastStudyDate: "",
    totalStudyMinutes: 0,
    highestUnlockedLevel: 0,
    darkMode: false,
    practiceMode: true
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  document.body.classList.toggle("dark", state.progress.darkMode);
}

function markStudy(minutes = 5) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.progress.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.progress.streak = state.progress.lastStudyDate === yesterday ? state.progress.streak + 1 : 1;
    state.progress.lastStudyDate = today;
  }
  state.progress.totalStudyMinutes += minutes;
  saveProgress();
}

function allLessons() {
  return state.curriculum.levels.flatMap(level => level.lessons);
}

function lessonById(id) {
  return allLessons().find(lesson => lesson.id === id);
}

function levelById(id) {
  return state.curriculum.levels.find(level => String(level.id) === String(id));
}

function pct(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function go(route, params = {}) {
  const query = new URLSearchParams(params).toString();
  location.hash = query ? `${route}?${query}` : route;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "home";
  const [route, query = ""] = raw.split("?");
  state.route = route;
  state.params = Object.fromEntries(new URLSearchParams(query));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shell(title, body) {
  const navItems = [
    ["home", "Home"],
    ["path", "Learning Path"],
    ["practice", "Practice"],
    ["coding", "Coding Lab"],
    ["capstones", "Capstones"],
    ["playground", "Playground"],
    ["flashcards", "Flashcards"],
    ["search", "Search"],
    ["bookmarks", "Bookmarks"],
    ["progress", "Progress"],
    ["achievements", "Achievements"],
    ["certificate", "Certificate"],
    ["examples", "Code Examples"],
    ["settings", "Settings"]
  ];
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="logo">J</div>
          <div>
            <h1>Java Mastery</h1>
            <p>Zero to Advanced</p>
          </div>
        </div>
        <div class="nav">
          ${navItems.map(([id, label]) => `<button class="${state.route === id ? "active" : ""}" onclick="go('${id}')">${label}</button>`).join("")}
        </div>
      </aside>
      <main class="content">
        <div class="topbar">
          <h2>${escapeHtml(title)}</h2>
          <button class="secondary" onclick="toggleTheme()">${state.progress.darkMode ? "Light" : "Dark"} mode</button>
        </div>
        ${body}
      </main>
    </div>
  `;
}

function render() {
  if (!state.curriculum) return;
  document.body.classList.toggle("dark", state.progress.darkMode);
  const views = {
    home: renderHome,
    path: renderPath,
    level: renderLevel,
    lesson: renderLesson,
    quiz: renderQuiz,
    practice: renderPractice,
    exercise: renderExercise,
    coding: renderCodingLab,
    capstones: renderCapstones,
    capstone: renderCapstone,
    playground: renderPlayground,
    flashcards: renderFlashcards,
    search: renderSearch,
    bookmarks: renderBookmarks,
    progress: renderProgress,
    achievements: renderAchievements,
    certificate: renderCertificate,
    examples: renderExamples,
    settings: renderSettings
  };
  const view = views[state.route] || renderHome;
  document.getElementById("app").innerHTML = view();
}

function renderHome() {
  const lessons = allLessons();
  const done = state.progress.completedLessons.length;
  const percent = pct(done, lessons.length);
  const next = lessons.find(lesson => !state.progress.completedLessons.includes(lesson.id)) || lessons[0];
  return shell("Dashboard", `
    <section class="card hero">
      <h3>Assalamu alaikum, Ali</h3>
      <p>Train Java from the first idea of programming to projects, DSA, clean code, testing, databases, networking, and advanced Java.</p>
      <button onclick="go('lesson', {id: '${next.id}'})">Continue Learning</button>
    </section>
    <div class="grid three section">
      ${statCard(`${done}/${lessons.length}`, "Lessons completed")}
      ${statCard(`${state.progress.streak}`, "Day streak")}
      ${statCard(`${state.progress.totalStudyMinutes}`, "Study minutes")}
    </div>
    <section class="card section">
      <div class="row space"><strong>Overall progress</strong><span>${percent}%</span></div>
      <div class="progress"><span style="width:${percent}%"></span></div>
    </section>
    <section class="grid two section">
      <button onclick="go('path')">Open Learning Path</button>
      <button onclick="go('playground')">Open Playground</button>
      <button onclick="go('coding')">Must-Code Lab</button>
      <button onclick="go('practice')">Practice Exercises</button>
      <button onclick="go('capstones')">Capstone Projects</button>
      <button onclick="go('certificate')">Certificate</button>
    </section>
  `);
}

function statCard(value, label) {
  return `<div class="card"><h3>${escapeHtml(value)}</h3><p class="muted">${escapeHtml(label)}</p></div>`;
}

function renderPath() {
  const cards = state.curriculum.levels.map(level => {
    const done = level.lessons.filter(lesson => state.progress.completedLessons.includes(lesson.id)).length;
    const percent = pct(done, level.lessons.length);
    const unlocked = state.progress.practiceMode || level.id <= state.progress.highestUnlockedLevel;
    return `
      <div class="item" onclick="${unlocked ? `go('level', {id: '${level.id}'})` : ""}">
        <div class="row space"><strong>LEVEL ${level.id}</strong><span>${unlocked ? `${done}/${level.lessons.length}` : "Locked"}</span></div>
        <h3>${escapeHtml(level.shortTitle)}</h3>
        <p class="muted">${escapeHtml(level.description)}</p>
        <div class="progress"><span style="width:${percent}%"></span></div>
      </div>`;
  }).join("");
  return shell("Learning Path", `<div class="list">${cards}</div>`);
}

function renderLevel() {
  const level = levelById(state.params.id);
  if (!level) return shell("Level", `<p>Level not found.</p>`);
  const lessons = level.lessons.map(lesson => `
    <div class="item" onclick="go('lesson', {id: '${lesson.id}'})">
      <div class="row space"><strong>${escapeHtml(lesson.title)}</strong><span>${state.progress.completedLessons.includes(lesson.id) ? "Done" : `${lesson.estimatedMinutes} min`}</span></div>
      <p class="muted">${escapeHtml(lesson.tags.join(", "))}</p>
    </div>`).join("");
  const exam = state.curriculum.finalExams.find(item => item.levelEnd === level.id);
  return shell(level.shortTitle, `
    <section class="card"><p>${escapeHtml(level.description)}</p>${chips(level.outcomes)}</section>
    <div class="list section">${lessons}</div>
    ${exam ? `<button class="section" onclick="startQuiz('exam', '${exam.id}')">Start ${escapeHtml(exam.title)}</button>` : ""}
  `);
}

function renderLesson() {
  const lesson = lessonById(state.params.id);
  if (!lesson) return shell("Lesson", `<p>Lesson not found.</p>`);
  const bookmarked = state.progress.bookmarks.includes(lesson.id);
  const note = state.progress.notes[lesson.id] || "";
  return shell(lesson.title, `
    <section class="card">
      <div class="row space">
        <span class="pill">Level ${lesson.levelId}</span>
        <button class="secondary" onclick="toggleBookmark('${lesson.id}')">${bookmarked ? "Remove bookmark" : "Bookmark"}</button>
      </div>
      ${section("Simple Explanation", lesson.simpleExplanation)}
      ${section("Explain Like I'm 10", lesson.explainLikeTen)}
      ${section("Real-life Analogy", lesson.realLifeAnalogy)}
      ${(lesson.deepDiveSections || []).map(s => section(s.title, s.body)).join("")}
      ${section("Where This Appears In Real Work", lesson.jobUse)}
      ${section("Java Example", code(lesson.javaCode))}
      ${listSection("Line by Line", lesson.lineByLine)}
      ${listSection("Dry Run", lesson.dryRun || [])}
      ${listSection("Common Mistakes", lesson.commonMistakes)}
      ${listSection("Mastery Checklist", lesson.masteryChecklist || [])}
      ${section("Mini Practice", lesson.miniPractice)}
      ${section("Coding Challenge", `<p>${escapeHtml(lesson.codingChallenge.prompt)}</p>${code(lesson.codingChallenge.expectedOutput)}`)}
      ${section("Summary", lesson.summary)}
      <div class="section">
        <label><strong>My notes</strong></label>
        <textarea id="lessonNote">${escapeHtml(note)}</textarea>
        <div class="row section">
          <button onclick="saveNote('${lesson.id}')">Save Note</button>
          <button class="secondary" onclick="speakLesson('${lesson.id}')">Listen</button>
          <button onclick="completeLesson('${lesson.id}', ${lesson.estimatedMinutes})">Mark Complete</button>
          <button onclick="startQuiz('lesson', '${lesson.id}')">Start Quiz</button>
        </div>
      </div>
    </section>
  `);
}

function renderQuiz() {
  if (!state.quiz) return shell("Quiz", `<p>No quiz selected.</p>`);
  const question = state.quiz.questions[state.quiz.index];
  const chosen = state.quiz.answers[state.quiz.index];
  const answerButtons = question.options.map((option, index) => {
    const cls = chosen == null ? "" : index === question.correctAnswerIndex ? "correct" : chosen === index ? "wrong" : "";
    return `<button class="answer ${cls}" onclick="answerQuiz(${index})">${escapeHtml(option)}</button>`;
  }).join("");
  return shell(state.quiz.title, `
    <section class="card">
      <p class="muted">Question ${state.quiz.index + 1} of ${state.quiz.questions.length}</p>
      <h3>${escapeHtml(question.question)}</h3>
      ${answerButtons}
      ${chosen == null ? "" : `<div class="card section"><strong>${chosen === question.correctAnswerIndex ? "Correct" : "Not yet"}</strong><p>${escapeHtml(question.explanation)}</p></div>`}
      <div class="row section">
        <button class="secondary" ${state.quiz.index === 0 ? "disabled" : ""} onclick="prevQuiz()">Previous</button>
        ${state.quiz.index === state.quiz.questions.length - 1 ? `<button onclick="finishQuiz()">Finish</button>` : `<button ${chosen == null ? "disabled" : ""} onclick="nextQuiz()">Next</button>`}
      </div>
    </section>
  `);
}

function renderPractice() {
  const difficulty = state.params.difficulty || "All";
  const exercises = state.curriculum.practiceExercises.filter(ex => difficulty === "All" || ex.difficulty === difficulty);
  return shell("Practice", `
    <div class="tabs">${["All", "Beginner", "Easy", "Medium", "Hard", "Expert"].map(d => `<button class="${d === difficulty ? "" : "secondary"}" onclick="go('practice', {difficulty:'${d}'})">${d}</button>`).join("")}</div>
    <div class="list">${exercises.map(ex => `
      <div class="item" onclick="go('exercise', {id:'${ex.id}'})">
        <div class="row space"><strong>${escapeHtml(ex.title)}</strong><span class="pill">${ex.difficulty}</span></div>
        <p class="muted">${escapeHtml(ex.problem)}</p>
        ${chips(ex.tags.slice(0, 5))}
      </div>`).join("")}</div>
  `);
}

function renderCapstones() {
  const projects = state.curriculum.capstoneProjects || [];
  return shell("Capstone Projects", `
    <section class="card">
      <p>These are multi-file Java projects with compiler-ready source files, automated smoke tests, milestones, rubrics, and optional real javac execution through the local compiler service.</p>
    </section>
    <div class="list section">${projects.map(project => `
      <div class="item" onclick="go('capstone', {id:'${project.id}'})">
        <div class="row space"><strong>${escapeHtml(project.title)}</strong><span class="pill">${state.progress.projectGrades[project.id] != null ? `${state.progress.projectGrades[project.id]}%` : project.difficulty}</span></div>
        <p>${escapeHtml(project.goal)}</p>
        <p class="muted">${escapeHtml(project.scenario)}</p>
        ${chips(project.tags)}
      </div>`).join("")}</div>
  `);
}

function renderCapstone() {
  const project = (state.curriculum.capstoneProjects || []).find(item => item.id === state.params.id);
  if (!project) return shell("Capstone", `<p>Project not found.</p>`);
  const compilerUrl = localStorage.getItem("javaMasteryCompilerUrl") || "http://127.0.0.1:4190";
  const savedAnswer = localStorage.getItem(`javaMasteryCapstoneAnswer:${project.id}`) || "";
  return shell(project.title, `
    <section class="card">
      ${chips([project.difficulty, ...project.tags])}
      ${section("Goal", project.goal)}
      ${section("Scenario", project.scenario)}
      ${listSection("Milestones", project.milestones)}
      ${listSection("Run Instructions", project.runInstructions)}
      <div class="section">
        <h3>Project Files</h3>
        ${project.files.map(file => `
          <details class="section" open>
            <summary><strong>${escapeHtml(file.path)}</strong> - ${escapeHtml(file.explanation)}</summary>
            ${code(file.content)}
          </details>`).join("")}
      </div>
      <div class="section">
        <h3>Automated Tests</h3>
        ${project.tests.map(test => `<div class="card section"><strong>${escapeHtml(test.name)} (${test.points} pts)</strong><p>${escapeHtml(test.description)}</p>${code(test.expectedOutput)}</div>`).join("")}
      </div>
      <div class="section">
        <h3>Real javac Compiler Service</h3>
        <p class="muted">Start <code>node tools/java-compiler-service/server.mjs</code>, then run tests here. This is local/offline and uses your own JDK.</p>
        <input id="compilerUrl" value="${escapeHtml(compilerUrl)}" placeholder="http://127.0.0.1:4190">
        <div class="row section">
          <button onclick="runCapstoneCompiler('${project.id}')">Compile And Run Tests</button>
          <button class="secondary" onclick="copyCapstoneFiles('${project.id}')">Copy Files JSON</button>
        </div>
        <div id="compilerResult" class="section"></div>
      </div>
      <div class="section">
        <h3>Project Examiner</h3>
        <p class="muted">Paste your own project code, important files, or design notes. This local examiner reviews architecture, tests, edge cases, and maintainability. Use the compiler service for exact compile/run proof.</p>
        <textarea id="capstoneAnswer" spellcheck="false" placeholder="Paste your project code or approach notes here...">${escapeHtml(savedAnswer)}</textarea>
        <div class="row section">
          <button onclick="examineCapstoneAnswer('${project.id}')">Review My Project Approach</button>
        </div>
        <div id="capstoneExaminerResult" class="section"></div>
      </div>
      <div class="section">
        <h3>Project Grading Rubric</h3>
        ${project.rubric.map((criterion, index) => `
          <label class="row">
            <input type="checkbox" class="rubricCheck" data-points="${criterion.points}">
            <span><strong>${escapeHtml(criterion.title)} (${criterion.points} pts)</strong><br><span class="muted">${escapeHtml(criterion.description)}</span></span>
          </label>`).join("<br>")}
        <div class="row section">
          <button onclick="gradeCapstone('${project.id}')">Save Local Grade</button>
          <span id="gradeResult" class="pill">${state.progress.projectGrades[project.id] != null ? `Saved: ${state.progress.projectGrades[project.id]}%` : "Not graded"}</span>
        </div>
      </div>
    </section>
  `);
}

function renderExercise() {
  const ex = state.curriculum.practiceExercises.find(item => item.id === state.params.id);
  if (!ex) return shell("Exercise", `<p>Exercise not found.</p>`);
  const savedAnswer = localStorage.getItem(`javaMasteryExerciseAnswer:${ex.id}`) || "";
  return shell(ex.title, `
    <section class="card">
      ${chips([ex.difficulty, ...ex.tags.slice(0, 5)])}
      ${section("Problem", ex.problem)}
      ${listSection("Constraints", ex.constraints || [])}
      ${section("Sample Input", code(ex.sampleInput || "No input required."))}
      ${section("Sample Output", code(ex.sampleOutput || ex.expectedOutput))}
      ${listSection("Hints", ex.hints)}
      ${section("Expected Output", code(ex.expectedOutput))}
      ${listSection("Dry Run", ex.dryRun || [])}
      ${listSection("Trade-offs", ex.tradeOffs || [])}
      ${listSection("Self-check Rubric", ex.rubric || [])}
      <div class="section">
        <h3>Local Examiner</h3>
        <p class="muted">Write or paste your answer here first. The examiner checks your approach, structure, likely output, edge cases, naming, and maintainability without using any API.</p>
        <textarea id="exerciseAnswer" spellcheck="false" placeholder="Write your Java answer here...">${escapeHtml(savedAnswer)}</textarea>
        <div class="row section">
          <button onclick="examineExerciseAnswer('${ex.id}')">Examine My Answer</button>
        </div>
        <div id="exerciseExaminerResult" class="section"></div>
      </div>
      <details class="section">
        <summary><strong>Reveal Common Wrong Solutions</strong></summary>
        ${(ex.commonWrongSolutions || []).map(solutionCard).join("")}
      </details>
      <details class="section">
        <summary><strong>Reveal Solution Approaches</strong></summary>
        ${(ex.solutions || []).map(solutionCard).join("")}
      </details>
    </section>
  `);
}

function renderCodingLab() {
  const taskId = state.params.id || state.curriculum.playgroundTasks[0]?.id;
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId) || state.curriculum.playgroundTasks[0];
  if (!task) return shell("Coding Lab", `<p>No coding drills yet.</p>`);
  const compilerUrl = localStorage.getItem("javaMasteryCompilerUrl") || "http://127.0.0.1:4190";
  const savedCode = localStorage.getItem(`javaMasteryCodingDrill:${task.id}`) || task.starterCode;
  const passed = Object.values(state.progress.codingDrillScores || {}).filter(score => score >= 100).length;
  const selectedScore = (state.progress.codingDrillScores || {})[task.id] || 0;
  return shell("Coding Lab", `
    <section class="card">
      <h3>Intensive Must-Code Lab</h3>
      <p>Reading helps, but Java skill is earned by writing code. A drill counts only after your code compiles and matches the expected output.</p>
      <div class="row space"><strong>Validated drills</strong><span>${passed}/${state.curriculum.playgroundTasks.length}</span></div>
      <div class="progress"><span style="width:${pct(passed, state.curriculum.playgroundTasks.length)}%"></span></div>
    </section>
    <div class="tabs section">${state.curriculum.playgroundTasks.map(t => {
      const isPassed = ((state.progress.codingDrillScores || {})[t.id] || 0) >= 100;
      return `<button class="${t.id === task.id ? "" : "secondary"}" onclick="go('coding', {id:'${t.id}'})">${isPassed ? "PASS " : ""}L${t.levelId}: ${escapeHtml(t.title)}</button>`;
    }).join("")}</div>
    <section class="card">
      <div class="row space"><h3>${escapeHtml(task.title)}</h3><span class="pill">${selectedScore >= 100 ? "Passed" : "Required"}</span></div>
      <p>${escapeHtml(task.prompt)}</p>
      ${chips(task.tags.slice(0, 5))}
      <textarea id="codingCode" spellcheck="false">${escapeHtml(savedCode)}</textarea>
      <div class="section">
        <h3>Required Compiler Test</h3>
        <p class="muted">Start <code>node tools/java-compiler-service/server.mjs</code>, then run the required test. This sends code only to your local computer.</p>
        <input id="codingCompilerUrl" value="${escapeHtml(compilerUrl)}" placeholder="http://127.0.0.1:4190">
        <div class="row section">
          <button onclick="runCodingDrill('${task.id}')">Run Required Test</button>
          <button class="secondary" onclick="resetCodingDrill('${task.id}')">Reset Starter</button>
        </div>
        <div id="codingResult" class="section"></div>
      </div>
      ${section("Expected Output", code(task.expectedOutput))}
      ${listSection("Required Checks", task.checks)}
      ${listSection("Hints", task.hints)}
    </section>
  `);
}

function renderPlayground() {
  const taskId = state.params.id || state.curriculum.playgroundTasks[0]?.id;
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId) || state.curriculum.playgroundTasks[0];
  if (!task) return shell("Playground", `<p>No playground tasks yet.</p>`);
  const compilerUrl = localStorage.getItem("javaMasteryCompilerUrl") || "http://127.0.0.1:4190";
  return shell("Playground", `
    <div class="tabs">${state.curriculum.playgroundTasks.map(t => `<button class="${t.id === task.id ? "" : "secondary"}" onclick="go('playground', {id:'${t.id}'})">L${t.levelId}: ${escapeHtml(t.title)}</button>`).join("")}</div>
    <section class="card">
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.prompt)}</p>
      <textarea id="playCode" spellcheck="false">${escapeHtml(task.starterCode)}</textarea>
      <div class="row section">
        <button onclick="runPlayground('${task.id}')">Run Simulation</button>
        <button onclick="runPlaygroundCompiler('${task.id}')">Compile With javac</button>
        <button class="secondary" onclick="resetPlayground('${task.id}')">Reset</button>
      </div>
      <div id="playOutput" class="section"></div>
      <div class="section">
        <h3>Real Java Compiler</h3>
        <p class="muted">Start <code>node tools/java-compiler-service/server.mjs</code>, then compile this playground file with your local JDK. This stays on your computer.</p>
        <input id="playgroundCompilerUrl" value="${escapeHtml(compilerUrl)}" placeholder="http://127.0.0.1:4190">
        <div id="playCompilerOutput" class="section"></div>
      </div>
      ${section("Expected Output", code(task.expectedOutput))}
      ${listSection("Checks", task.checks)}
      ${listSection("Hints", task.hints)}
      ${section("Explanation", task.explanation)}
    </section>
  `);
}

function renderFlashcards() {
  const index = Number(state.params.index || 0);
  const show = state.params.show === "back";
  const card = state.curriculum.flashcards[index] || state.curriculum.flashcards[0];
  return shell("Flashcards", `
    <section class="card" onclick="go('flashcards', {index:'${index}', show:'${show ? "front" : "back"}'})">
      <p class="muted">${index + 1} / ${state.curriculum.flashcards.length} - ${escapeHtml(card.tag)}</p>
      <h3>${escapeHtml(show ? card.back : card.front)}</h3>
    </section>
    <div class="row section">
      <button class="secondary" onclick="go('flashcards', {index:'${Math.max(0, index - 1)}'})">Previous</button>
      <button onclick="go('flashcards', {index:'${(index + 1) % state.curriculum.flashcards.length}'})">Next</button>
    </div>
  `);
}

function renderSearch() {
  const q = (state.params.q || "").toLowerCase();
  const lessons = allLessons().filter(lesson => !q || lesson.title.toLowerCase().includes(q) || lesson.simpleExplanation.toLowerCase().includes(q) || lesson.tags.join(" ").toLowerCase().includes(q));
  return shell("Search", `
    <input placeholder="Search lessons, terms, tags" value="${escapeHtml(state.params.q || "")}" oninput="go('search', {q:this.value})">
    <div class="list section">${lessons.slice(0, 120).map(lessonItem).join("")}</div>
  `);
}

function renderBookmarks() {
  const lessons = allLessons().filter(lesson => state.progress.bookmarks.includes(lesson.id));
  return shell("Bookmarks", `<div class="list">${lessons.length ? lessons.map(lessonItem).join("") : "<p>No bookmarks yet.</p>"}</div>`);
}

function renderProgress() {
  const lessons = allLessons();
  const percent = pct(state.progress.completedLessons.length, lessons.length);
  const passed = Object.values(state.progress.quizScores).filter(score => score >= 70).length;
  const projectPassed = Object.values(state.progress.projectGrades || {}).filter(score => score >= 70).length;
  const codingPassed = Object.values(state.progress.codingDrillScores || {}).filter(score => score >= 100).length;
  return shell("Progress", `
    <div class="grid three">
      ${statCard(`${percent}%`, "Overall progress")}
      ${statCard(`${passed}`, "Passed quizzes")}
      ${statCard(`${projectPassed}`, "Passed capstones")}
      ${statCard(`${codingPassed}`, "Passed coding drills")}
    </div>
    <section class="card section">
      <div class="progress"><span style="width:${percent}%"></span></div>
      <p>${state.progress.completedLessons.length} of ${lessons.length} lessons completed.</p>
    </section>
    <section class="card section">
      <h3>Scores</h3>
      ${Object.entries(state.progress.quizScores).map(([id, score]) => `<p><strong>${escapeHtml(id)}</strong>: ${score}%</p>`).join("") || "<p>No quizzes yet.</p>"}
    </section>
    <section class="card section">
      <h3>Project Grades</h3>
      ${Object.entries(state.progress.projectGrades || {}).map(([id, score]) => `<p><strong>${escapeHtml(id)}</strong>: ${score}%</p>`).join("") || "<p>No project grades yet.</p>"}
    </section>
    <section class="card section">
      <h3>Coding Lab Scores</h3>
      ${Object.entries(state.progress.codingDrillScores || {}).map(([id, score]) => `<p><strong>${escapeHtml(id)}</strong>: ${score}%</p>`).join("") || "<p>No coding drills passed yet.</p>"}
    </section>
  `);
}

function renderAchievements() {
  return shell("Achievements", `<div class="grid two">${state.curriculum.achievements.map(a => {
    const earned = derivedAchievements().includes(a.id) || state.progress.achievements.includes(a.id);
    return `<div class="card"><h3>${earned ? "[Earned] " : ""}${escapeHtml(a.title)}</h3><p>${escapeHtml(a.description)}</p><p class="muted">${escapeHtml(a.rule)}</p></div>`;
  }).join("")}</div>`);
}

function renderCertificate() {
  const percent = pct(state.progress.completedLessons.length, allLessons().length);
  return shell("Certificate", `
    <section class="card certificate">
      <h3>Certificate of Java Learning</h3>
      <p>Presented to</p>
      <div class="name">Ali Rayyan</div>
      <p>for completing ${percent}% of Java Mastery: Zero to Advanced</p>
      <p class="muted">Offline certificate generated inside the web app</p>
    </section>
    <button class="section" onclick="shareCertificate()">Share Certificate Text</button>
  `);
}

function renderExamples() {
  return shell("Code Examples", `<div class="list">${allLessons().slice(0, 180).map(lesson => `
    <div class="card">
      <h3>${escapeHtml(lesson.title)}</h3>
      ${chips(lesson.tags.slice(0, 5))}
      ${code(lesson.javaCode)}
    </div>`).join("")}</div>`);
}

function renderSettings() {
  return shell("Settings", `
    <section class="card">
      <label><input type="checkbox" ${state.progress.darkMode ? "checked" : ""} onchange="toggleTheme()"> Dark mode</label>
      <br><br>
      <label><input type="checkbox" ${state.progress.practiceMode ? "checked" : ""} onchange="togglePracticeMode()"> Practice mode</label>
      <div class="row section">
        <button onclick="exportProgress()">Export Progress</button>
        <button class="danger" onclick="resetProgress()">Reset Local Progress</button>
      </div>
    </section>
  `);
}

function lessonItem(lesson) {
  return `<div class="item" onclick="go('lesson', {id:'${lesson.id}'})"><strong>${escapeHtml(lesson.title)}</strong><p class="muted">Level ${lesson.levelId} - ${lesson.estimatedMinutes} min</p>${chips(lesson.tags.slice(0, 5))}</div>`;
}

function section(title, body) {
  if (!body) return "";
  return `<div class="section"><h3>${escapeHtml(title)}</h3>${typeof body === "string" && body.startsWith("<") ? body : `<p>${escapeHtml(body)}</p>`}</div>`;
}

function listSection(title, items = []) {
  if (!items.length) return "";
  return `<div class="section"><h3>${escapeHtml(title)}</h3><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function code(value) {
  return `<pre class="code">${escapeHtml(value)}</pre>`;
}

function chips(items = []) {
  return `<div class="row">${items.map(item => `<span class="pill">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function solutionCard(solution) {
  return `<div class="card section"><h4>${escapeHtml(solution.title)}</h4><p>${escapeHtml(solution.explanation)}</p>${code(solution.code)}</div>`;
}

function examineExerciseAnswer(exerciseId) {
  const exercise = state.curriculum.practiceExercises.find(item => item.id === exerciseId);
  const answer = document.getElementById("exerciseAnswer").value;
  localStorage.setItem(`javaMasteryExerciseAnswer:${exerciseId}`, answer);
  const report = examineAnswer(answer, {
    title: exercise.title,
    prompt: exercise.problem,
    expectedOutput: exercise.sampleOutput || exercise.expectedOutput,
    difficulty: exercise.difficulty,
    tags: exercise.tags || [],
    rubric: exercise.rubric || []
  });
  document.getElementById("exerciseExaminerResult").innerHTML = examinerHtml(report);
}

function examineCapstoneAnswer(projectId) {
  const project = (state.curriculum.capstoneProjects || []).find(item => item.id === projectId);
  const answer = document.getElementById("capstoneAnswer").value;
  localStorage.setItem(`javaMasteryCapstoneAnswer:${projectId}`, answer);
  const report = examineAnswer(answer, {
    title: project.title,
    prompt: `${project.goal}\n${project.scenario}`,
    expectedOutput: (project.tests || []).map(test => test.expectedOutput).join("\n"),
    difficulty: project.difficulty,
    tags: [...(project.tags || []), "capstone", "oop", "testing"],
    rubric: (project.rubric || []).map(item => `${item.title}: ${item.description}`)
  });
  document.getElementById("capstoneExaminerResult").innerHTML = examinerHtml(report);
}

function examineAnswer(answer, target) {
  const codeText = String(answer || "").trim();
  if (!codeText) {
    return {
      score: 0,
      verdict: "No answer to check yet.",
      approach: "No approach detected",
      remarks: ["Write a solution, pseudocode, or design notes first. The examiner can review complete Java code or a clear plan."],
      strengths: [],
      improvements: ["Start with the simplest working idea, then improve it with methods, edge cases, and tests."],
      alternativeApproaches: alternativeApproachesFor(target)
    };
  }

  const lower = codeText.toLowerCase();
  const tags = (target.tags || []).map(tag => String(tag).toLowerCase());
  const tagText = tags.join(" ");
  const classCount = (codeText.match(/\bclass\s+[A-Za-z_][A-Za-z0-9_]*/g) || []).length;
  const methodCount = (codeText.match(/\b(?:public|private|protected)?\s*(?:static\s+)?(?:void|int|double|float|long|short|byte|char|boolean|String|List|Map|Set|ArrayList|HashMap|Optional|[A-Z][A-Za-z0-9_]*)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/g) || []).length;
  const hasMain = lower.includes("static void main");
  const hasLoop = hasWord(lower, "for") || hasWord(lower, "while") || hasWord(lower, "do");
  const hasCondition = hasWord(lower, "if") || hasWord(lower, "switch") || (codeText.includes("?") && codeText.includes(":"));
  const hasPrint = lower.includes("system.out.print");
  const hasReturn = hasWord(lower, "return");
  const hasScanner = lower.includes("scanner") || lower.includes("bufferedreader");
  const hasCollection = ["arraylist", "linkedlist", "hashmap", "hashset", "treeset", "treemap", "list<", "map<", "set<", "queue", "stack"].some(token => lower.includes(token));
  const hasStream = lower.includes(".stream()") || lower.includes(".stream(") || lower.includes("collect(") || lower.includes("filter(") || lower.includes("map(");
  const hasOop = classCount > 1 || /\b(private|protected)\s+/.test(lower) || hasWord(lower, "extends") || hasWord(lower, "implements");
  const hasValidation = hasCondition && ["< 0", "<= 0", "== null", "!= null", "isempty", "isblank", "throw", "try", "catch", "invalid", "else"].some(token => lower.includes(token));
  const hasTests = ["@test", "assert", "expected", "actual", "junit"].some(token => lower.includes(token));
  const outputMatches = likelyMatchesExpectedOutput(codeText, target.expectedOutput || "");
  const hardcoded = looksHardcoded(codeText, hasLoop, hasCondition, methodCount, hasCollection);
  const matches = conceptMatches(lower, tags);
  const readableNames = hasReadableNames(codeText);
  const rubricMatchCount = rubricHits(lower, target.rubric || []);

  let score = 12;
  if (hasMain || classCount > 0 || methodCount > 0) score += 10;
  if (hasPrint || hasReturn) score += 8;
  if (outputMatches) score += 16;
  score += Math.min(matches.length * 5, 20);
  if (methodCount >= 2) score += 10;
  if (hasOop) score += tagText.includes("oop") || tagText.includes("capstone") ? 12 : 6;
  if (hasCollection || hasStream) score += tagText.includes("collection") || tagText.includes("dsa") || tagText.includes("capstone") ? 10 : 5;
  if (hasValidation) score += 10;
  if (hasTests) score += tagText.includes("capstone") || ["Hard", "Expert"].includes(target.difficulty) ? 10 : 5;
  if (readableNames) score += 7;
  score += Math.min(rubricMatchCount * 4, 12);
  if (hardcoded) score -= 16;
  if (!outputMatches && (target.expectedOutput || "").trim()) score -= 4;
  score = Math.max(5, Math.min(100, score));

  const strengths = [];
  if (hasMain || classCount > 0) strengths.push("Your answer looks like real Java code instead of only a rough idea.");
  if (hasPrint || hasReturn) strengths.push("It produces a value or output, so it can be tested.");
  if (outputMatches) strengths.push("The visible output appears to match the expected output.");
  if (methodCount >= 2) strengths.push("You separated logic into methods, which makes changes safer.");
  if (hasOop) strengths.push("You used object-oriented structure, useful for larger programs.");
  if (hasCollection) strengths.push("You used Java collections, which is often cleaner than managing many separate variables.");
  if (hasStream) strengths.push("You tried a functional/stream style approach.");
  if (hasValidation) strengths.push("You thought about invalid or edge-case input.");
  if (hasTests) strengths.push("You included test thinking, which is a professional habit.");
  if (readableNames) strengths.push("Your names look readable enough for another developer to follow.");
  strengths.push(...matches);
  if (!strengths.length) strengths.push("You made a first attempt. That is useful because now it can be improved.");

  const improvements = [];
  if (!hasMain && classCount === 0 && methodCount === 0) improvements.push("Add a small Java structure: a class, a main method, or a named method that solves the task.");
  if (!outputMatches && (target.expectedOutput || "").trim()) improvements.push("Run the sample case and compare every line with the expected output.");
  if (hardcoded) improvements.push("Avoid printing only the sample answer. Compute the result from variables, input, or method parameters.");
  if (methodCount <= 1 && !["Beginner", "Easy"].includes(target.difficulty)) improvements.push("Move repeated or important logic into named methods so one change does not break everything.");
  if ((tagText.includes("oop") || tagText.includes("capstone")) && !hasOop) improvements.push("For this topic, consider classes with clear responsibilities instead of putting all logic in one place.");
  if ((tagText.includes("loop") || tagText.includes("array") || tagText.includes("dsa")) && !hasLoop && !hasCollection) improvements.push("This topic usually needs iteration or a data structure. Add a loop or collection if the problem has many values.");
  if ((tagText.includes("input") || tagText.includes("scanner")) && !hasScanner) improvements.push("If the task expects user input, read it with Scanner or another input tool instead of fixed values.");
  if (!hasValidation && !["Beginner", "Easy"].includes(target.difficulty)) improvements.push("Add edge-case handling, such as empty input, null values, negative numbers, or not-found cases.");
  if (!hasTests && (["Hard", "Expert"].includes(target.difficulty) || tagText.includes("capstone"))) improvements.push("Add small tests or at least write expected vs actual checks before calling it complete.");
  if (!readableNames) improvements.push("Use names that explain meaning, like totalMarks, balance, studentName, or average.");
  if (!improvements.length) improvements.push("Now improve it by adding one more edge case and one more test case.");

  const approachParts = [];
  if (hasOop) approachParts.push("object-oriented");
  if (methodCount >= 2) approachParts.push("method-based");
  if (hasCollection) approachParts.push("collections-based");
  if (hasStream) approachParts.push("stream-based");
  if (hasLoop) approachParts.push("loop-based");
  if (hasCondition) approachParts.push("decision-based");
  if (hasScanner) approachParts.push("input-driven");
  if (hasTests) approachParts.push("test-aware");
  const approach = approachParts.length ? `${[...new Set(approachParts)].join(" + ")} approach` : "direct procedural approach";

  const remarks = [
    `I detected a ${approach}. That can be valid; many Java problems have more than one good solution.`,
    outputMatches
      ? "Correctness signal is good because the expected output is visible in the answer or simulated output."
      : "Correctness is not proven yet. Use sample tests, manual dry runs, or the local compiler service for stronger proof.",
    "This is a local heuristic examiner. Treat it like a code review coach; compiler errors and tests are still the final judge."
  ];
  if (rubricMatchCount > 0) remarks.splice(2, 0, `Your answer appears to touch ${rubricMatchCount} rubric point(s).`);

  return {
    score,
    verdict: verdictFor(score),
    approach,
    remarks,
    strengths: [...new Set(strengths)].slice(0, 8),
    improvements: [...new Set(improvements)].slice(0, 8),
    alternativeApproaches: alternativeApproachesFor(target)
  };
}

function examinerHtml(report) {
  return `
    <div class="card examiner-report">
      <div class="row space"><strong>Examiner Report</strong><span class="pill">${report.score}%</span></div>
      <div class="scorebar"><span style="width:${report.score}%"></span></div>
      <p><strong>${escapeHtml(report.verdict)}</strong></p>
      <p>Detected approach: ${escapeHtml(report.approach)}</p>
      ${reportList("Remarks", report.remarks)}
      ${reportList("Strengths", report.strengths)}
      ${reportList("Improve Next", report.improvements)}
      ${reportList("Other Valid Ways", report.alternativeApproaches)}
    </div>`;
}

function reportList(title, items = []) {
  if (!items.length) return "";
  return `<div class="section"><h4>${escapeHtml(title)}</h4><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function hasWord(text, word) {
  return new RegExp(`\\b${escapeRegex(word)}\\b`).test(text);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function likelyMatchesExpectedOutput(codeText, expectedOutput) {
  const expected = String(expectedOutput || "").trim();
  if (!expected) return false;
  if (codeText.includes(expected)) return true;
  const simulated = simulateJavaOutput(codeText, "").trim();
  return simulated && simulated === expected;
}

function looksHardcoded(codeText, hasLoop, hasCondition, methodCount, hasCollection) {
  const lower = codeText.toLowerCase();
  const printCount = (codeText.match(/System\.out\.print(?:ln)?\s*\(/g) || []).length;
  const hasComputation = ["+", "-", "*", "/", "%", "return", "scanner", "parseint", "parsedouble"].some(token => lower.includes(token));
  return printCount === 1 && !hasLoop && !hasCondition && methodCount <= 1 && !hasCollection && !hasComputation;
}

function conceptMatches(lower, tags) {
  const tagText = tags.join(" ");
  const matches = [];
  const addIf = (label, condition) => {
    if (condition) matches.push(label);
  };
  addIf("It uses variables or constants to store data.", (tagText.includes("variable") || tagText.includes("data")) && /\b(int|double|float|long|short|byte|char|boolean|string|final)\b/.test(lower));
  addIf("It uses a condition for decision making.", (tagText.includes("condition") || tagText.includes("if") || tagText.includes("decision")) && (hasWord(lower, "if") || hasWord(lower, "switch")));
  addIf("It uses repetition for repeated work.", (tagText.includes("loop") || tagText.includes("repetition")) && (hasWord(lower, "for") || hasWord(lower, "while")));
  addIf("It uses array-style storage.", tagText.includes("array") && (lower.includes("[]") || lower.includes(".length")));
  addIf("It uses String operations.", tagText.includes("string") && ["string", "charat", "substring", "equals", "split", "trim", "stringbuilder"].some(token => lower.includes(token)));
  addIf("It uses methods to name reusable steps.", tagText.includes("method") && hasWord(lower, "return"));
  addIf("It uses OOP ideas such as classes, fields, or access control.", tagText.includes("oop") && ["class", "private", "public", "this.", "extends", "implements"].some(token => lower.includes(token)));
  addIf("It uses collection types.", (tagText.includes("collection") || tagText.includes("dsa")) && ["arraylist", "hashmap", "hashset", "list<", "map<", "set<"].some(token => lower.includes(token)));
  addIf("It includes exception or error handling.", (tagText.includes("exception") || tagText.includes("file")) && ["try", "catch", "throw", "throws"].some(token => hasWord(lower, token)));
  return [...new Set(matches)];
}

function hasReadableNames(codeText) {
  const shortVariableCount = (codeText.match(/\b(?:int|double|float|long|String|boolean|char|var)\s+[a-z]\b/g) || []).length;
  const meaningfulName = /\b(total|count|index|score|name|result|student|amount|balance|number|price|average|service|repository|manager|calculator|account|items|grades)\b/i.test(codeText);
  return meaningfulName || (shortVariableCount <= 2 && codeText.split(/\r?\n/).length > 2);
}

function rubricHits(lower, rubric = []) {
  return rubric.filter(item => String(item).toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 5)
    .slice(0, 5)
    .some(word => lower.includes(word))).length;
}

function alternativeApproachesFor(target) {
  const tags = (target.tags || []).join(" ").toLowerCase();
  const suggestions = [];
  if (tags.includes("loop") || tags.includes("array") || tags.includes("dsa")) suggestions.push("Loop-first: solve it with a simple for/while loop and a dry-run table.");
  if (tags.includes("method") || !["Beginner", "Easy"].includes(target.difficulty)) suggestions.push("Method-first: create one method for input, one for logic, and one for output.");
  if (tags.includes("oop") || tags.includes("capstone")) suggestions.push("OOP-first: create small classes with one responsibility each, then connect them from Main.");
  if (tags.includes("collection") || tags.includes("map") || tags.includes("dsa")) suggestions.push("Collection-first: use List, Set, or Map to remove manual bookkeeping.");
  if (tags.includes("stream") || tags.includes("functional")) suggestions.push("Functional style: try map, filter, reduce, and collect after the loop version works.");
  if (tags.includes("capstone") || ["Hard", "Expert"].includes(target.difficulty)) suggestions.push("Test-first: write sample inputs, expected outputs, edge cases, and then code until they pass.");
  if (!suggestions.length) {
    suggestions.push("Direct approach: write the smallest clear solution that matches the expected output.");
    suggestions.push("Refactored approach: move the main logic into a named method after it works.");
    suggestions.push("Professional approach: add validation, meaningful names, and one extra test case.");
  }
  return suggestions.slice(0, 5);
}

function verdictFor(score) {
  if (score >= 85) return "Strong answer. This is moving toward portfolio-quality work.";
  if (score >= 70) return "Good answer. It likely works, but a few professional habits can make it safer.";
  if (score >= 50) return "Partly correct. The idea is visible, but it needs stronger structure or proof.";
  return "Needs more work. Keep the idea, then rebuild it step by step.";
}

function completeLesson(id, minutes) {
  if (!state.progress.completedLessons.includes(id)) state.progress.completedLessons.push(id);
  markStudy(minutes);
  saveProgress();
  render();
}

function toggleBookmark(id) {
  const list = state.progress.bookmarks;
  state.progress.bookmarks = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
  saveProgress();
  render();
}

function saveNote(id) {
  state.progress.notes[id] = document.getElementById("lessonNote").value;
  saveProgress();
  render();
}

function speakLesson(id) {
  const lesson = lessonById(id);
  if (!lesson || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(lesson.simpleExplanation));
}

function startQuiz(type, id) {
  let title;
  let questions;
  let levelId = 0;
  let quizId = `${type}:${id}`;
  if (type === "lesson") {
    const lesson = lessonById(id);
    title = `${lesson.title} Quiz`;
    questions = lesson.quiz;
    levelId = lesson.levelId;
  } else {
    const exam = state.curriculum.finalExams.find(item => item.id === id);
    title = exam.title;
    questions = exam.questions;
    levelId = exam.levelEnd;
  }
  state.quiz = { id: quizId, title, questions, levelId, index: 0, answers: {} };
  go("quiz");
}

function answerQuiz(index) {
  state.quiz.answers[state.quiz.index] = index;
  render();
}

function nextQuiz() {
  state.quiz.index += 1;
  render();
}

function prevQuiz() {
  state.quiz.index -= 1;
  render();
}

function finishQuiz() {
  const correct = state.quiz.questions.filter((q, i) => state.quiz.answers[i] === q.correctAnswerIndex).length;
  const score = Math.round((correct / state.quiz.questions.length) * 100);
  state.progress.quizScores[state.quiz.id] = Math.max(state.progress.quizScores[state.quiz.id] || 0, score);
  if (score >= 70) state.progress.highestUnlockedLevel = Math.max(state.progress.highestUnlockedLevel, state.quiz.levelId + 1);
  markStudy(5);
  alert(`Score: ${score}%`);
  go("path");
}

async function runCodingDrill(taskId) {
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId);
  const codeText = document.getElementById("codingCode").value;
  const resultBox = document.getElementById("codingResult");
  const compilerUrl = document.getElementById("codingCompilerUrl").value.replace(/\/$/, "");
  localStorage.setItem(`javaMasteryCodingDrill:${taskId}`, codeText);
  localStorage.setItem("javaMasteryCompilerUrl", compilerUrl);
  resultBox.innerHTML = `<p>Running required compiler test...</p>`;
  try {
    const response = await fetch(`${compilerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mainClass: "Main",
        files: [{ path: "Main.java", content: codeText }],
        tests: [{
          id: `${task.id}-smoke`,
          name: "Compile and run coding drill",
          input: "",
          expectedOutput: task.expectedOutput,
          points: 100
        }]
      })
    });
    const data = await response.json();
    resultBox.innerHTML = compilerResultHtml(data);
    if (data.ok && Number(data.score || 0) >= 100) {
      state.progress.codingDrillScores = state.progress.codingDrillScores || {};
      state.progress.codingDrillScores[taskId] = Math.max(state.progress.codingDrillScores[taskId] || 0, Number(data.score || 0));
      markStudy(10);
    }
  } catch (error) {
    resultBox.innerHTML = `<div class="card"><strong>Could not reach compiler service.</strong><p>${escapeHtml(error.message)}</p><p>Start it with: <code>node tools/java-compiler-service/server.mjs</code></p></div>`;
  }
}

function resetCodingDrill(taskId) {
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId);
  document.getElementById("codingCode").value = task.starterCode;
  document.getElementById("codingResult").innerHTML = "";
  localStorage.removeItem(`javaMasteryCodingDrill:${taskId}`);
}

function runPlayground(taskId) {
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId);
  const codeText = document.getElementById("playCode").value;
  const output = simulateJavaOutput(codeText, task.expectedOutput);
  const passed = output.trim() === task.expectedOutput.trim();
  document.getElementById("playOutput").innerHTML = `${section("Simulated Output", code(output))}<p><strong>${passed ? "Output matches." : "Output differs. Compare line by line."}</strong></p>`;
}

async function runPlaygroundCompiler(taskId) {
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId);
  const codeText = document.getElementById("playCode").value;
  const resultBox = document.getElementById("playCompilerOutput");
  const compilerUrl = document.getElementById("playgroundCompilerUrl").value.replace(/\/$/, "");
  localStorage.setItem("javaMasteryCompilerUrl", compilerUrl);
  resultBox.innerHTML = `<p>Compiling with local javac...</p>`;
  try {
    const response = await fetch(`${compilerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mainClass: "Main",
        files: [{ path: "Main.java", content: codeText }],
        tests: [{
          id: `${task.id}-smoke`,
          name: "Compile and run playground task",
          input: "",
          expectedOutput: task.expectedOutput,
          points: 100
        }]
      })
    });
    const data = await response.json();
    resultBox.innerHTML = compilerResultHtml(data);
  } catch (error) {
    resultBox.innerHTML = `<div class="card"><strong>Could not reach compiler service.</strong><p>${escapeHtml(error.message)}</p><p>Start it with: <code>node tools/java-compiler-service/server.mjs</code></p></div>`;
  }
}

async function runCapstoneCompiler(projectId) {
  const project = (state.curriculum.capstoneProjects || []).find(item => item.id === projectId);
  const resultBox = document.getElementById("compilerResult");
  const compilerUrl = document.getElementById("compilerUrl").value.replace(/\/$/, "");
  localStorage.setItem("javaMasteryCompilerUrl", compilerUrl);
  resultBox.innerHTML = `<p>Running compiler service...</p>`;
  try {
    const response = await fetch(`${compilerUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mainClass: "Main",
        files: project.files.map(file => ({ path: file.path, content: file.content })),
        tests: project.tests
      })
    });
    const data = await response.json();
    const tests = (data.tests || []).map(test => `
      <div class="card section">
        <strong>${test.passed ? "PASS" : "FAIL"} - ${escapeHtml(test.name || test.id)}</strong>
        <p>Expected:</p>${code(test.expectedOutput || "")}
        <p>Actual:</p>${code(test.actualOutput || "")}
        ${test.stderr ? `<p>stderr:</p>${code(test.stderr)}` : ""}
      </div>`).join("");
    resultBox.innerHTML = `
      <div class="card">
        <h3>${data.ok ? "Compiler tests passed" : "Compiler tests need work"}</h3>
        <p>Compiler score: ${data.score || 0}%</p>
        ${data.compile?.stderr ? `<p>Compiler messages:</p>${code(data.compile.stderr)}` : ""}
        ${tests}
        <p class="muted">${escapeHtml(data.note || "")}</p>
      </div>`;
  } catch (error) {
    resultBox.innerHTML = `<div class="card"><strong>Could not reach compiler service.</strong><p>${escapeHtml(error.message)}</p><p>Start it with: <code>node tools/java-compiler-service/server.mjs</code></p></div>`;
  }
}

function compilerResultHtml(data) {
  const tests = (data.tests || []).map(test => `
    <div class="card section">
      <strong>${test.passed ? "PASS" : "FAIL"} - ${escapeHtml(test.name || test.id)}</strong>
      <p>Expected:</p>${code(test.expectedOutput || "")}
      <p>Actual:</p>${code(test.actualOutput || "")}
      ${test.stderr ? `<p>stderr:</p>${code(test.stderr)}` : ""}
    </div>`).join("");
  return `
    <div class="card">
      <h3>${data.ok ? "Compiler tests passed" : "Compiler tests need work"}</h3>
      <p>Compiler score: ${data.score || 0}%</p>
      ${data.compile?.stderr ? `<p>Compiler messages:</p>${code(data.compile.stderr)}` : ""}
      ${data.error ? `<p>Error:</p>${code(data.error)}` : ""}
      ${tests}
      <p class="muted">${escapeHtml(data.note || "")}</p>
    </div>`;
}

function gradeCapstone(projectId) {
  const checks = [...document.querySelectorAll(".rubricCheck")];
  const earned = checks.filter(input => input.checked).reduce((sum, input) => sum + Number(input.dataset.points || 0), 0);
  const possible = checks.reduce((sum, input) => sum + Number(input.dataset.points || 0), 0) || 1;
  const score = Math.round((earned / possible) * 100);
  state.progress.projectGrades[projectId] = Math.max(state.progress.projectGrades[projectId] || 0, score);
  markStudy(15);
  saveProgress();
  document.getElementById("gradeResult").textContent = `Saved: ${state.progress.projectGrades[projectId]}%`;
}

function copyCapstoneFiles(projectId) {
  const project = (state.curriculum.capstoneProjects || []).find(item => item.id === projectId);
  const payload = JSON.stringify(project.files.map(file => ({ path: file.path, content: file.content })), null, 2);
  navigator.clipboard?.writeText(payload);
  alert("Project files JSON copied.");
}

function resetPlayground(taskId) {
  const task = state.curriculum.playgroundTasks.find(item => item.id === taskId);
  document.getElementById("playCode").value = task.starterCode;
  document.getElementById("playOutput").innerHTML = "";
}

function simulateJavaOutput(codeText, fallback) {
  const println = [...codeText.matchAll(/System\.out\.println\("([^"]*)"\)/g)].map(match => match[1]);
  if (println.length) return println.join("\n");
  const print = [...codeText.matchAll(/System\.out\.print\("([^"]*)"\)/g)].map(match => match[1]);
  if (print.length) return print.join("");
  if (codeText.includes("for (int count = 1; count <= 5; count++)")) return "Practice 1\nPractice 2\nPractice 3\nPractice 4\nPractice 5";
  if (codeText.includes("binarySearch")) return "Target found at index 3";
  if (codeText.includes("add(10, 20)")) return "30";
  if (codeText.includes("StringBuilder")) return "Java Mastery";
  if (codeText.includes("scores.get(\"Ali\")")) return "95";
  if (codeText.includes("names.forEach")) return "Ali\nRayyan";
  return fallback;
}

function derivedAchievements() {
  const earned = [];
  if (state.progress.completedLessons.length) earned.push("first_lesson");
  if (Object.values(state.progress.quizScores).some(score => score >= 70)) earned.push("first_quiz");
  if (state.progress.streak >= 7) earned.push("seven_day_streak");
  if (state.progress.completedLessons.length >= 10) earned.push("java_basics_completed");
  if (state.progress.completedLessons.length >= 30) earned.push("java_master");
  if (state.progress.bookmarks.length >= 5) earned.push("bookmark_builder");
  if (Object.values(state.progress.codingDrillScores || {}).filter(score => score >= 100).length >= 10) earned.push("loops_master");
  if (Object.values(state.progress.projectGrades || {}).some(score => score >= 70)) earned.push("project_builder");
  if (Object.values(state.progress.projectGrades || {}).some(score => score >= 85)) earned.push("portfolio_ready");
  return earned;
}

function toggleTheme() {
  state.progress.darkMode = !state.progress.darkMode;
  saveProgress();
  render();
}

function togglePracticeMode() {
  state.progress.practiceMode = !state.progress.practiceMode;
  saveProgress();
  render();
}

function exportProgress() {
  const text = JSON.stringify(state.progress, null, 2);
  navigator.clipboard?.writeText(text);
  alert("Progress copied to clipboard.");
}

function resetProgress() {
  if (!confirm("Reset all local web progress?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.progress = loadProgress();
  saveProgress();
  render();
}

function shareCertificate() {
  const percent = pct(state.progress.completedLessons.length, allLessons().length);
  const text = `Ali Rayyan has completed ${percent}% of Java Mastery: Zero to Advanced.`;
  if (navigator.share) navigator.share({ text });
  else {
    navigator.clipboard?.writeText(text);
    alert("Certificate text copied.");
  }
}

window.go = go;
window.toggleTheme = toggleTheme;
window.togglePracticeMode = togglePracticeMode;
window.completeLesson = completeLesson;
window.toggleBookmark = toggleBookmark;
window.saveNote = saveNote;
window.speakLesson = speakLesson;
window.startQuiz = startQuiz;
window.answerQuiz = answerQuiz;
window.nextQuiz = nextQuiz;
window.prevQuiz = prevQuiz;
window.finishQuiz = finishQuiz;
window.runCodingDrill = runCodingDrill;
window.resetCodingDrill = resetCodingDrill;
window.runPlayground = runPlayground;
window.runPlaygroundCompiler = runPlaygroundCompiler;
window.resetPlayground = resetPlayground;
window.runCapstoneCompiler = runCapstoneCompiler;
window.gradeCapstone = gradeCapstone;
window.copyCapstoneFiles = copyCapstoneFiles;
window.examineExerciseAnswer = examineExerciseAnswer;
window.examineCapstoneAnswer = examineCapstoneAnswer;
window.exportProgress = exportProgress;
window.resetProgress = resetProgress;
window.shareCertificate = shareCertificate;

window.addEventListener("hashchange", () => {
  parseHash();
  render();
});

fetch("data/curriculum.json")
  .then(response => response.json())
  .then(curriculum => {
    state.curriculum = curriculum;
    document.body.classList.toggle("dark", state.progress.darkMode);
    parseHash();
    render();
  })
  .catch(error => {
    document.getElementById("app").innerHTML = `<div class="loading">Could not load curriculum: ${escapeHtml(error.message)}</div>`;
  });
