# Building, Tagging, and Running Docker Images

`docker build` creates an image, `docker tag` adds a name referring to an existing local image, and `docker run` creates and starts a new container. They solve different problems; none is a substitute for the others.

**Documentation baseline:** checked on November 5, 2026 against the current Docker CLI, Buildx/BuildKit, image-tag, and container-run documentation. Examples target Linux containers. Buildx drivers, image-store configuration, daemon permissions, platform support, and CLI versions can affect availability; use your installed command's `--help` to verify its options.

This article uses the Spring Boot Orders API from [Dockerfiles, Permissions, and Multi-Stage Builds](dockerfiles-and-multi-stage-builds.md). Build commands assume you are in that application's project root with its Dockerfile, Maven project, and source code. This explainer repository itself is not that application.

## The Lifecycle

```text
Dockerfile + context -> build -> orders-api:1.4.0
                                   |
                             tag another name
                                   |
                    registry.example.com/team/orders-api:1.4.0
                                   |
                                  push
                                   |
                         another host pulls it
                                   |
                            run -> container
```

An image reference is not a container name. `orders-api:1.4.0` selects an image; `--name orders-dev` gives the resulting container an operational name. `docker exec` and `docker logs` use a container name or ID, not an image reference.

## Build an Image

```bash
docker build \
  --pull \
  --file Dockerfile \
  --tag orders-api:1.4.0 \
  --build-arg APP_VERSION=1.4.0 \
  .
```

The final `.` is the build context. It controls what files `COPY` can read. A Dockerfile at a different location does not automatically change the context: `docker build -f docker/Dockerfile .` still uses the current directory as its context root.

`APP_VERSION` is declared in the companion Dockerfile and stored in an image label. Passing a build argument that your Dockerfile never consumes does not configure your application. Build arguments also do not become runtime environment variables automatically.

### Useful Build Flags

| Flag | When to use it | Important distinction |
| --- | --- | --- |
| `-f`, `--file PATH` | Select a Dockerfile. | Default is `Dockerfile` in the context. |
| `-t`, `--tag NAME:TAG` | Name the output image. | May be repeated to assign several references to the same build result. |
| `--pull` | Check for updated base images. | Does not disable the build cache; a digest-pinned base remains the same content. |
| `--no-cache` | Re-execute steps instead of reusing normal build-layer cache. | Does not itself refresh base images or erase cache-mount contents. |
| `--target STAGE` | Build a named stage such as `build` or `runtime`. | Only the target and its dependencies are required; unrelated test stages can be skipped. |
| `--build-arg NAME=value` | Supply a declared build parameter. | Not a secret mechanism or the same as `docker run -e`. |
| `--secret id=NAME,src=PATH` | Make a secret available to a matching `RUN --mount=type=secret`. | Does not automatically install the secret in the image. |
| `--platform linux/amd64` | Select the target OS/architecture. | May require emulation or a matching native builder. |
| `--progress=plain` | Get readable build-step output in CI or diagnostics. | Logs may expose sensitive output produced by your build commands. |
| `--check` | Run BuildKit's Dockerfile checks without executing the application build. | Not a compiler, test suite, or proof of runtime behavior. |
| `--cache-from ...` / `--cache-to ...` | Import/export caches across CI builds. | Backend/driver support varies; caches need a separate trust and retention policy. |
| `--load` | Load a build result into the local Docker image store. | Especially important with non-default Buildx drivers; single-platform output is the portable starting point. |
| `--push` | Export a build result directly to a registry. | Requires an appropriate registry reference and authentication. |
| `--sbom=true` / `--provenance=mode=max` | Attach supply-chain metadata. | Retention depends on exporter and image store; registry export is a common path. Review metadata exposure. |

For a diagnostic rebuild with fresh base-image resolution and no ordinary layer reuse:

```bash
docker build --pull --no-cache --progress=plain -t orders-api:diagnostic .
```

A Maven cache mounted with `RUN --mount=type=cache` can still retain downloads during this rebuild. `--no-cache` is not a promise that every external dependency will be downloaded afresh. Reproducibility also depends on pinned base images, application dependencies, plugins, and other external inputs.

