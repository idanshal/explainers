# Maven Plugins Explained

Maven plugins perform build tasks such as compiling code, packaging an application, or producing extra artifacts. They run during Maven commands; they are not normally libraries used by the application at runtime.

This page is a standalone guide to the plugins and annotation processors explained below; no other document is needed for context.

## At a Glance

| Plugin | What it does | If you omit its configuration |
|---|---|---|
| Spring Boot Maven Plugin | Adds Spring Boot-specific build and development goals, especially repackaging an application as an executable archive. | The ordinary Maven build may still create a JAR, but it will not be automatically repackaged unless the goal is configured elsewhere. A plugin goal may still be invoked explicitly if Maven can resolve the plugin. |
| Maven Compiler Plugin | Compiles Java source code and configures compiler options, including annotation processors. | Maven still uses its compiler plugin through the standard lifecycle. However, custom compiler settings and explicitly configured processors may be missing. |
| Maven Source Plugin | Packages project source files in a separate `-sources.jar` and attaches it to the build artifacts. | The normal application/library build still works, but no source archive is created or published by this plugin. |

The exact outcome depends on the effective Maven configuration: a parent POM or another build configuration may provide plugin settings even when a project does not declare them locally.

## Spring Boot Maven Plugin

This plugin integrates Spring Boot tasks into Maven. Common goals include:

- **`repackage`**: takes the regular JAR or WAR and repackages it as an executable Spring Boot archive containing the application and its runtime dependencies. The resulting archive can typically be started with `java -jar`.
- **`run`**: runs the application from the Maven project during development.

The plugin's presence alone does not necessarily mean that `repackage` runs during `mvn package`. That goal must be configured by the project or inherited from a parent POM. For example, Spring Boot's parent POM configures the goal, allowing a project to declare the plugin without listing the execution itself.

**If omitted:** Maven can still compile and package a regular JAR, but it will not be automatically repackaged as an executable Spring Boot archive unless that goal is configured elsewhere. You can still run the application through another supported method, such as an IDE or a manually assembled classpath. Maven may also be able to run a plugin goal explicitly if the plugin can be resolved.

Reference: [Spring Boot Maven Plugin](https://docs.spring.io/spring-boot/maven-plugin/).

## Maven Compiler Plugin

Maven uses this plugin to compile Java source code as part of the standard build lifecycle. It also accepts compiler configuration, such as the Java release level and annotation processor paths.

Annotation processors run during compilation and inspect annotations to generate code or metadata:

- **Lombok** processes annotations such as `@Getter`, `@Builder`, and `@Slf4j`, making generated members available to the compiler and reducing handwritten boilerplate. If Lombok is not run and the source relies on those generated members, compilation will usually fail with missing methods, constructors, or fields. Lombok must also be present where the source's Lombok annotations are compiled; projects commonly declare it as a dependency with an appropriate scope as well as configuring it as a processor.
- **Spring Boot Configuration Processor** examines configuration-properties classes and generates metadata, commonly `META-INF/spring-configuration-metadata.json`. IDEs use this metadata to offer property completion and documentation. Without it, the application can generally still read its configuration at runtime, but IDE assistance for custom properties is reduced. The processor does not itself load or validate application configuration at runtime.

An explicit annotation-processor path tells the compiler which processors to load. Processor versions must be available through the effective Maven configuration, such as dependency management. Annotation processors are compile-time tools, not application runtime dependencies.

**If the plugin's explicit configuration is omitted:** Maven still invokes its compiler plugin by default, so Java compilation does not normally stop just because the plugin was not written in the POM. But custom compiler settings and processors may no longer be configured. Whether compilation fails depends on whether processors are configured elsewhere and whether the code depends on their output. On modern JDKs, explicitly configuring annotation processors is particularly important because automatic processor discovery is restricted or disabled by default in newer Java releases.

Reference: [Maven Compiler Plugin annotation processor configuration](https://maven.apache.org/plugins/maven-compiler-plugin/examples/annotation-processor.html).

## Maven Source Plugin

This plugin packages project source files into a separate archive, normally named with the `-sources.jar` suffix (for example, `my-library-1.0-sources.jar`). The archive is attached as an additional artifact so Maven can install or deploy it alongside the regular JAR. This lets consumers browse library source in their IDE and can make debugging easier.

The `jar` goal creates the source archive and is bound by default to Maven's `package` phase. An execution is a named configuration that associates goals with the build lifecycle; its ID is just an identifier and does not itself run a goal or select a phase.

**If omitted:** Maven still builds, tests, and publishes the normal application or library artifact. It simply does not create or attach this source archive, so consumers will not receive the project's sources through this plugin.

Reference: [Maven Source Plugin `jar` goal](https://maven.apache.org/plugins/maven-source-plugin/jar-mojo.html).

## How They Fit Together

The compiler plugin turns Java source into compiled classes and can run processors that generate code or metadata. Maven packages the normal artifact. When configured, the Spring Boot plugin can repackage that artifact as an executable application. Separately, the source plugin can attach a source archive for people consuming or debugging the artifact.