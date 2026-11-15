# Docker Mounts and Copying Files

Use a **bind mount** when a container should use files from your existing filesystem. Use a **volume** when Docker should manage persistent application storage. Use **`docker cp`** when you want a one-time copy into or out of a container rather than a shared path.

**Documentation baseline:** checked on November 5, 2026 against Docker's current storage, bind-mount, volume, and `docker container cp` documentation. Commands below use a macOS/Linux shell and Linux containers, with a local Docker Engine or Docker Desktop. Docker Desktop handles sharing host files into its Linux VM.

## What Is Mounting?

A mount makes another filesystem location visible at a path inside a container. The application opens that container path using ordinary file operations; it does not need a special Docker file-reading API.

```text
your filesystem                         container filesystem
/Users/you/project/input  --bind mount--> /input
       message.txt                          message.txt
```

With a bind mount, these are two views of the same underlying files, not two copies that Docker periodically synchronizes. Changes are visible through the mount, subject to filesystem sharing behavior, caching, and application reload behavior. Allowing writes means the container can also modify or delete the host files.

Mounts are part of the container's runtime configuration, not part of its image. A mount neither rebuilds the image nor permanently adds its source files to it.

## Which Mechanism Should I Use?

| Mechanism | Where the data lives | Good use case | Persistence |
| --- | --- | --- | --- |
| Bind mount | A specific path on the daemon host, shared from your computer by Docker Desktop where applicable. | Source code, input files, local config, generated output you want to open locally. | Host files remain after container removal. |
| Named volume | Storage managed by Docker. | Database files and other application state independent of a particular container. | Remains until deliberately deleted. |
| tmpfs mount | Temporary memory-backed storage, potentially backed by host swap. | Scratch files that should not persist. | Lost when the container stops. |
| Container writable layer | The container's own filesystem changes. | Disposable, non-persistent files. | Survives stop/start of that container, but not its removal. |
| `docker cp` | A new copy at the destination. | Importing one file or exporting a diagnostic/report. | Depends on the destination; no ongoing synchronization. |
| Dockerfile `COPY` | Files baked into an image at build time. | Application code and fixed runtime assets. | Part of the built image. |

There is no Dockerfile `CP` instruction. `COPY`, `RUN cp`, and `docker cp` are different operations. See [Dockerfiles, Permissions, and Multi-Stage Builds](dockerfiles-and-multi-stage-builds.md) for build-time copying.

## Walkthrough: Read Host Files and Write Results Back

Run the examples from a scratch working directory, not a directory containing production data. They create a directory named `mount-demo`. The `alpine:3` helper image contains the small shell utilities used here; its tag follows Alpine's 3.x line rather than pinning immutable content.

### 1. Prepare Host Files

```bash
mkdir -p mount-demo/input mount-demo/output
printf 'Hello from the host\n' > mount-demo/input/message.txt
```

The file is on your computer. It is not in the Alpine image.

### 2. Mount Input Read-Only and Output Read-Write

```bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$PWD/mount-demo/input,target=/input,readonly" \
  --mount "type=bind,source=$PWD/mount-demo/output,target=/output" \
  alpine:3 \
  sh -c 'cat /input/message.txt; printf "Generated inside the container\n" > /output/result.txt'
```

The shell prints `Hello from the host`, then creates `/output/result.txt`. That path is mounted from your computer, so the file is available locally even though `--rm` removes the container after its command exits:

```bash
cat mount-demo/output/result.txt
```

It prints `Generated inside the container`. **No `docker cp` is needed to retrieve this output**, because the container wrote directly into the mounted host directory.

`--user` uses your numeric UID/GID to help avoid root-owned output, especially on native Linux. This helper needs no account entry or home directory. Applications with different identity requirements may need a different approach, and Docker Desktop sharing is not identical to native Linux UID mapping.

### Read the Mount Syntax

```text
--mount "type=bind,source=HOST_PATH,target=CONTAINER_PATH,readonly"
```

- `type=bind` selects a host-path mount.
- `source` is the path outside the container; `src` is an alias.
- `target` is the absolute path the application sees inside the container; `destination` and `dst` are aliases.
- `readonly` prevents writes through this mount. Without it, a bind mount is read-write by default.