To inspect an intermediate build stage instead of producing the runtime image:

```bash
docker build --target build -t orders-api:build .
```

This intentionally creates a tooling-heavy image, not the release runtime image. The companion example's `build` stage runs Maven `verify`; tests still depend on the project's actual plugin configuration and required services.

### Build Versus Buildx

Modern Docker uses BuildKit through Buildx for builds. `docker build` is a convenient entry point; `docker buildx build` exposes workflows involving selected builders, explicit exporters, and multiple target platforms. They can differ in builder selection and output handling, so do not assume every successful build is immediately available to `docker run`.

For a single-platform local image:

```bash
docker buildx build \
  --platform linux/arm64 \
  --load \
  -t orders-api:local \
  .
```

Use the platform of your intended runtime, not blindly `arm64` because the developer uses an Apple Silicon Mac. A runtime on an x86 Linux server typically needs `linux/amd64`. JAR bytecode is normally portable, but native libraries and executables packaged with it may not be.

For a multi-platform registry image, assuming a builder that supports both platforms and access to the named registry:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/team/orders-api:1.4.0 \
  --sbom=true \
  --provenance=mode=max \
  --push \
  .
```

This publishes a multi-platform image reference that can select a matching variant when pulled. The default containerd image store can support multi-platform images locally; older/classic image stores and exporters have limitations. `--push` avoids assuming local multi-platform loading works everywhere.

Emulated builds can be much slower, especially for compilation. Native builders may be preferable. BuildKit's `BUILDPLATFORM` and `TARGETPLATFORM` variables support more advanced cross-compilation, but declaring them does not automatically make a compiler or native dependency target the right architecture.

Do not treat `--provenance=mode=max` as a secret-safe vault: build arguments can appear in provenance. Use secret mounts for credentials and review what metadata is published.

## Tags: Names, Not Immutable Versions

The general image reference is:

```text
[registry-host[:port]/]namespace/repository[:tag]
registry.example.com:5000/team/orders-api:1.4.0
```

The registry port belongs after the hostname; the tag belongs after the repository. If no tag is supplied, Docker normally uses `latest`. **`latest` is a literal default tag, not a query for the most recently built, newest, or highest-version image.**

### Why Add Tags?

- Give a build a human-readable release identity such as `1.4.0`.
- Include a commit or CI build identifier to connect an artifact to its source.
- Assign the registry/repository name required for publishing.
- Maintain a deliberate convenience alias such as `1.4` or `staging`, separate from an immutable deployment identifier.

```bash
docker tag orders-api:1.4.0 orders-api:1.4
docker tag orders-api:1.4.0 registry.example.com/team/orders-api:1.4.0
docker image inspect orders-api:1.4.0 --format '{{.Id}}'
docker image inspect orders-api:1.4 --format '{{.Id}}'
```

The two local version references point to the same image ID. Tagging does not rebuild the image, change its contents, copy all its layers, push it, or rename an existing container. It adds or updates a reference. A Docker image label such as `org.opencontainers.image.version` is separate metadata; tagging an image does not rewrite that label.

A tag is **mutable unless your registry enforces otherwise**. Even `1.4.0` and a commit-looking tag can be reassigned. Avoid overwriting release tags; enable registry immutability policies where available.

For exact deployed content, record and use a registry digest: an image reference ending in `@sha256:` followed by the actual digest returned by your registry. A digest identifies content, not a version nickname. For a multi-platform image, distinguish its index digest from an individual platform-manifest digest. The local image ID shown above is not a drop-in substitute for the registry's manifest/index digest.

Pinning a digest fixes the content but also means security updates require explicitly selecting a new digest and redeploying.

### Publish and Pull Deliberately

`registry.example.com` is a placeholder for your real registry. Authenticate using `docker login registry.example.com`; use your credential helper or CI secret integration rather than a password in command history.

```bash
docker push registry.example.com/team/orders-api:1.4.0
docker pull registry.example.com/team/orders-api:1.4.0
```

`push` uploads the named reference and needed layers. `pull` downloads or refreshes the selected reference locally. Retagging an existing local image does not contact the registry by itself. A running container does not update when you pull a new image or move a tag; recreate the container to deploy different content.

## Run a Container

The syntax is:

```text
docker run [DOCKER OPTIONS] IMAGE [COMMAND OR ARGUMENTS]
```

Docker options belong **before** the image. Tokens after it are the container's command or entrypoint arguments, not more Docker flags.

For a local development run:

```bash
docker run --rm \
  --name orders-dev \
  --publish 127.0.0.1:8080:8080 \
  --env SERVER_PORT=8080 \
  orders-api:1.4.0
