# Docker Compose

Docker Compose describes related services, networks, and volumes in a YAML file, then manages them as a project. A service describes a component such as an API or database; Compose creates containers from those definitions. Use it for repeatable local application stacks rather than maintaining a long collection of handwritten `docker run` commands.

Documentation checked: 2026-11-15. Commands use the current `docker compose` plugin, not the legacy standalone `docker-compose` binary. Check your installed version before using newer features.

## What Compose Does

| Element | Responsibility |
| --- | --- |
| `services` | How each component runs: image or build, configuration, ports, mounts, dependencies |
| `networks` | Connectivity between services; Compose provides a default project network |
| `volumes` | Named persistent storage |
| `secrets` | Explicitly granted secret files mounted into individual services |
| Project | The namespace grouping these resources, selectable with `--project-name` or `-p` |

Compose creates containers; it is not an alternative container runtime. A Compose file also does not automatically provide multi-host scheduling, high availability, production secret management, or application-level retries.

## Lab: PostgreSQL and a Database UI

This example runs PostgreSQL and Adminer, a browser-based database client. No application source code is required. Run it in a dedicated local directory containing `compose.yaml` and `db-password.txt`. The password file should contain one local development password; keep it out of version control and build contexts, restrict its host permissions, and do not reuse it elsewhere.

Use this as `compose.yaml`:

```yaml
name: docker-guide

services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_DB: app_dev
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app_dev"]
      interval: 3s
      timeout: 3s
      retries: 20
      start_period: 10s

  adminer:
    image: adminer:5
    environment:
      ADMINER_DEFAULT_SERVER: db
    ports:
      - "127.0.0.1:8081:8080"
    depends_on:
      db:
        condition: service_healthy

volumes:
  db_data:

secrets:
  db_password:
    file: ./db-password.txt
```

The database has no published host port. Adminer reaches it as `db:5432` over the project's network; your browser reaches Adminer through `127.0.0.1:8081`. The loopback binding is appropriate for a local database administration tool. Do not expose it publicly just to make a local connection work.

PostgreSQL 17 stores this image's data under `/var/lib/postgresql/data`. New major image versions can change storage layout and require a database upgrade procedure; changing the tag is not a migration strategy. Both example tags can receive updates; pin reviewed versions or digests where reproducibility is required.

### Start and Verify

```sh
docker compose config --quiet
docker compose up --detach --wait --wait-timeout 120
docker compose ps
docker compose logs --tail 50 db
docker compose exec db psql -U app -d app_dev -c 'SELECT current_database(), current_user;'
```

Open `http://127.0.0.1:8081`. Select **PostgreSQL**, use server `db`, username `app`, database `app_dev`, and the password from your local file. If port `8081` is occupied, change only the host-side port in the YAML.

Expected SQL values are `app_dev` and `app`. The example's `pg_isready` probe checks whether PostgreSQL accepts connections; it does not validate the application's password, schema, or migrations. A successful Adminer login checks a different part of the stack.

`--wait` waits for services to be running or healthy as applicable. Adminer has no health check here, so running status alone does not establish HTTP readiness. On older Compose versions without `--wait`, start detached and inspect health and logs explicitly.

### Verify Persistence

Create a small table and record:

```sh
docker compose exec db psql -U app -d app_dev -c "CREATE TABLE IF NOT EXISTS notes (id integer PRIMARY KEY, message text NOT NULL); INSERT INTO notes VALUES (1, 'survives recreation') ON CONFLICT (id) DO NOTHING;"
docker compose down
docker compose up --detach --wait --wait-timeout 120
docker compose exec db psql -U app -d app_dev -c 'TABLE notes;'
```

The row remains because `down` removes the containers and default network but retains the named volume. The database initializes its user, password, and database only when the data directory is empty. Editing initialization variables or the password file later does not rotate credentials in an existing database; change them through PostgreSQL's supported administration workflow.

Local Compose secrets are file-based mounts, not an encrypted vault. The image must support reading the mounted file; `POSTGRES_PASSWORD_FILE` is a PostgreSQL image convention, not a feature that automatically works for every application.

### Stop Versus Delete

```sh
docker compose stop
docker compose start
docker compose down
```

These commands do not delete the named database volume. **Only when you intentionally want to erase this lab's data**, use:

```sh
docker compose down --volumes
```

Keep the same project name while following the lab. Changing it creates a different set of project-scoped resources and can make existing data appear to have vanished. Never add `--volumes` to a normal shutdown alias for a stack containing valuable data.

## Everyday Commands

| Command | Purpose |
| --- | --- |
| `docker compose config --quiet` | Validate the resolved configuration |
| `docker compose up -d` | Create or reconcile services in the background |
| `docker compose up -d --build` | Build services with a `build` definition, then reconcile them |
| `docker compose build --pull` | Build application images while checking for newer base images |
| `docker compose pull` | Pull service images; does not itself recreate containers |
| `docker compose ps -a` | Show running and stopped project containers |
| `docker compose logs --follow --tail 100` | Follow recent project logs |
| `docker compose exec db sh` | Open a shell in the running database container, if available |
| `docker compose run --rm db psql --version` | Run a one-off service container; dependencies may also start |
| `docker compose restart adminer` | Restart the existing container without applying changed configuration |
| `docker compose down` | Remove the project's containers and networks while retaining named volumes |

`exec` uses an existing container. `run` creates a new one and does not publish the service's ports by default. In noninteractive scripts, use `exec -T` when a pseudo-terminal is inappropriate.

## Configuration and Application Development

Compose interpolates `${VARIABLE}` placeholders using its environment and applicable `.env` files. A `.env` file is primarily an interpolation source; its values are not automatically all injected into a container. Use a service's `environment` or `env_file` deliberately for container environment variables. Shell values can override `.env` values, so inspect the resolved configuration when debugging.

Use `$$` when a literal dollar sign should reach the container command rather than be expanded by Compose. Treat `docker compose config` output as potentially sensitive because it can reveal resolved environment values; `--quiet` validates without printing the model.

For your own application, add a service with `build: .`, its internal listening port, and its actual database configuration. Follow [Dockerfiles and Image Builds](dockerfiles-and-multi-stage-builds.md) for an application Dockerfile and [Docker Networking](networking.md) for choosing hostnames.

Use source bind mounts or Compose Watch for a deliberate development loop. File synchronization, application reload, dependency installation, and image rebuilds are separate mechanisms: changing a dependency lockfile or Dockerfile usually requires rebuilding, while a source change may only need a reload. Compose Watch is version-dependent; consult its reference before adding rules.

`depends_on` with `service_healthy` gates initial startup. It does not continuously restart dependent services when a database later fails, and it does not replace connection retries or migration coordination. For one-off migrations, coordinate a dedicated command or service and require successful completion before starting components that depend on the new schema.

Keep development overrides separate from deployment settings. When merging files with `-f`, inspect the final result with `config`; do not assume every list is simply replaced. Compose has profiles for optional components such as debugging tools, but profiles are not access controls.

## References

- [Docker Compose overview](https://docs.docker.com/compose/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Environment-variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/)
- [PostgreSQL image](https://hub.docker.com/_/postgres)
- [Adminer image](https://hub.docker.com/_/adminer)