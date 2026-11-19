---
technologies:
    - Docker
---

# Docker

Docker packages an application and its runtime dependencies into an **image**, then creates one or more **containers** from that image. These explainers cover the core objects and workflows behind running local dependencies, building repeatable application environments, and moving the same application artifact between machines.

The examples target Linux containers with a local Docker Engine or Docker Desktop and a macOS/Linux-style shell. Published ports bind to loopback unless wider exposure is explicitly needed. Production orchestration is outside this overview's scope.

## The Core Model

| Term | What it means |
| --- | --- |
| Image | Filesystem layers and configuration used to create containers; not a running process |
| Container | An isolated application process or process tree created from an image, with runtime settings and a writable layer |
| Dockerfile | Build instructions for an image |
| Build context | The files made available to a build; filtered by `.dockerignore` |
| Registry | A service for storing and distributing images, such as Docker Hub or a private registry |
| Network | Connectivity and name resolution between containers and other endpoints |
| Volume | Docker-managed storage with a lifecycle independent of a container |
| Compose | A declarative way to run related services, networks, and volumes together |

An image is not a miniature virtual machine. Linux containers share a Linux kernel while using isolation and resource controls. Docker Desktop supplies a Linux VM on macOS and for Linux-container workflows on Windows; containers do not use the macOS kernel directly.

The Docker CLI talks to a daemon. The active **context** selects which daemon receives commands, so a command can affect a remote machine rather than your laptop. Builds use BuildKit in modern Docker installations; Buildx provides the extended build interface.

```text
source + Dockerfile + build context
                 -> build -> image -> push/pull through a registry
                                -> run -> container
                                           + network
                                           + runtime configuration
                                           + optional persistent storage
```

## Check Your Environment

Install [Docker Desktop](https://docs.docker.com/desktop/) on macOS or Windows, or follow the [Docker Engine installation guide](https://docs.docker.com/engine/install/) for a supported Linux distribution. Start the engine before running containers.

```sh
docker version
docker context show
docker info
docker compose version
```

`docker version` should show both client and server information. A client version alone does not establish that the daemon is reachable. Linux access to the Docker socket is powerful; membership in the `docker` group effectively grants root-level privileges on the host. Consider rootless mode where appropriate rather than treating socket permissions as an ordinary file-access problem.

## First Local Service

This example uses an existing web-server image, so no application project or Dockerfile is required. Image pulls require registry access; choose a different host port if `8080` is already occupied.

```sh
docker run --detach --name docker-guide-web --publish 127.0.0.1:8080:80 nginx:stable-alpine
curl --fail http://127.0.0.1:8080/
docker logs --tail 20 docker-guide-web
docker ps
docker stop docker-guide-web
docker start docker-guide-web
docker rm --force docker-guide-web
```

The container listens on port `80`; your browser reaches it through host port `8080`. `--detach` leaves it running in the background. Stop/start reuses the same container; another `docker run` creates a new one. The final command deliberately stops and removes only this example container.

`nginx:stable-alpine` is a convenient moving tag, not a reproducible immutable version. Pin an appropriate version and, when needed, a digest for controlled builds and deployments; plan how those pins receive security updates.

## Learning Path

| Order | Guide | Main question |
| --- | --- | --- |
| 1 | This overview | What runs where, and what are the main Docker objects? |
| 2 | [Dockerfiles and Image Builds](dockerfiles-and-multi-stage-builds.md) | How do I package my application efficiently and safely? |
| 3 | [Docker Images and Containers](build-tag-and-run.md) | How do I build, publish, run, and manage it? |
| 4 | [Docker Storage](mounts-and-copying-files.md) | Where should source files, generated output, and database state live? |
| 5 | [Docker Networking](networking.md) | How do containers, host services, and browsers reach each other? |
| 6 | [Docker Compose](compose.md) | How do I define and operate a repeatable multi-service development stack? |
| 7 | [Docker Troubleshooting and Daily Operations](troubleshooting.md) | How do I investigate failures and clean up without losing data? |

The detailed build examples use a Spring Boot Orders API as an illustrative application. The underlying Docker concepts apply to other languages; adapt application-specific commands to your own project. The local-service, networking, and Compose exercises need no application source code.

## Everyday Decisions

- **Source code and local input files:** Use a bind mount when sharing existing host files is intentional. A changed file still needs application reload support to affect a running process.
- **Database state:** Use a named volume and a database-appropriate backup strategy, not just the container's writable layer.
- **Application configuration:** Supply non-secret configuration at runtime. Environment variables are not a secret store; use appropriate secret delivery and avoid committing credentials.
- **Dependency versions:** Distinguish application dependencies, base-image versions, and image tags. Rebuilding the same Dockerfile can change the result if inputs are not pinned.
- **CPU architecture:** An `arm64` laptop and an `amd64` deployment target can require different image variants. Check platform support; emulation can be slower and does not replace target-platform testing.
- **Validation:** A successful image build does not prove that the service starts, listens on the right address, can reach its dependencies, or passes application tests.

## Development Versus Deployment

Local development may use source mounts, debugging tools, and disposable credentials. A deployment image should contain only needed runtime artifacts, run with an appropriate non-root user, handle termination signals, log to standard output/error, and use external persistent storage for state.

Set sensible resource limits and health checks, keep images updated, and scan dependencies and images as part of delivery. Do not mount the Docker socket, use `--privileged`, or run untrusted images merely to work around an unexplained error. A container is an isolation boundary, not a guarantee of harmless execution.

## References

- [Docker overview](https://docs.docker.com/get-started/docker-overview/)
- [Docker contexts](https://docs.docker.com/engine/manage-resources/contexts/)
- [Linux post-installation security notes](https://docs.docker.com/engine/install/linux-postinstall/)
- [Docker build documentation](https://docs.docker.com/build/)