```

The service is reachable at `http://localhost:8080` if it starts successfully and listens on the container interface, not just container-local loopback. Supply any database connections or other application dependencies required by your actual service. This command deliberately keeps output attached to the terminal.

### Useful Run Flags

| Flag | Meaning | Typical caution |
| --- | --- | --- |
| `--name NAME` | Assign a container name. | Names must be unique among existing containers, including stopped ones. |
| `-d`, `--detach` | Run in the background. | Use `docker logs` to see output. |
| `--rm` | Remove the container when it exits. | Useful for disposable runs; cannot be combined with a restart policy. Named volumes remain. |
| `-i`, `--interactive` | Keep stdin open. | Not usually needed for a background service. |
| `-t`, `--tty` | Allocate a pseudo-terminal. | Combine as `-it` for an interactive shell, not routine CI service logs. |
| `-p`, `--publish HOST:CONTAINER` | Publish a container port through a host port. | `-p 8080:8080` binds all host interfaces by default; prefer a loopback host address for local-only access. |
| `-P`, `--publish-all` | Publish all exposed ports to allocated host ports. | Inspect the chosen ports; it does not mean "publish every listening socket". |
| `-e`, `--env NAME=value` | Override or add a runtime environment value. | Not an image rebuild; values may be visible through inspection and process access. |
| `--env-file PATH` | Read environment settings from a local file. | Not a secret manager or shell script; do not assume Compose interpolation rules. |
| `--mount ...` | Attach a bind mount, named volume, or tmpfs. | Mounted content hides image content at that path. |
| `-v`, `--volume ...` | Shorthand volume/bind-mount syntax. | An absent bind source can be auto-created as a directory; explicit `--mount` is often clearer. |
| `--network NAME` | Attach to a chosen network. | User-defined bridge networks provide container-name DNS. |
| `--user UID:GID` | Override the runtime identity. | Does not change file ownership, mount permissions, or create an account. |
| `-w`, `--workdir PATH` | Override the working directory. | Does not restrict access to other paths. |
| `--entrypoint PROGRAM` | Replace the image entrypoint. | Supply its arguments after the image; overriding clears the image's default command. |
| `--pull always\|missing\|never` | Set image-pull behavior. | Default is `missing`; a locally present mutable tag may otherwise be stale. |
| `--restart unless-stopped` | Restart the process according to this policy. | Not a deployment controller, health-based restart, or substitute for recovery design. |
| `--init` | Add a small init process. | Helps signal forwarding and child reaping; app shutdown behavior still matters. |
| `--stop-timeout 30` | Allow a grace period before forced termination. | Coordinate with the application's shutdown budget. |
| `--memory 512m` | Limit container memory. | Includes heap, native allocations, thread stacks, and other charged memory, not just Java heap. |
| `--memory-swap 512m` | Set total memory-plus-swap budget. | Equal to `--memory` disables swap for the container, subject to host support. |
| `--cpus 1.0` | Set a CPU quota. | Not the same as pinning one dedicated CPU. |
| `--pids-limit 256` | Limit kernel tasks in the container. | Linux threads count too; JVMs can reach the limit without many processes. |
| `--read-only` | Make the container root filesystem read-only. | Writable mounts can remain writable; add temporary/storage paths explicitly. |
| `--tmpfs /tmp:OPTIONS` | Provide temporary writable storage. | Ephemeral, charged against memory constraints, and potentially backed by host swap. |
| `--cap-drop ALL` | Remove Linux capabilities. | Add back only capabilities the workload truly needs. |
| `--security-opt no-new-privileges=true` | Prevent gaining privileges through exec mechanisms such as setuid. | Complements non-root users and other isolation controls. |

