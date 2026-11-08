# Dockerfiles, Permissions, and Multi-Stage Builds

A **Dockerfile** is a recipe for building a container image. It selects a base filesystem, adds the application and its dependencies, and declares defaults for running it. It is not a script that runs from top to bottom every time a container starts.

**Documentation baseline:** checked on November 5, 2026 against Docker's current Dockerfile reference, build best practices, multi-stage build, and security documentation. Examples target **Linux containers with BuildKit** and the stable `docker/dockerfile:1` frontend. Docker Desktop on macOS runs these containers in a Linux VM; Windows container instructions and permissions differ.

For the commands that build, name, publish, and launch the result, see [Building, Tagging, and Running Images](build-tag-and-run.md).

## The Mental Model

```text
source + Dockerfile + build context -> build -> image
image + runtime configuration -> run -> container
```

An **image** contains filesystem layers and configuration such as an entrypoint and default user. A **container** is an instance of an image, with its own runtime state and usually a writable filesystem layer. Multiple containers can use the same image.

`RUN` executes during the build. `ENTRYPOINT` and `CMD` specify what starts when the resulting image is run. `ENV`, `USER`, and `WORKDIR` can affect both subsequent build instructions and runtime defaults.

## Start With the Build Context

For `docker build -f docker/Dockerfile .`, the final `.` is the **build context**, not an output directory. `COPY` sources are resolved from that context root, not relative to the Dockerfile's directory or your container's working directory.

Keep the context small and exclude credentials, local output, and irrelevant files. Docker uses a file named `.dockerignore` in the context root; it does not automatically use your Git ignore rules.

For the Maven example below, an appropriate starting point is:

```text
.git
.idea
.vscode
target
**/target
.env
.env.*
**/settings.xml
**/*.key
**/*.pem
```

Adjust exclusions for your application. They are not a complete secret detector. Do not ignore a file the build actually needs, such as a public certificate deliberately bundled with the application. This example builds the JAR inside Docker, so excluding the host's `target` is intentional.

## Essential Instructions

| Instruction | Purpose | Important detail |
| --- | --- | --- |
| `FROM image AS name` | Starts a build stage from a base image. | Choose a maintained, trusted image compatible with your application. |
| `WORKDIR /app` | Sets the working directory for later instructions and runtime. | Prefer absolute paths; missing directories are created. |
| `COPY source destination` | Copies from the build context into the stage. | Use `--from` to copy from another stage; do not assume runtime user ownership. |
| `RUN command` | Executes a build step. | It does not rerun at container startup. |
| `ARG NAME=value` | Declares a build-time parameter. | It is not automatically a runtime environment variable or a safe secret store. |
| `ENV NAME=value` | Sets an environment default in the image. | It persists in image configuration and can be overridden at runtime. |
| `USER uid:gid` | Selects the user/group for later `RUN` steps and container startup. | It neither creates the account nor changes file ownership. |
| `EXPOSE 8080` | Documents an intended container port. | It does not publish the port to the host or make a process listen. |
| `ENTRYPOINT ["program", "arg"]` | Sets the main executable and fixed arguments. | Prefer exec form for predictable arguments and signal delivery. |
| `CMD ["arg"]` | Supplies default command or entrypoint arguments. | Runtime positional arguments replace it; only the last `CMD` is effective in a stage. |
| `LABEL key=value` | Adds image metadata. | Useful for source, revision, and ownership information; do not put secrets here. |
| `HEALTHCHECK ...` | Defines a command that reports health. | The probe executable must exist; unhealthy is not an automatic restart request. |
| `STOPSIGNAL SIGTERM` | Selects the signal Docker sends for graceful stop. | Default is SIGTERM unless inherited image configuration changes it. |
| `VOLUME /data` | Declares a mount point for externally stored data. | Not a backup or ownership policy; prefer explicit deployment mounts when appropriate. |
| `ADD source destination` | Adds files with extra source/extraction features. | Prefer `COPY` for ordinary local copies; use `ADD` features deliberately. |

