# Java Execution Prototype

## Purpose
Wave 17 extends the existing execution architecture to support Java without changing the durable execution-record contract already used for Python.

The goal is to prove:
- Java submission behind the existing execution abstraction
- compile and run inside a Java-specific Cloud Run Job or local Java runner image
- local-first validation before relying on hosted execution
- script-driven submission and retrieval
- authenticated UI integration after the non-UI path is validated
- compile failures handled as normal terminal execution results

## Fixed submission contract
Wave 17 intentionally keeps Java narrow:
- one submitted source file
- the file is written as `Main.java`
- the user must provide `public class Main`
- the user must provide `public static void main(String[] args)`
- packages are not supported
- multi-file projects are not supported
- Maven and Gradle are not supported

## High-level flow
1. An authenticated script or UI submits Java source to `POST /api/execution/jobs` with `"language": "java"`.
2. The backend validates the Java source against Java-specific size limits while keeping the shared result contract.
3. The backend stores the execution record in `executionJobs` and a queue entry in `executionQueue`.
4. The configured execution backend dispatches the Java execution runner image for Java jobs.
5. The Java runner claims one queued job from Firestore.
6. The runner writes `Main.java`, compiles it with `javac`, and only runs `java Main` if compilation succeeds.
7. The runner stores the terminal result back into the same execution record shape used by Python.
8. Scripts or the UI poll the stored record until it becomes terminal.

## Result behavior
Java uses the same terminal result fields as Python:
- `status`
- `stdout`
- `stderr`
- `exitCode`
- `durationMs`
- `truncated`

Compile failures are stored as normal terminal results:
- `status: "failed"`
- compiler output in `stderr`
- compiler exit status in `exitCode`

## Execution environment
- Java runner image base: `eclipse-temurin:25-jdk`
- Java uses its own final executor image
- Python uses a separate final executor image
- shared code and result-contract conventions are allowed, but Python and Java do not share one runtime image
- Java source file: `Main.java`
- Java command: `java -Xmx<limit>m Main`
- packages are rejected in this phase before execution

## Configured limits
Wave 17 keeps the existing Python env vars and adds Java-specific ones:
- `JAVA_EXECUTION_MAX_SOURCE_BYTES`
- `JAVA_EXECUTION_TIMEOUT_MS`
- `JAVA_EXECUTION_MAX_STDOUT_BYTES`
- `JAVA_EXECUTION_MAX_STDERR_BYTES`
- `JAVA_EXECUTION_MAX_MEMORY_MB`

The backend uses the Java source-size limit during request validation.
The runner uses the Java timeout, output, and memory settings during compile/run.

## Local validation
Validate the Java runner container itself first:

```bash
npm run execution:java:container:validate
```

This builds the Java runner image, seeds Java jobs into the Firestore emulator, and verifies both:
- successful compile and run
- compile failure normalization

Then validate the authenticated non-UI Java path:

```bash
npm run wave17:validate
```

This starts the backend against the Firestore and Auth emulators in `local-container` mode, submits Java through the authenticated API, waits for stored results, verifies latest-job language filtering, checks compile failure handling, and confirms a denied cross-user access case.

After that, the broader automated local stack should still pass:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Script usage
Submit Java source from a file:

```bash
npm run execution:submit -- --env prod --email student1@example.com --password pass1234 --language java --source-file ./Main.java
```

Fetch a stored execution record:

```bash
npm run execution:get -- --env prod --email student1@example.com --password pass1234 --job-id <job-id>
```

Wait for a terminal result:

```bash
npm run execution:get -- --env prod --email student1@example.com --password pass1234 --job-id <job-id> --wait
```

## UI behavior
Wave 17 keeps the UI intentionally small:
- Python and Java can be submitted from the authenticated recording page
- Java compile errors appear in the same result area as normal execution stderr
- only the latest stored execution result for the selected runnable language is shown
- JavaScript remains non-runnable in this wave
