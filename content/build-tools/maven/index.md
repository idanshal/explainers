# Maven: From Java Source to a Running Application

Maven is a build automation and dependency management tool, most commonly used for Java projects. You describe your project in a file named `pom.xml`, and Maven coordinates tasks such as compiling source code, running tests, downloading libraries, and packaging the result.

Maven does not replace Java. The **JDK** supplies tools such as `javac` (the compiler), `java` (the launcher), and `jar` (the archive tool). Maven organizes the build and invokes tools through plugins. **Spring Boot** is a framework for building applications; it can use Maven as its build tool, but does not require Maven specifically.

This guide builds the same small Java application without and with Maven, then turns it into a Spring Boot web application. For details about individual build plugins, continue to [Maven Plugins](plugins.md).

## Before You Start

Use a JDK version 17 or newer and Maven 3.6.3 or newer for these examples. The Java code targets Java 17. The Spring Boot example pins version 4.0.3 as a concrete example, not a claim that it is the latest release.

Check your installation:

```bash
java -version
javac -version
mvn -version
```

`mvn -version` also shows which JDK Maven is using. If it differs from the one you expect, check `JAVA_HOME` and your `PATH`. Maven needs network access on the first build to download plugins and dependencies.

Run the following commands from the project directory unless a step says otherwise. The shell commands use macOS/Linux syntax.

## 1. A Java Application Without Maven

Create this directory structure and source file:

```text
hello-java/
  src/
    main/
      java/
        com/
          example/
            App.java
```

The source file `src/main/java/com/example/App.java` contains:

```java
package com.example;

public class App {
    public static void main(String[] args) {
        String name = args.length == 0 ? "world" : args[0];
        System.out.println("Hello, " + name + "!");
    }
}
```

There is nothing Maven-specific about this Java code or directory structure. We use Maven's conventional layout now so that we can reuse it later.

### Compile and Run by Hand

From `hello-java/`, run:

```bash
mkdir -p out
javac --release 17 -d out src/main/java/com/example/App.java
java -cp out com.example.App Ada
```

Output:

```text
Hello, Ada!
```

Here is what happened:

- `javac` compiled the source into `out/com/example/App.class`. The `--release 17` option targets Java 17 language features and platform APIs.
- `-cp out` put the output directory on Java's **classpath**, the places Java searches for application classes and libraries.
- `com.example.App` is the fully qualified class name. Java calls its `main` method and passes `Ada` as an argument.

### Package It by Hand

A **JAR** is an archive that can hold compiled classes and resources. To make this application runnable with `java -jar`, also identify its main class in the archive's manifest:

```bash
jar --create --file hello-java-1.0.0.jar --main-class com.example.App -C out .
java -jar hello-java-1.0.0.jar Ada
```

This prints the same greeting. `-C out .` tells `jar` to include the contents of `out`, preserving the package directories.

For a one-file program this is manageable. As the project grows, you also need to track source files, copy resources, compile and run tests, and put the correct external libraries on both the compiler and runtime classpaths. You could write scripts for all of that. Maven provides an established build model instead.

## 2. The Same Application With Maven

Keep `App.java` exactly as it is. Add a `pom.xml` next to `src/`:

```text
hello-java/
  pom.xml
  src/main/java/com/example/App.java
```

**POM** stands for **Project Object Model**. This complete POM describes our application and configures compilation and an executable JAR:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>hello-java</artifactId>
    <version>1.0.0</version>

    <properties>
        <maven.compiler.release>17</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.14.1</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-jar-plugin</artifactId>
                <version>3.4.2</version>
                <configuration>
                    <archive>
                        <manifest>
                            <mainClass>com.example.App</mainClass>
                        </manifest>
                    </archive>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

The main fields mean:

| Field | Meaning in this project |
| --- | --- |
| `modelVersion` | The POM model format, not the Maven installation version. |
| `groupId` | A namespace for the organization or project: `com.example`. It does not enforce Java package names. |
| `artifactId` | The name of this build artifact: `hello-java`. |
| `version` | This project's version: `1.0.0`. |
| `properties` | Values used by the build, including the Java release target. |
| `build/plugins` | Configuration for tools that perform build tasks. |

The three values `groupId:artifactId:version` are an artifact's **coordinates**, here `com.example:hello-java:1.0.0`. With no explicit `packaging`, Maven defaults to `jar`.

### Build and Run

```bash
mvn package
java -jar target/hello-java-1.0.0.jar Ada
```

The greeting is still `Hello, Ada!`. You have changed how the application is built, not what it does.