`$PWD` is expanded by your host shell before Docker receives the command. Quote the full mount argument to preserve spaces. These simple examples assume paths without commas, since the `--mount` value itself uses comma-separated fields.

The following is equivalent short syntax for the read-only input mount:

```bash
docker run --rm \
  -v "$PWD/mount-demo/input:/input:ro" \
  alpine:3 cat /input/message.txt
```

Prefer explicit `--mount` when teaching or diagnosing mounts. With `-v`, a missing host source is normally created as a **directory**, even if you intended a file. By default, `--mount type=bind` fails instead. Current Docker also supports the explicit `bind-create-src` option, but failing on a typo is often safer.

## Mount One File Instead of a Whole Directory

The host file must exist, and its type must match the intended mount:

```bash
docker run --rm \
  --mount "type=bind,source=$PWD/mount-demo/input/message.txt,target=/message.txt,readonly" \
  alpine:3 cat /message.txt
```

For application configuration, mounting a containing directory is often more reliable than mounting one file. Some editors save by replacing the file through an atomic rename; an existing single-file bind mount can continue to reference the old file. A directory mount allows the application to reopen the new file by name, but the application must still support reloading it.

For the Spring Boot image from the earlier articles, a read-only configuration directory is a practical use case:

```bash
docker run --rm \
  --publish 127.0.0.1:8080:8080 \
  --mount "type=bind,source=$PWD/config,target=/config,readonly" \
  --env SPRING_CONFIG_ADDITIONAL_LOCATION=optional:file:/config/ \
  orders-api:1.4.0
```

This example assumes the local `config` directory exists, contains compatible application configuration, and the image has already been built. Mounting a directory makes its files available; the environment setting tells this particular application where to look. It does not configure every application automatically. Supply the actual service's required databases and other dependencies separately.

## Mounts Hide Existing Files at the Target

If the image already contains `/app/app.jar`, mounting a host directory over `/app` hides that image content. An empty host directory can therefore make the application appear to have vanished. The original image is not modified; recreate the container without that mount to see its original files again.

Mount narrow paths such as `/config`, `/input`, or `/output` instead of covering application binaries or system directories. Bind mounts do not automatically copy hidden image files into the host directory.

Mounts normally must be selected when creating the container. `docker start` and `docker restart` do not add a new mount to an existing container. Recreate it with the required mount configuration; an ad hoc privileged `mount` inside the container is not the normal solution.

## Permissions: Why Can the Container Not Read or Write?

For Linux containers, access depends on the process UID/GID, file ownership, permission bits, directory traversal permission, and any additional security policies. Dockerfile `USER` and `docker run --user` select an identity; they do not automatically change host ownership or grant access.

- Mount readable configuration as read-only and ensure the runtime user can read files and traverse parent directories inside the mounted tree.
- Make output directories writable by the intended UID/GID or appropriate group. Do not solve every error with root or `chmod -R 777`.
- `COPY --chown` affects files in the image, not host files later mounted over that location.
- On SELinux-enforcing Linux hosts, labeling can also affect access. Docker documents `-v ...:z` and `:Z` for specific sharing policies; do not relabel broad host system directories casually. Docker Desktop on macOS has different sharing controls.
- Rootless Docker and user-namespace remapping can change host/container identity relationships. Test the actual deployment environment rather than assuming matching usernames imply matching access.

Only mount the files a workload needs. Do not mount your whole home directory, SSH credentials, or Docker socket as a convenience. Read-only access still lets the process read and potentially disclose secrets. A writable mount permits host-file changes, including deletion, within the accessible tree.

## Named Volumes: Persistent Data Managed by Docker

A named volume is useful when your goal is persistent application data, not browsing a particular host folder. For a small non-root demonstration, use a fresh volume named `mount-demo-data`:

```bash
docker volume create mount-demo-data

docker run --rm \
  --mount type=volume,source=mount-demo-data,target=/data \
  alpine:3 chown 10001:10001 /data

docker run --rm \
  --user 10001:10001 \
  --mount type=volume,source=mount-demo-data,target=/data \
  alpine:3 sh -c 'printf "Persistent volume data\n" > /data/message.txt'

docker run --rm \
  --user 10001:10001 \
  --mount type=volume,source=mount-demo-data,target=/data \
  alpine:3 cat /data/message.txt
```