`SHELL` can change the interpreter for shell-form instructions. `ONBUILD` registers instructions for a downstream build using your image as a base; it is rarely needed in an application Dockerfile.

### COPY Is Not cp

There is no Dockerfile `CP` instruction. `COPY` brings files from a build context or another stage into the image. `RUN cp /existing/file /other/file` invokes a command already available **inside that stage**. `docker cp` is a separate CLI command for copying files between a container and the local filesystem; it is not how you define a repeatable application image.

`COPY --chown=10001:10001` sets ownership at copy time, and `COPY --chmod=0444` sets permissions. These options apply to Linux image builds. Numeric ownership does not require resolving a username in the stage's account files.

### WORKDIR Is Not a Persistent cd Command

`RUN cd /app` changes directory only for that instruction's shell. Use `WORKDIR /app` when later instructions should also operate there. `WORKDIR` is not a filesystem sandbox: a process can access other paths if permissions allow it.

### ARG and ENV Are Different

For example, `ARG APP_VERSION=dev` can feed a build-time label. `ENV SERVER_PORT=8080` gives the application a runtime default. A build argument does not become an environment variable in the final container unless you explicitly persist it.

An `ARG` before `FROM` can parameterize a base image reference; declare it again inside a stage if that stage needs to use its value. Unrelated stages do not automatically share their `ARG` or `ENV` settings. A stage based on another stage can inherit its configuration.

Do not pass passwords, tokens, or private repository credentials using `ARG`, `ENV`, or copied files. Values can leak through image configuration, layers, logs, history, or build attestations. Deleting a secret in a later layer does not erase it from earlier layers.

## Who Is the User Inside the Container?

For Linux containers, the process has a **numeric UID**, primary GID, and possibly supplementary groups. Usernames are names resolved through the container's account database, not automatic mappings to your macOS or Linux login.

- The base image may already set a `USER`. If neither it nor your Dockerfile sets one, the default is UID `0`, root.
- `USER 10001:10001` selects the runtime identity and affects later `RUN` instructions in that stage.
- `docker run --user 20000:20000 ...` can override the image default. A numeric UID can run without an account entry, but some applications expect a valid home directory or account lookup.
- `USER app` requires that the account name resolve inside the image. Creating an account improves compatibility but is not itself a privilege boundary; the UID and permissions are what matter.

Container root is **not the same as unlimited host root**: namespaces, capabilities, seccomp, and other isolation controls constrain it. However, with an ordinary rootful daemon and no user-namespace remapping, UID 0 is not automatically remapped to an unprivileged host UID. Writable host mounts and excessive privileges can make the distinction dangerous. Non-root runtime users reduce risk, but do not replace isolation controls.

**Rootless Docker** runs the daemon and containers without host root privileges. **User-namespace remapping** maps container identities to different host identities. Both are distinct from the Dockerfile's `USER`; using a non-root application user and rootless/user-namespace controls can be complementary.

### File Permissions Still Apply

Linux checks numeric ownership, groups, and permission bits. For directories, execute permission permits traversal. A readable JAR under an inaccessible directory is still unusable.

Root-owned application files with mode `0444`, inside a root-owned traversable directory, are a good fit when the application only needs to read its own code. The app does not need to own the JAR. Give it ownership only of intentional writable locations, not the whole filesystem.

Do not use `chmod -R 777` to make permission errors disappear. Identify the path and the UID/GID that needs access. For bind mounts, host filesystem permissions and identity mapping matter, and mounted content hides files and ownership at the mount point from the image. Changing ownership of an image directory does not fix a host directory later mounted over it.

On native Linux, running a development tool with `--user "$(id -u):$(id -g)"` can avoid root-owned output in a bind mount. It is not a universal fix: home-directory access, supplementary groups, rootless mappings, and Docker Desktop filesystem sharing can change the behavior. Inspect actual permissions in the target environment.

## Multi-Stage Builds: Build Here, Run There

A multi-stage Dockerfile contains multiple `FROM` instructions. Each starts a stage with its own base filesystem. The final image normally comes from the last stage, or from the stage selected with `--target`.