### A More Restricted Service Run

```bash
docker run -d \
  --name orders-api \
  --restart unless-stopped \
  --init \
  --stop-timeout 30 \
  --publish 127.0.0.1:8080:8080 \
  --user 10001:10001 \
  --read-only \
  --tmpfs /tmp:rw,nosuid,nodev,size=128m,mode=1777 \
  --cap-drop ALL \
  --security-opt no-new-privileges=true \
  --memory 512m \
  --memory-swap 512m \
  --cpus 1.0 \
  --pids-limit 256 \
  orders-api:1.4.0
```

This is a **starting policy to test**, not a universal production sizing recommendation. It assumes the app only needs `/tmp` for writes, can run with no capabilities, and has adequate memory and task limits. Add explicit writable storage if needed, provision external services separately, and test startup, load, and graceful shutdown. JVM heap must leave room for non-heap memory; do not allocate the entire container limit to `-Xmx`.

The temporary mount deliberately does not enforce `noexec`: some libraries extract native code or executables into temporary locations. If your application supports it, test adding `noexec` as an additional restriction.

The image already sets the same non-root identity; the runtime flag makes that policy explicit. The command does not use `--rm` because it has a restart policy. For actual production systems, let your orchestrator or service manager own lifecycle, probes, rollout, and policy rather than treating one shell command as a deployment platform.

Do not add `--privileged`, mount `/var/run/docker.sock`, or disable security profiles just to silence application errors. Access to an ordinary rootful Docker daemon is effectively host-root authority. Prefer narrowly scoped permissions and rootless Docker where appropriate.

## Ports and Networks Are Different

`EXPOSE 8080` is image metadata. `-p 127.0.0.1:9090:8080` publishes host port `9090` to container port `8080`. Neither setting makes the application actually listen there. Publishing a host port is not required for containers on the same user-defined network to communicate on their container ports.

Inside a container, `localhost` refers to that container, not your laptop and not a sibling database container. Put communicating containers on a user-defined network:

```bash
docker network create orders-net
```

Attach each relevant container with `--network orders-net`. If the database container is named `orders-db`, the app uses `orders-db` and the database's internal listening port. Do not configure it to use the database's published host port.

To reach a service on the Docker Desktop host, use `host.docker.internal`. On a native Linux Engine installation, this name may need an explicit mapping such as `--add-host host.docker.internal:host-gateway`; host service binding and firewall rules must permit access. Do not default to host networking as a fix for a mistaken address.

## Storage, Configuration, and Secrets

For a hands-on walkthrough of host files, mount permissions, and `docker cp` in both directions, see [Mounts and Copying Files](mounts-and-copying-files.md).

A named volume stores persistent data independently of a container:

```bash
docker volume create orders-data
```

An application that actually uses `/data` could be launched with `--mount type=volume,source=orders-data,target=/data`. The sample Orders API does not gain a persistence feature just because this directory is mounted. Provision volume ownership for the runtime UID/GID; `USER` alone does not make an arbitrary mounted path writable. Docker can initialize a new empty volume from image-directory contents unless copy-up is disabled; do not assume existing volumes are reinitialized on deployment.

For read-only application configuration, a bind mount can be useful. Assuming the host directory exists and contains the intended configuration, add:

```bash
docker run --rm \
  --publish 127.0.0.1:8080:8080 \
  --mount "type=bind,source=$PWD/config,target=/config,readonly" \
  --env SPRING_CONFIG_ADDITIONAL_LOCATION=optional:file:/config/ \
  orders-api:1.4.0
```

Bind sources refer to the **daemon host**. Docker Desktop handles sharing selected local directories into its VM; a remote Docker context is not automatically accessing the CLI machine's filesystem. Verify ownership and read/traverse permission for the non-root user. A read-only bind mount prevents writes through that mount; it does not make the entire host directory safe to expose.

Keep local environment files out of version control and build contexts, but do not call them a secure secret store. Prefer deployment-managed secret mounts or a secret-management integration supported by the application. Plain `docker run` does not provide the Swarm service `--secret` flag; use the mechanism appropriate to your runtime. Do not reuse build-time `--secret` as if it were a runtime secret option.

