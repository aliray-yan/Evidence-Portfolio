# Java Mastery Local Compiler Service

This optional local service gives the web app and Android app a real `javac` compile/run backend without paid APIs or cloud services.

Requirements:

- Node.js
- A local JDK with `javac` and `java`

Start:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
node tools\java-compiler-service\server.mjs
```

Health check:

```text
http://127.0.0.1:4190/health
```

Web app default URL:

```text
http://127.0.0.1:4190
```

Android emulator URL:

```text
http://10.0.2.2:4190
```

Physical phone:

Use your computer LAN IP, for example:

```text
http://192.168.1.50:4190
```

The service runs compile/smoke tests only. Use the app rubric for structure, validation, readability, and test-thinking grades.