`COPY --from=build /workspace/target/app.jar /app/app.jar` copies a chosen artifact from the `build` stage into the runtime stage. It does **not** copy Maven, the JDK, source code, or the builder's entire filesystem.

```text
build stage: JDK + Maven + source -> tests + executable JAR
                                      |
                              copy only app.jar
                                      |
runtime stage: JRE + app.jar + non-root user -> final image
```

Benefits include a smaller final image, less runtime tooling to maintain, a reduced attack surface, and a consistent build environment. The build stage and its caches still exist in the builder's storage, so this is not a way to make unsafe secret handling acceptable.

## Real-World Example: Spring Boot Orders API

Assume an existing **single-module Maven Spring Boot application targeting Java 21**, with an executable JAR produced by its configured Spring Boot Maven plugin. Java 21 is an intentional compatibility baseline, not a claim that it is the newest Java release. Select the JDK/JRE line matching your actual application's requirements.

The context contains the application's Maven project descriptor and `src` directory. Merge `<finalName>app</finalName>` into the existing Maven `<build>` section so the executable output has the predictable path `target/app.jar`. Do not replace existing plugins or other build configuration.

```xml
<finalName>app</finalName>
```

Use this Dockerfile at the project root:

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp verify

FROM eclipse-temurin:21-jre-jammy AS runtime
ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=$APP_VERSION
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --no-log-init \
        --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin app

WORKDIR /app
COPY --from=build --chown=0:0 --chmod=0444 /workspace/target/app.jar /app/app.jar

ENV SERVER_PORT=8080
EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### Why These Choices?

1. **Separate build and runtime images.** The final stage contains a JRE rather than Maven and a full compiler toolchain. The Ubuntu-based runtime supports the `groupadd` and `useradd` commands used here; Alpine or distroless images need different setup.
2. **Copy dependency declarations before source.** Source-only changes can reuse the dependency-preparation layer. Maven's cache mount also preserves downloads between builds without copying the repository cache into the final image. `dependency:go-offline` improves reuse but does not guarantee every plugin will work without network access.
3. **Run `verify`.** This executes tests and other lifecycle checks configured by the project. Integration tests requiring external services need appropriate CI infrastructure; do not assume a build stage can run Testcontainers without deliberate Docker access. Do not mount the host Docker socket just to bypass that design problem.
4. **Copy one known artifact.** Avoid broad `target/*.jar` copies that may match both executable and original JARs or unrelated artifacts.
5. **Leave code root-owned and read-only to the app.** UID/GID `10001` runs the application but cannot replace its own JAR. `USER` is declared after privileged account setup.
6. **Use exec-form `ENTRYPOINT`.** Java receives container stop signals directly, without an extra shell swallowing them. Log to stdout/stderr and configure the application to shut down gracefully.

The builder runs its build commands as the base image's default user, normally root for this Maven image; that is separate from the final runtime identity. Build in an isolated CI environment and treat dependencies and build scripts as executable code.

The example assumes no wrapper, additional build inputs, or Maven modules. Copy any required wrapper files, `.mvn` configuration, parent/module descriptors, generated inputs, and source directories explicitly for your actual project. Match the runtime architecture and required native libraries to any native dependencies in the JAR.

### Cache and Test Boundaries

Cache mounts are performance aids, not required inputs: a clean builder must still produce a correct result. They can retain private dependencies and other sensitive artifacts, so isolate caches across trust boundaries.

This example deliberately makes the runtime stage copy from the stage that runs `verify`. With BuildKit, an unrelated stage can be skipped if the selected target does not depend on it. Merely adding a stage named `test` elsewhere does not guarantee tests run for your release image.

### Writable Paths and Health

The app must be able to write any required temporary data, normally under `/tmp`. A read-only root filesystem at runtime needs an explicit writable temporary mount and, if necessary, storage mounts. Avoid writing uploads, logs, or application state beside the JAR. Applications or libraries extracting native executables may need a temporary filesystem that permits execution; test restrictions rather than applying them blindly.

