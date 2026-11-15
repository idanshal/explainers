# Docker Troubleshooting and Daily Operations

Docker runs application processes in containers created from images. Failures can come from the build, the Docker engine, application configuration, network connectivity, or storage. Use this diagnostic workflow when a build fails, a container exits, a service is unreachable, or disk usage grows. Start with evidence and the smallest affected resource, not a system-wide reset.

Documentation checked: 2026-11-15. Commands assume Linux containers; substitute your actual container or Compose service names.

## The First Five Checks

```sh
docker context show
docker version
docker ps --all
docker logs --tail 100 orders-api
docker inspect --format '{{json .State}}' orders-api
```

`orders-api` is a placeholder for your container name. Confirm the daemon before interpreting missing containers: a different context can point to an entirely different environment. A name conflict may be caused by a stopped container, visible with `ps --all`.

Container logs show standard output and standard error as available through the configured logging driver; they do not automatically include arbitrary application log files. Log rotation and retention need explicit consideration for long-running services. Inspect output and logs can contain credentials or personal data; redact them before sharing.

## Match the Symptom to the Layer

| Symptom | Check first | Typical cause or next step |
| --- | --- | --- |
| Cannot connect to the Docker daemon | Engine/Desktop state and `docker context show` | Engine stopped, wrong context, socket access, or remote connectivity |
| Build cannot find a file | Context root, `COPY` source, `.dockerignore` | The file is outside the context or excluded; the Dockerfile directory is not automatically the context root |
| Old source appears after a build | Build inputs, resulting tag, running container image | Wrong context or tag, a container that was never recreated, or a mount hiding new image contents |
| Container exits immediately | Exit status and application logs | Main process finished or crashed; a detached shell is not a service |
| Container repeatedly restarts | State, logs, restart policy | Application crash or missing configuration; a restart policy does not repair the cause |
| Exit code `137` | `.State.OOMKilled`, limits, host memory, external signals | Usually SIGKILL; not proof of an out-of-memory kill by itself |
| Host cannot reach a service | App listener and `docker port` | Wrong host port, missing publication, app bound to container loopback, or startup failure |
| App cannot reach a database | Network membership, service DNS, port, authentication | Using `localhost` or a published host port instead of the database service name and internal port |
| Permission denied on a mount | Effective UID/GID and directory permissions | Host files or volume ownership do not match the container user; Docker Desktop sharing can add constraints |
| Database looks empty after recreation | Volume mounts and Compose project name | Different volume/project, wrong data directory, or initialization settings applied only to a new data directory |
| `exec format error` | Image architecture and executable format | Platform mismatch, unsupported emulation, or an invalid script interpreter/line ending |
| `curl` or `sh` is missing | Runtime image contents | Minimal images deliberately omit tools; use a suitable diagnostic environment |

## Inspect Without Changing State

```sh
docker inspect --format '{{.Config.Image}}' orders-api
docker inspect --format '{{.Image}}' orders-api
docker inspect --format '{{json .Mounts}}' orders-api
docker inspect --format '{{json .NetworkSettings.Networks}}' orders-api
docker port orders-api
docker stats --no-stream orders-api
docker top orders-api
docker system df
```

The configured image reference and the actual image ID answer different questions. Pulling a newer image under the same tag does not replace an already-created container. With Compose, reconcile the service with `up -d`; `restart` alone keeps the existing configuration and image.

Inspect health-check output when a container has a configured probe:

```sh
docker inspect --format '{{json .State.Health}}' orders-api
```

A running process, an open port, and an application ready to handle real requests are different states. A plain Docker restart policy reacts to process exit, not an `unhealthy` status. Use the deployment platform's supported health-remediation behavior rather than assuming a health check itself restarts anything.

## Debug a Running Container

```sh
docker exec orders-api id
docker exec --interactive --tty orders-api sh
```

These commands only work if those programs exist in the image. `exec` cannot inspect a container whose main process has already stopped. For stopped containers, use logs, inspect metadata, or copy diagnostic files with `docker cp`. Avoid repeatedly restarting a container if doing so overwrites the evidence you need.

Use a temporary diagnostic container on the same network for connectivity checks, as shown in [Docker Networking](networking.md). Adding a shell or installing packages into a running production container is not a reproducible repair. Make the actual fix in source, image configuration, or deployment configuration and recreate the container.

## Debug Builds and Cache

For an application project containing a Dockerfile:

```sh
docker build --progress=plain --tag orders-api:debug .
```

Read the first meaningful failure, not just the final nonzero status. Check build context paths, network or registry access, dependency credentials, and the stage that failed. Plain logs can still contain sensitive command output; protect them accordingly.

`--no-cache` is a diagnostic rebuild option, not the first response to every unexpected result. It does not by itself pull a newer base image; use `--pull` when that is the intended check. BuildKit cache mounts can also retain package-manager cache data independently of ordinary layer reuse.

With multi-stage builds, inspect or build a named intermediate target instead of adding debugging tools to the final runtime image. See [Dockerfiles and Image Builds](dockerfiles-and-multi-stage-builds.md) for cache boundaries, build secrets, and multi-stage examples.

## Compose Operations

Run these from the project directory, or pass the intended file with `-f` and project with `-p`:

```sh
docker compose config --quiet
docker compose ps --all
docker compose logs --tail 100
docker compose images
```

Validate the resolved configuration before recreating resources. Wrong environment interpolation, a different project name, or an unexpected override file can explain many apparent runtime problems. See [Docker Compose](compose.md) for a runnable stack and the difference between restart, recreation, and volume deletion.

## Cleanup Without Losing Data

First identify what consumes space:

```sh
docker system df --verbose
docker image ls
docker container ls --all --size
docker volume ls
docker buildx du
```

`buildx du` reports the selected builder's cache, not necessarily every cache on the machine. Container size reporting does not include all volume data or all log storage; investigate the relevant storage location too.

| Resource | Deliberate cleanup | What to protect |
| --- | --- | --- |
| Stopped container | `docker rm CONTAINER` | Its writable-layer files if they have not been exported |
| Unneeded image | `docker image rm IMAGE` | Tags still used by another workflow; containers may reference the image |
| Build cache | `docker builder prune` | Rebuild time and caches shared with other work; review the confirmation prompt |
| Unused named volume | `docker volume rm VOLUME` | All data stored there; confirm ownership and backups first |
| Compose project | `docker compose down` | Named volumes remain unless explicitly removed |

Treat deletion of volumes as data deletion. "Unused" means not currently attached to a container; it does not mean the data is unimportant. Avoid broad `system prune` or volume-prune commands as routine troubleshooting steps, especially on shared daemons.

A volume is persistence, not a backup. Keep application-consistent backups, test restores, and plan database upgrades before changing major image versions. See [Docker Storage](mounts-and-copying-files.md#backups-and-database-upgrades).

## Before Calling It Done

- The service starts from the intended image, not just from an old container that happened to be running.
- Requests work from the actual caller's network location with the intended credentials.
- Data survives the lifecycle events it needs to survive, and backups can be restored.
- Shutdown allows the application to finish work; signals reach the real application process.
- Secrets are not present in the image, repository, or published diagnostic logs.
- Ports, capabilities, users, and resource limits match the environment's requirements.
- The fix is represented in source or configuration and can be repeated on a clean environment.

## References

- [Docker CLI reference](https://docs.docker.com/reference/cli/docker/)
- [Container logs](https://docs.docker.com/engine/logging/)
- [Container resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Prune unused resources](https://docs.docker.com/engine/manage-resources/pruning/)
- [Build cache](https://docs.docker.com/build/cache/)