Maven discovers the sources in `src/main/java`, compiles them into `target/classes`, runs configured tests if present, and packages the JAR into `target/`. The compiler plugin handles compilation; the JAR plugin creates the archive and uses our main-class setting. Maven does not run the application just because you package it.

Without the manifest configuration, Maven could still produce a JAR, but `java -jar` would not know which main class to start. For this dependency-free app, another way to run the compiled code is:

```bash
java -cp target/classes com.example.App Ada
```

### What Changed?

| Task | Without Maven | With this Maven project |
| --- | --- | --- |
| Choose source and output locations | Pass paths to `javac`. | Follow `src/main/java` and `target/classes` conventions. |
| Compile | Invoke `javac` yourself. | Run `mvn compile`; Maven invokes its compiler plugin. |
| Package | Invoke `jar` with the main class yourself. | Run `mvn package`; Maven uses the POM configuration. |
| Run the packaged app | `java -jar hello-java-1.0.0.jar Ada` | `java -jar target/hello-java-1.0.0.jar Ada` |
| Share the build instructions | Maintain commands or scripts. | Commit the POM and source code. |

Maven is more setup for this tiny program. Its benefit grows when a team needs a consistent build across many files, dependencies, tests, and environments. A POM improves repeatability; a reproducible build also needs control over tool versions, dependency versions, and environment-specific inputs.

## 3. How You Use Maven Day to Day

Maven conventions give common files predictable homes:

```text
src/main/java/       Application source code
src/main/resources/ Application resources, such as configuration files
src/test/java/       Test source code
src/test/resources/ Test resources
target/             Generated build output; do not commit it
```

Most everyday Maven commands name a **lifecycle phase**. In the default lifecycle, asking for a later phase also runs the earlier phases leading up to it:

```text
validate -> compile -> test -> package -> verify -> install -> deploy
```

This is a simplified view; there are intermediate phases as well.

| Command | What it does |
| --- | --- |
| `mvn compile` | Compiles application sources. |
| `mvn test` | Compiles application and test sources, then runs unit tests through the configured test plugin. |
| `mvn package` | Runs the build through packaging, including the test phase. |
| `mvn verify` | Runs through packaging and any configured additional checks, such as integration-test verification. |
| `mvn install` | Runs through verification and places the artifact and POM in your local repository for other local projects to use. It does not install an application on the OS. |
| `mvn deploy` | Runs through installation and publishes to a configured remote artifact repository. It does not deploy your application to a server. |
| `mvn clean package` | Deletes previous build output, then runs through packaging. `clean` belongs to a separate lifecycle. |

These commands only run the work configured for the project. Maven does not invent tests or integration checks, and integration tests need suitable plugin configuration.

A **plugin goal** is a specific task, written as `plugin:goal`, such as `compiler:compile` or `spring-boot:run`. A phase organizes the build; plugin goals perform its work. Some goals are bound to phases by default, while others need configuration or an explicit invocation.

Many projects include the **[Maven Wrapper](wrapper.md)**: `mvnw`, `mvnw.cmd`, and configuration under `.mvn/`. When those files are present, use `./mvnw package` on macOS/Linux or `mvnw.cmd package` on Windows instead of `mvn package`. The wrapper obtains the project's configured Maven version; you still need a suitable JDK. Adding a POM alone does not create wrapper files. The linked guide covers generating the wrapper, committing its files, and using it in CI.

## 4. What About External Libraries?

Our greeting uses only the JDK. Suppose you now want a utility from Apache Commons Lang.

**Without Maven**, you would obtain the appropriate library JAR and any required dependencies, then maintain compiler and runtime classpaths yourself. Assuming you placed the JAR in `lib/`, the commands would look like:

```bash
javac --release 17 -cp 'lib/*' -d out src/main/java/com/example/App.java
java -cp 'out:lib/*' com.example.App Ada
```

The runtime classpath uses `;` instead of `:` on Windows. The quotes prevent the shell from expanding the wildcard before Java handles it.

**With Maven**, add a dependency under the POM's top-level `<project>` element, as a sibling of `<build>`:

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
        <version>3.18.0</version>
    </dependency>
