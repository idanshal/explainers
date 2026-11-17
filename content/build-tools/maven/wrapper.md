---
level: intermediate
---

# Maven Wrapper

The **Maven Wrapper** lets a project choose the Maven version used to build it. Instead of asking every developer and CI machine to install the right Maven release, the project includes small launcher scripts and configuration. You run the script, and it downloads and starts the configured Maven distribution when needed.

If Maven itself is new to you, start with [Maven: From Java Source to a Running Application](index.md). The wrapper does not change the POM, build lifecycle, or application code; it changes how you launch Maven.

## The Problem It Solves

Without a wrapper, this command uses whichever Maven installation your shell finds on `PATH`:

```bash
mvn package
```

One developer might use a different release from another developer or from CI. Differences in Maven behavior can then affect the build.

With a wrapper, use the project's launcher instead:

```bash
./mvnw package
```

The leading `./` means "run the script in this directory." The script reads the project's wrapper configuration and starts the specified Maven version. A separate global Maven installation is not needed to use an existing wrapper.

| Tool or file | Responsibility |
| --- | --- |
| JDK | Supplies Java and the compiler. You still install a suitable JDK. |
| Maven | Resolves dependencies and runs the build through plugins. |
| Maven Wrapper | Obtains and launches the project's configured Maven distribution. |
| `pom.xml` | Describes the application, dependencies, and build configuration. |

The wrapper pins Maven, not Java, your dependencies, or your whole development environment. A repeatable build still needs suitable JDK and plugin versions and control over other inputs.

## Files in the Repository

The script-only setup used in this guide generates:

```text
hello-java/
  mvnw
  mvnw.cmd
  .mvn/
    wrapper/
      maven-wrapper.properties
  pom.xml
  src/
```

- `mvnw` is the launcher for macOS/Linux.
- `mvnw.cmd` is the Windows launcher.
- `.mvn/wrapper/maven-wrapper.properties` specifies the Maven distribution and wrapper settings.

Other wrapper types may also include `maven-wrapper.jar` or `MavenWrapperDownloader.java`. Their absence is normal for the `only-script` type; do not copy extra files from an unrelated project to "fix" it.

The `.mvn/` directory can contain other project-level Maven configuration too, such as `jvm.config` or `maven.config`. Those files are not the wrapper's Maven version setting.

## Use an Existing Wrapper

After cloning a project, open a terminal in its root directory, where `pom.xml` and the wrapper scripts are located.

On macOS/Linux:

```bash
./mvnw -version
./mvnw test
./mvnw package
```

On Windows PowerShell:

```powershell
.\mvnw.cmd -version
.\mvnw.cmd test
.\mvnw.cmd package
```

In Windows Command Prompt, use `mvnw.cmd package`; the explicit current-directory prefix is not required there.

The first run may download Maven. Later runs normally reuse the locally cached distribution, usually under `~/.m2/wrapper/dists`. Maven's plugin and dependency downloads are separate and normally live under `~/.m2/repository`.

The script-only wrapper needs a supported download tool: `curl` or `wget` on macOS/Linux, or PowerShell on Windows. The first download needs access to the configured distribution URL. An existing cache can avoid that download, but a build may still need network access for uncached plugins or dependencies.

Check `./mvnw -version` when diagnosing a build: it shows both the Maven version selected by the wrapper and the Java runtime Maven actually uses. Running `mvn -version` checks your global Maven installation instead.

## Add a Wrapper to a Maven Project

This example uses the plain Java project from the [Maven introduction](index.md). Keep its POM and Java source unchanged. From the directory containing `pom.xml`, run:

```bash
mvn org.apache.maven.plugins:maven-wrapper-plugin:3.3.4:wrapper -Dmaven=3.9.11 -Dtype=only-script
```