No `HEALTHCHECK` is included because a JRE image should not be assumed to contain `curl`, `wget`, or your custom probe. Add a probe executable deliberately or configure platform health/readiness probes. A Java process being alive is not proof that its HTTP endpoints or dependencies are ready, and a Docker health status alone does not trigger a restart policy.

## ENTRYPOINT, CMD, and Environment Expansion

The example's entrypoint is fixed as `java -jar /app/app.jar`. Arguments after the image name are appended to it, such as `--server.port=9090`. Those are **application arguments**. JVM arguments must appear before `-jar`; use a deliberate JVM configuration mechanism such as `JAVA_TOOL_OPTIONS`, not arbitrary arguments after the image name.

`CMD ["--server.port=8080"]` could supply overridable default application arguments, but this example already uses `ENV SERVER_PORT=8080`, so an extra default is unnecessary. Alternatively, `CMD ["java", "-jar", "/app/app.jar"]` without an entrypoint makes replacing the whole command easier. Choose based on the interface you want the image to expose.

JSON exec form does not expand environment references: `ENTRYPOINT ["java", "$JAVA_OPTS", "-jar", "/app/app.jar"]` passes `$JAVA_OPTS` literally. If a startup script is genuinely needed, handle quoting carefully and end it with `exec` of the application. Do not introduce a shell just to perform avoidable environment expansion.

## Build Secrets Without Baking Them Into the Image

For a private Maven repository, replace the Maven `RUN` instructions as appropriate with secret-mounted settings. For example, the verification instruction can be:

```dockerfile
RUN --mount=type=cache,target=/root/.m2 \
    --mount=type=secret,id=maven_settings,target=/root/.m2/settings.xml,required=true \
    mvn -B -ntp verify
```

Supply the secret from the build command using `--secret id=maven_settings,src=/secure/path/settings.xml`. The mount is available for that instruction and is not automatically committed to its output layer. The earlier dependency-preparation step needs the secret too if it accesses the private repository.

Secret mounts cannot stop a build command from printing a secret or copying it elsewhere. Their contents also do not themselves invalidate cached build steps. Use trusted build inputs, careful logging, and intentional cache invalidation when a secret change must trigger a new fetch. Runtime secrets require a separate deployment mechanism; build secrets do not become runtime secrets.

## Production Checklist

- Select maintained official or verified base images; choose glibc/musl, architecture, and native dependencies deliberately rather than choosing Alpine solely for size.
- Pin reviewed base images by digest for reproducibility, then automate updates and rebuilds so pinning does not freeze security fixes indefinitely. Tag-only references in this tutorial are readable starting points, not immutable inputs.
- Keep dependencies reproducible and scanned, test the final runtime image, and publish provenance/SBOM information where your delivery system supports it.
- Keep the context and final image free of unnecessary files and credentials. Removing a file in a later layer does not remove its bytes from earlier layers.
- If installing packages, combine `apt-get update` and installation in one `RUN`, use `--no-install-recommends`, and remove package-list files in that same instruction. Do not install tools the application does not need.
- Run as non-root, keep code non-writable to that user, and grant write access only to designated paths. Do not add `sudo` or use broad permissions as a shortcut.
- Apply runtime limits and hardening too. A secure Dockerfile cannot force every operator to avoid `--privileged`, writable host mounts, or a root-user override.
- Do not assume a successful image build proves readiness, graceful shutdown, correct mount permissions, or application behavior under memory limits. Verify those in the deployment environment.

## Official References

- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
- [Building Best Practices](https://docs.docker.com/build/building/best-practices/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Build Context and Dockerignore](https://docs.docker.com/build/concepts/context/)
- [Build Cache Optimization](https://docs.docker.com/build/cache/optimize/)
- [Build Secrets](https://docs.docker.com/build/building/secrets/)
- [Running Containers: Users and Runtime Configuration](https://docs.docker.com/engine/containers/run/)
- [Rootless Docker](https://docs.docker.com/engine/security/rootless/)
- [User-Namespace Remapping](https://docs.docker.com/engine/security/userns-remap/)