The one-time initialization helper runs as root to set ownership of this new volume's mount directory; the workload then writes as UID `10001`. This is not permission advice for arbitrary existing data. Provision ownership deliberately for a real service.

The last container reads data written by a different, already removed container. Removing these containers does not remove the named volume. Ordinary local volumes are managed on the Docker host; they are not automatically replicated between machines. On Docker Desktop, that storage is normally inside the VM, not a normal folder under your project.

An empty volume can be populated from existing image content at its mount destination by default. `volume-nocopy` disables this copy-up behavior. A non-empty volume hides the image's existing destination content; rebuilding the image does not replace an existing volume's data.

When you no longer need **this demo's data**, remove the specific volume:

```bash
docker volume rm mount-demo-data
```

Do not use broad volume pruning as a substitute for deciding which data is safe to delete. Databases need application-consistent backup tools or coordinated snapshots; casually copying live database files is not a reliable backup.

## Copy Files Into and Out of a Container

Use a container's **name or ID**, not its image reference:

```text
host -> container: docker cp LOCAL_PATH CONTAINER:/destination
container -> host: docker cp CONTAINER:/source LOCAL_PATH
```

`docker cp` supports running and stopped containers, including a created container that has never been started. It does not require opening an interactive shell. Local paths are resolved on the **CLI machine**, which is an important difference from bind mounts against a remote daemon.

### A Round Trip Without Starting the Application

The following uses the host input file created earlier. The container name `copy-demo` must be unused:

```bash
docker create --name copy-demo alpine:3 /bin/sh

docker cp ./mount-demo/input/message.txt copy-demo:/tmp/message.txt

mkdir -p mount-demo/downloads
docker cp copy-demo:/tmp/message.txt ./mount-demo/downloads/from-container.txt

cat mount-demo/downloads/from-container.txt
```

The final command prints `Hello from the host`. The first copy imported the host file; the second exported a new local copy with a different name. The container has not needed to run.

`docker cp` does not watch for later changes or update the original host file. Copying a new configuration file also does not force an already running application to reload it. Avoid patching application code in a container as a deployment method; update the image and recreate containers instead.

### Directories Versus Directory Contents

Copy a host directory into an existing container directory:

```bash
docker cp ./mount-demo/input copy-demo:/tmp/
```

This creates `/tmp/input/message.txt`. To copy only the contents of that directory into an existing local directory, append `/.` to the **source**:

```bash
docker cp copy-demo:/tmp/input/. ./mount-demo/downloads/
```

Now the local directory contains `message.txt` directly, rather than a nested `input` directory. This includes hidden entries; unlike a shell `*` glob, it does not exclude dotfiles.

The same contents-only syntax works in the other direction:

```bash
docker cp ./mount-demo/input/. copy-demo:/tmp/input/
```

These commands copy or merge files; they are not a mirror operation that deletes unrelated destination files. Existing destination files with matching names can be overwritten, so check the path before copying.

### Destination Rules That Matter

| Situation | Result |
| --- | --- |
| File source, nonexistent destination filename, existing parent | Creates the destination file. |
| File source, existing destination directory | Copies using the source filename. |
| File source, destination ending in `/` but directory does not exist | Fails; the destination directory must exist. |
| Directory source, nonexistent destination, existing parent | Creates the destination directory and copies the source contents into it. |
| Directory source, existing destination directory | Copies the source directory into it, unless source ends in `/.`. |
| Source directory ends in `/.`, destination directory exists | Copies the source's contents into the destination. |

`docker cp` does **not** create missing parent directories. Create host parents with `mkdir -p`. For a running container with the required shell utilities, create container parents with `docker exec CONTAINER mkdir -p /destination`; the exec user needs permission. For a stopped container, choose an existing path or prepare the directory tree before stopping it.