## Commands, Entrypoints, and Inspection

With the companion image's `ENTRYPOINT ["java", "-jar", "/app/app.jar"]`, arguments after the image are application arguments:

```bash
docker run --rm -p 127.0.0.1:9090:9090 orders-api:1.4.0 --server.port=9090
```

This launches Java with `--server.port=9090` after the JAR. `docker run IMAGE sh` would likewise append `sh` to that Java command, not automatically replace it with a shell. Override the entrypoint when debugging an image that contains a shell:

```bash
docker run --rm -it --entrypoint /bin/sh orders-api:1.4.0
```

The shell still uses the image's default non-root identity. Minimal/distroless images may not contain any shell at all. For a running container, `exec` starts an additional process instead of creating a replacement container:

```bash
docker ps
docker ps -a
docker logs --tail 100 -f orders-api
docker exec orders-api id
docker inspect orders-api --format '{{.Config.User}}'
docker inspect orders-api --format '{{.State.Status}}'
docker stats --no-stream orders-api
```

`Config.User` reports configured identity; `id` shows the identity of that exec process. Neither alone proves that an entrypoint which deliberately changes privileges left the main application running under the same identity. Inspect actual processes when that distinction matters. Avoid dumping all inspection output into logs if configuration includes secrets.

`docker start` starts an existing stopped container with its existing configuration; `docker run` creates a new one. `docker restart` restarts the same container; it does not apply a new image or all-new run flags. To change image, mounts, or environment, recreate the container through your deployment workflow.

## Shutdown, Health, and Cleanup

```bash
docker stop --timeout 30 orders-api
docker rm orders-api
```

Stopping asks the main process to shut down, then force-kills it if the grace period expires. Removing the stopped container deletes its writable layer, not the underlying image or its named volumes. Do not use forced removal as the normal shutdown path when graceful completion matters.

`docker run --rm` automatically removes disposable containers and their associated anonymous volumes after exit; explicitly named volumes are not removed by it. Delete a named volume only after deliberately deciding its data is no longer needed. Avoid broad prune commands as routine troubleshooting advice.

Docker can mark a container healthy or unhealthy using an image `HEALTHCHECK` or run options such as `--health-cmd`, `--health-interval`, `--health-timeout`, `--health-start-period`, and `--health-retries`. A probe must be present in the image and reflect a real readiness/liveness decision. `--no-healthcheck` disables an inherited probe.

**A restart policy reacts to process exit, not to an unhealthy status.** Use your deployment platform to implement the desired health-based remediation. A live Java process, a listening TCP socket, and a fully ready HTTP application are different states.

## Common Mistakes

- Treating `latest` or a version-looking tag as inherently immutable.
- Expecting `docker tag` to publish an image or change a running container.
- Confusing build `--pull` of base images with run `--pull` of the application image.
- Using `--no-cache` and assuming all cached Maven downloads have vanished.
- Building with a non-default driver and assuming the result was loaded locally without an appropriate exporter.
- Writing `docker run IMAGE -p 8080:8080` and accidentally passing Docker-looking flags to the application.
- Publishing ports on every host interface when only local access was intended.
- Using a different UID and assuming mounted files will become accessible automatically.
- Combining `--rm` with a restart policy, or assuming a healthcheck alone triggers restart.
- Expecting rebuilds or mutable tag updates to modify containers that already exist.

## Official References

- [Docker Buildx Build Reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Build Drivers](https://docs.docker.com/build/builders/drivers/)
- [Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Build Checks](https://docs.docker.com/build/checks/)
- [Build Cache Backends](https://docs.docker.com/build/cache/backends/)
- [Build Attestations](https://docs.docker.com/build/metadata/attestations/)
- [Docker Image Tag Reference](https://docs.docker.com/reference/cli/docker/image/tag/)
- [Docker Image Push Reference](https://docs.docker.com/reference/cli/docker/image/push/)
- [Docker Container Run Reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Running Containers](https://docs.docker.com/engine/containers/run/)
- [Port Publishing](https://docs.docker.com/engine/network/port-publishing/)
- [Bind Mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Container Restart Policies](https://docs.docker.com/engine/containers/start-containers-automatically/)