For this one-time generation step, the command uses an existing Maven installation. A teammate who already has Maven can generate the files, or a project generator such as [Spring Initializr](https://start.spring.io/) can supply them. Do not assume the wrapper exists just because a project has a POM.

The command deliberately names two different versions:

| Setting | Meaning |
| --- | --- |
| `maven-wrapper-plugin:3.3.4` | The plugin version generating the launcher files. |
| `-Dmaven=3.9.11` | The Maven distribution those launchers will run. |
| `-Dtype=only-script` | Download and launch Maven directly, without a wrapper JAR. |

These are concrete example versions, not a claim that they are the latest releases. Choose versions supported by your project. You do not need to add the wrapper plugin to the POM just to run this generation goal.

Now use the generated wrapper:

```bash
./mvnw -version
./mvnw clean package
java -jar target/hello-java-1.0.0.jar Ada
```

The version check should report Maven `3.9.11`, and the final command should print `Hello, Ada!`. The build phases and output are the same as when you used `mvn clean package`; the wrapper selected which Maven ran them.

### What to Commit

Commit the generated launcher scripts and configuration alongside the POM and source code. For this setup, those files are:

```text
mvnw
mvnw.cmd
.mvn/wrapper/maven-wrapper.properties
```

Preserve the executable permission on `mvnw` in Git so macOS/Linux checkouts can run `./mvnw`. Check that your ignore rules do not exclude the wrapper configuration. If you deliberately choose another wrapper type, include the additional files that type requires.

Do not commit downloaded Maven distributions, the local `.m2` cache, or `target/`. Each developer or CI environment obtains or restores its own cache.

## What Happens When You Run It?

For this script-only setup, `./mvnw package` follows this sequence:

1. The script reads `.mvn/wrapper/maven-wrapper.properties` to find the Maven distribution URL.
2. It checks its local wrapper cache for that distribution.
3. If missing, it downloads and extracts the distribution.
4. It launches that Maven installation and forwards your arguments, here `package`.
5. Maven reads the POM and runs the normal build, resolving plugins and dependencies as needed.

The properties file contains a setting like this:

```properties
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.zip
```

This is an excerpt, not a replacement for the complete generated file. Generation may select a company mirror from your Maven repository configuration instead of Maven Central, so inspect the actual generated URL. To select a distribution explicitly during generation, pass `-DdistributionUrl=...` with your approved archive URL to the wrapper generation command. The distribution URL selects the Maven version; the `version` of your application in the POM does not.

The wrapper does not run inside your application and is not included as an application dependency. Once the JAR is built, a command such as `java -jar ...` launches Java directly, without the wrapper or Maven.

## Spring Boot and CI

A Spring Boot project uses exactly the same wrapper mechanism. If it has the Boot Maven plugin configured, run:

```bash
./mvnw spring-boot:run
```

Or build the executable Boot JAR and launch it separately:

```bash
./mvnw clean package
java -jar target/hello-java-1.0.0.jar
```

That JAR name assumes the coordinates from the Maven introduction. Use your own project's output filename otherwise. The wrapper selects Maven; the [Spring Boot Maven plugin](plugins.md) supplies the Boot-specific goals and packaging behavior. Adding a wrapper alone does not turn a plain Java application into a Boot application.

In CI, check out the repository, provision the required JDK, and invoke the committed wrapper:

```bash
./mvnw --batch-mode verify
```

`--batch-mode` makes Maven run non-interactively. The wrapper avoids relying on the runner's global Maven version, but the runner still needs the required JDK, download tools, network access or populated caches, and any repository credentials. Supply credentials through the CI platform's secret handling and Maven settings, not committed wrapper URLs or scripts.

An IDE may use its own Maven installation unless configured otherwise. Select the project's Maven Wrapper in the IDE's Maven settings when you want IDE builds and terminal builds to agree.

## Upgrade and Review Safely

To move the example to another Maven version, regenerate with the chosen `-Dmaven=...` value using a trusted Maven installation, review the generated changes, and run the project's checks. You can also change the distribution URL in the properties file; any configured distribution checksum must be updated to match.

Updating Maven and updating the wrapper scripts are distinct operations. A changed distribution URL selects a new Maven release without necessarily refreshing the scripts. Regenerating with a chosen wrapper plugin version can refresh the wrapper files as well.

Treat wrapper files as executable build code. Before running a wrapper from an unfamiliar repository, review the scripts and distribution URL. Use trusted HTTPS distribution sources. The wrapper supports a `distributionSha256Sum` property to verify a downloaded Maven archive; obtain the expected SHA-256 from a trusted source rather than copying an unchecked value from the same untrusted download location. A checksum does not make modified launcher scripts trustworthy.

## Common Problems

| Symptom | What to check |
| --- | --- |
| `mvn: command not found` in a project that has a wrapper | Use `./mvnw` or the Windows launcher instead. A global Maven install is not required for an existing wrapper. |
| `./mvnw: No such file or directory` | Check your working directory and whether the repository includes the scripts. A POM alone is not a wrapper. |
| `Permission denied` on macOS/Linux | After reviewing the script, run `chmod +x mvnw` and preserve that executable permission in Git. |
| Java is missing or the release target is unsupported | Install a suitable JDK and inspect `JAVA_HOME`, `PATH`, and `./mvnw -version`. The wrapper does not install Java. |
| Maven distribution download fails | Check the generated distribution URL, including any company mirror, plus network, proxy, trusted certificates, and download tools. This happens before the normal Maven build, so Maven repository settings alone may not fix it. Use an approved reachable distribution URL rather than bypassing company policy. |
| Maven starts but dependencies cannot be resolved | Inspect Maven repository or mirror configuration, credentials, and connectivity. Downloading Maven successfully does not guarantee access to dependency repositories. |
| A checksum mismatch | Stop and investigate the URL, expected checksum, and downloaded archive. Do not disable verification just to get past the error. |
| IDE and terminal builds use different Maven versions | Check the IDE's Maven distribution setting and compare it with `./mvnw -version`. |

## The Mental Model

`mvn` means "use Maven from this machine's path." `./mvnw` means "use the Maven distribution selected by this project." Both then build the same POM. The wrapper standardizes the build tool's entry point, not the entire environment.

## References

- [Apache Maven Wrapper](https://maven.apache.org/wrapper/)
- [Maven Wrapper Plugin usage](https://maven.apache.org/wrapper/maven-wrapper-plugin/usage.html)
- [Maven Wrapper Plugin goal parameters](https://maven.apache.org/wrapper/maven-wrapper-plugin/wrapper-mojo.html)