Container paths are interpreted relative to the container's `/`, not its configured `WORKDIR`; using absolute paths makes that explicit. Quote local paths containing spaces. If a local filename contains `:`, use an explicit local prefix such as `./file:name.txt` so it is not misread as a container/path delimiter.

### Ownership, Symlinks, and Special Files

By default, files copied **into** a container are normally created with root UID/GID, not automatically owned by the image's `USER`. Files copied **out** normally belong to the local user who invoked `docker cp`, with permissions preserved where possible. A non-root application may not be able to read a copied mode-`0600` root-owned file or modify a root-owned directory.

`docker cp -a` preserves source UID/GID information; it does not translate names into whichever container account you wanted. Use it deliberately and account for filesystem support and permissions. If ownership must change, prepare it explicitly through an authorized setup process rather than running the main application permanently as root.

`docker cp -L` follows source symbolic links rather than copying the link itself. This can copy files outside the directory you expected; review source links before enabling it. Special runtime filesystems such as `/proc`, `/sys`, `/dev`, and some mounts have copying limitations. Do not treat `docker cp` as a universal filesystem backup tool.

Copying into a read-only mount can fail, and copying into a writable bind-mounted path can modify host files. Do not assume the Docker daemon ignores mount restrictions. For host-owned bind-mounted data, accessing its source folder directly is usually clearer than going through `docker cp`.

After the copy demonstrations, remove the stopped container:

```bash
docker rm copy-demo
```

Any files only in that container's writable layer disappear with it. Export them first. If you had used `docker run --rm`, an exited container might already be gone before you could copy from it.

## Diagnose Mount Problems

For an existing container, inspect what Docker actually mounted:

```bash
docker inspect CONTAINER --format '{{json .Mounts}}'
```

Look for `Type`, `Source`, `Destination`, and `RW`. For bind mounts, `RW: false` indicates a read-only mount. These report configured mounts, not whether your application opened the right file.

If the container is running and contains the corresponding utilities:

```bash
docker exec CONTAINER id
docker exec CONTAINER ls -ld /input /output
docker exec CONTAINER ls -l /input
```

Replace `CONTAINER` with a real name or ID. `id` shows the exec process's identity; a custom entrypoint that changes privileges can make the main application's identity differ. `docker exec` requires a running container, unlike `docker cp`.

| Symptom | Likely explanation |
| --- | --- |
| Bind source does not exist | Wrong source path, typo, or path absent on the daemon host. |
| A supposed config file is a directory | `-v` auto-created a missing source as a directory. |
| Permission denied | UID/GID mismatch, missing directory traversal/write permissions, read-only mount, sharing controls, or security labeling. |
| Application files disappeared | A mount covers the image's application directory. |
| Host files are available but the app ignores them | App is reading another path, has cached data, or needs explicit reload/configuration. |
| A single-file mount shows old content | An editor replaced the host file; consider a directory mount and application reload. |
| Copy command says container not found | An image name was used, container name is wrong, or `--rm` already removed it. |
| A remote container cannot bind local files | Bind mounts use the daemon host; transfer files or use `docker cp` instead. |

On macOS, Docker Desktop may need permission to share the source directory. Use a suitable project directory and the Desktop file-sharing/privacy settings rather than granting the container privileged mode. For a remote Docker context, inspect `docker context show` and verify where the daemon actually runs.

## Bottom Line

To make a container use your files, bind-mount the smallest necessary host path at the application path, read-only unless writes are required. To keep Docker-managed state, use a named volume with deliberate ownership and backups. To move files once, use `docker cp` in either direction and check destination semantics, ownership, and container lifetime.

For broader runtime flags and lifecycle behavior, see [Building, Tagging, and Running Images](build-tag-and-run.md).

## Official References

- [Docker Storage Overview](https://docs.docker.com/engine/storage/)
- [Bind Mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Volumes](https://docs.docker.com/engine/storage/volumes/)
- [tmpfs Mounts](https://docs.docker.com/engine/storage/tmpfs/)
- [Docker Container Copy Reference](https://docs.docker.com/reference/cli/docker/container/cp/)
- [Docker Container Run Reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker Container Exec Reference](https://docs.docker.com/reference/cli/docker/container/exec/)