</dependencies>
```

This pins an example library version; choose an appropriate maintained version for a real project. Declaring a dependency makes it available to code but does not change our greeting by itself.

Maven resolves the coordinates from configured repositories, using Maven Central by default, downloads the artifact and its POM, and resolves applicable **transitive dependencies**: libraries required by your chosen library. It normally caches these under `~/.m2/repository` and supplies the classpaths for compilation and tests. A company's Maven settings may route downloads through a repository mirror.

Useful inspection commands are:

```bash
mvn dependency:tree
mvn help:effective-pom
```

The dependency tree shows the resolved dependency graph. The effective POM shows the combined configuration, including inherited defaults and active profiles.

**A dependency is not a plugin.** Dependencies supply classes your application or tests use. Plugins perform build tasks. Also, a normal Maven JAR does **not** bundle its dependencies automatically. Once the application uses external libraries, the earlier `java -cp target/classes ...` command alone is insufficient, and setting `Main-Class` alone does not make `java -jar` find those libraries. You need a runtime dependency arrangement or packaging designed to include them. Spring Boot provides one such arrangement.

## 5. Connect It to Spring Boot

Now change the application from a command-line greeting to an HTTP endpoint. Maven still builds the project. Spring Boot supplies application startup, framework configuration, and an embedded web server.

For this step, **replace** the plain-Java POM with the following complete POM. The Commons Lang dependency from the optional previous step is not needed.

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.0.3</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>hello-java</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

Replace the contents of `src/main/java/com/example/App.java` with:

```java
package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }

    @GetMapping("/")
    public String hello() {
        return "Hello, world!";
    }
}
```

`@SpringBootApplication` enables Boot's application configuration and auto-configuration. `@RestController` makes this class handle HTTP requests, and `@GetMapping("/")` maps a GET request at `/` to `hello()`. Combining the application and controller in one class keeps this example small; larger applications usually separate them.

### Run During Development

```bash
mvn spring-boot:run
```

The command starts the application and stays running. In another terminal, request the endpoint:

```bash
curl http://localhost:8080/
```

The response body is `Hello, world!`. Stop the application with Ctrl+C. Port 8080 must be available.

### Build and Run the Deliverable

```bash
mvn clean package
java -jar target/hello-java-1.0.0.jar
```

This starts the same web application, now from its packaged archive. You can make the same HTTP request again. Maven is needed for this build, but not to launch the finished JAR; that requires a compatible Java runtime.

### Which Part Does What?

| Part | Responsibility |
| --- | --- |
| Maven | Resolves artifacts and coordinates compilation, tests, and packaging. |
| `spring-boot-starter-parent` | Supplies inherited build defaults, dependency version management, and plugin configuration. Managed versions do not add dependencies by themselves. |
| `spring-boot-starter-webmvc` | Adds a coordinated set of dependencies for a Spring MVC web application, including an embedded server. This example uses the Boot 4 starter name. |
| `spring-boot-maven-plugin` | Provides `spring-boot:run` and repackages the built JAR with application classes, runtime dependencies, and Boot's launcher. |
| Spring Boot at runtime | Starts the application, configures framework components, and starts the embedded server. |
| Java runtime | Executes the application bytecode. |

The parent manages the versions of the starter and Boot plugin, so we do not repeat them. It also configures the plugin's `repackage` execution: with this parent and the plugin declaration, `mvn package` produces an executable Boot JAR. Merely declaring the plugin without that inherited or explicit execution does not necessarily bind repackaging to `package`.

The resulting Boot JAR is different from our first plain-Java JAR: it contains the application's runtime dependencies and Boot's launcher, rather than only our own classes and a main-class manifest entry. That is why this Spring application can start with one `java -jar` command without manually listing its many libraries.

For a new project, [Spring Initializr](https://start.spring.io/) can generate the Maven POM, source layout, and Maven Wrapper. Choose Maven, Java, a supported Spring Boot version, and Spring Web, then inspect the generated files using the concepts above. Spring Boot can also use Gradle; Maven is not part of its runtime.

## The Mental Model

Without Maven, you tell the JDK tools exactly which files to compile, where to find libraries, and how to package the result. With Maven, you describe the project and run standard build phases; plugins carry out the work. With Spring Boot, you additionally get framework defaults, runtime behavior, and packaging support for a standalone application.

Continue with [Maven Plugins](plugins.md) to understand the compiler, Spring Boot, and source plugins in more detail.

## References

- [Maven in Five Minutes](https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html)
- [Maven standard directory layout](https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html)
- [Maven build lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)
- [Maven dependency mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)
- [Maven JAR Plugin: setting the main class](https://maven.apache.org/shared/maven-archiver/examples/classpath.html)
- [Spring Boot: developing your first application](https://docs.spring.io/spring-boot/4.0/tutorial/first-application/index.html)
- [Spring Boot Maven Plugin](https://docs.spring.io/spring-boot/4.0/maven-plugin/index.html)