# Flyway: Database Migrations and SQL Script Tracking

Research checked: 2026-11-10

Flyway is a database migration tool. It applies ordered changes to a database and records which changes have already run, so development, test, and production databases can follow the same upgrade path.

A **migration** is a deliberate database change, such as creating a table, adding a column, creating an index, or updating reference data. With SQL migrations, you write the SQL; Flyway handles discovery, ordering, execution, and bookkeeping.

The central idea is:

> Migration files describe the changes available in your application release. A history table in each database records the changes already applied there.

## Why Use It?

Without migration tracking, teams often pass around SQL files and ask, "Has this script already run in production?" Running a script twice might fail or duplicate data; forgetting one might break the next deployment.

Flyway turns those scripts into a versioned upgrade sequence that can be checked into Git and executed consistently during deployments.

It is not an ORM and does not automatically compare your Java entities or desired schema with the database to generate the required changes. Its migration workflow executes the changes you supply. Successful validation of migration history is also not proof that nobody has manually changed the live schema.

## A Small Example

Suppose an application starts with customers and later needs an email address and an index. Keep the changes in separate files:

```text
sql/
  V1__create_customer.sql
  V2__add_customer_email.sql
  V3__index_customer_email.sql
```

These examples use PostgreSQL syntax.

**V1__create_customer.sql**

```sql
CREATE TABLE customer (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL
);
```

**V2__add_customer_email.sql**

```sql
ALTER TABLE customer
    ADD COLUMN email VARCHAR(320);
```

**V3__index_customer_email.sql**

```sql
CREATE INDEX idx_customer_email ON customer (email);
```

On an empty database, Flyway runs V1, V2, then V3. On a database where V1 and V2 have already succeeded, it runs only V3. Running it again with the same files leaves those versioned migrations unchanged.

Flyway does not need `CREATE TABLE IF NOT EXISTS` to avoid rerunning V1: its history table is what tells it that V1 has already run. Ordinary migration SQL can deliberately fail if the database is unexpectedly different from the required starting state.

## How Does It Know Which Scripts to Run?

### 1. Discover Files in Configured Locations

Flyway scans the migration locations you configure. For the CLI example below, that is `filesystem:./sql`, relative to the working directory. It does not search your whole machine or Git history.

In a Java application, migrations are commonly packaged under `src/main/resources/db/migration` and discovered through `classpath:db/migration`. The location is configurable; it is not the filename alone that makes a script discoverable.

### 2. Read the Filename Convention

By default, a versioned SQL migration is named:

```text
V2__add_customer_email.sql
| |  |                  |
| |  description        suffix
| separator: two underscores
prefix + version
```

- `V` means a versioned migration.
- `2` is the version, which must be unique among discovered versioned migrations.
- `__` separates the version from the description.
- `add_customer_email` describes the change.
- `.sql` identifies a SQL migration.

Versions are ordered numerically by their components, not by ordinary alphabetical filename sorting: V2 runs before V10. Versions such as `V2_1__add_customer_status.sql` can express intermediate steps, but a simple increasing integer is often enough.

Do not silently rely on a misnamed file being executed. Enable `validateMigrationNaming` to make invalid migration names fail validation rather than be silently skipped.

### 3. Read the Database's History Table

Flyway normally creates a table named `flyway_schema_history` in its configured history schema. Its table name and schema are configurable.

Among other metadata, the table records execution order, version, description, migration type, script name, checksum, who installed it, when it ran, execution time, and success status.

A simplified view after the first two migrations might look like this:

| Installed Rank | Version | Script | Checksum | Success |
| --- | --- | --- | --- | --- |
| 1 | 1 | V1__create_customer.sql | recorded value | true |
| 2 | 2 | V2__add_customer_email.sql | recorded value | true |

Each target database has its own history. Your development database being at V3 does not mean production is at V3. Git stores the files; it is not Flyway's record of what ran in a particular database.

You can inspect the real table directly:

```sql
SELECT installed_rank, version, description, script, checksum, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

Use the configured schema and table name if they differ from the defaults.

### 4. Compare, Validate, and Execute

For a normal forward-only migration run:

1. Discover the migrations available in this release.
2. Read the target database's migration history.
3. Validate resolved migrations against recorded history; `migrate` performs validation by default.
4. Execute eligible pending versioned migrations in version order.
5. Record each successful migration and its checksum.
6. Execute new or changed repeatable migrations after the pending versioned migrations.

SQL migration checksums use CRC32. They let Flyway detect changes to an already applied script, but they are not a security signature or a comparison of the live database schema.

If V2 has already run and you change its SQL, Flyway normally reports a checksum mismatch. It does **not** treat the edit as a request to rerun V2 or undo the old SQL. Add a new migration, such as V4, to make the next change.

The filename and history determine eligibility; the SQL determines the actual database change. Flyway does not infer a dependency graph from foreign keys or SQL references. Put dependent changes in the correct version order yourself.

## How to Run It

### Prerequisites

- Install the Flyway command-line distribution with support for your database; see the official getting-started documentation below.
- Have a reachable PostgreSQL database and a database user with permission to make the example schema changes and maintain the history table.
- Save the three example scripts in a local `sql` directory. Start with an empty disposable database or schema, not a production database.

### Configure the Connection and Location

From the directory containing `sql`, set the non-secret connection settings:

```bash
export FLYWAY_URL='jdbc:postgresql://localhost:5432/customer_app'
export FLYWAY_USER='migration_user'
export FLYWAY_LOCATIONS='filesystem:./sql'
export FLYWAY_VALIDATE_MIGRATION_NAMING=true
```

Supply `FLYWAY_PASSWORD` through your local secret-management mechanism or a masked CI secret. Do not commit credentials to Git or put real passwords in shared command examples. Database-specific driver and module requirements depend on the Flyway distribution or integration you use.

### Inspect, Apply, and Check

```bash
flyway info
flyway migrate
flyway info
flyway validate
```

- `info` shows migration status, including what is applied and what is pending.
- `migrate` applies eligible pending migrations and records their results.
- `validate` checks the available migrations against recorded history without applying SQL changes. Pending versioned migrations can cause a standalone validation failure under the default validation rules; run it after migration in this walkthrough.

For the first run, all three versioned migrations start as pending and end as successful. Run `flyway migrate` again: with unchanged files and no new migrations, there is nothing to apply.

Now add `sql/V4__add_customer_status.sql`:

```sql
ALTER TABLE customer
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
```

The next `flyway migrate` applies V4 without rerunning V1 through V3. Existing customers receive the default status as part of this PostgreSQL change.

The database URL selects the target. Running the same release against another environment uses that environment's connection settings and history table, not a shared global migration state.

## Versioned Versus Repeatable Migrations

| Kind | Example | When It Runs | Typical Use |
| --- | --- | --- | --- |
| Versioned | `V4__add_customer_status.sql` | Once per database during normal migration tracking | Tables, columns, indexes, data transformations |
| Repeatable | `R__customer_directory.sql` | Initially, then again when its checksum changes | Replaceable views, functions, procedures |

A repeatable migration has no version. For example:

```sql
CREATE OR REPLACE VIEW customer_directory AS
SELECT id, name, email
FROM customer;
```

Save that as `R__customer_directory.sql`. After pending versioned migrations finish, Flyway runs new or changed repeatables in description order. The author must make them safe to execute repeatedly. An unconditional `INSERT` is usually a poor repeatable migration because reruns can duplicate rows.

Repeatables are the deliberate exception to the "do not edit an applied migration" rule: editing their content is how you request another execution.

## What Happens When Something Goes Wrong?

### An Applied Script Was Edited

Restore the applied versioned script to its original content and put the intended change in a new migration. Do not routinely use `repair` to make a checksum error disappear: it can realign history metadata, but it does not execute the edited SQL or make the database match it.

### A Migration Fails Halfway Through

Do not assume that every change has been rolled back. Flyway normally wraps each migration in a transaction when the database and statements allow it. PostgreSQL supports transactional DDL, but some operations cannot run in a transaction; other databases have different DDL transaction behavior.

Inspect the error, actual database state, and migration history before retrying. Nontransactional changes can require manual cleanup. `repair` can remove failed migration records when appropriate, but it does not clean up leftover tables, columns, or data. Coordinate any correction to a failed script with whether that version has already succeeded in other environments.

### An Older Version Arrives Late

If a database has already reached V3, adding a previously absent V2.1 is not normally treated as the next pending forward migration. By default, out-of-order execution is disabled. Prefer assigning the change a new version above the current version; enable `outOfOrder` only when the team intentionally accepts and tests that execution order.

### The Database Already Has Tables

Do not run a fresh V1 against an existing populated schema and hope Flyway figures out which statements are unnecessary. Flyway normally refuses to migrate a nonempty schema with no history table unless you establish an appropriate starting point.

The `baseline` command records a baseline marker without running the earlier migration SQL. If the existing database has been verified to match the state represented by V3, baselining at version 3 tells Flyway to apply later migrations, not V1 through V3. It does not verify that the existing tables really match that state.

Choose the baseline deliberately, keep an upgrade path for existing databases and a creation path for new ones, and avoid enabling automatic baselining casually: connecting to the wrong database becomes easier to overlook.

### You Want to Undo a Deployment

Ordinary `migrate` runs forward; it does not generate reverse SQL for you. A common recovery strategy is a new corrective migration, backed by an appropriate backup and restore plan. Dedicated undo capabilities depend on the Flyway edition and require authored undo scripts; not every change, especially data loss, is reversible.

`clean` is not a rollback command. It drops objects in configured schemas and must not be used as a production recovery shortcut.

## Using Flyway in an Application or Pipeline

The same migration model works through the CLI, build integrations, and the Java API. In Spring Boot applications, SQL files commonly live under `src/main/resources/db/migration`; automatic startup migration requires the appropriate Flyway dependencies and configuration for that Spring Boot version.

For a related Java persistence discussion, see [JPA ID Generation and Hibernate Schema Management](../java/persistence/jpa-id-generation-and-hibernate-schema-management.md). When Flyway owns schema changes, avoid also asking Hibernate to independently create or update that same schema; use schema validation or disable Hibernate schema management as appropriate.

A typical deployment flow is:

```text
Commit migration files with the application change
    -> test migrations against a disposable database
    -> package the reviewed files in a release
    -> run Flyway against the target database
    -> deploy compatible application code
```

Test both creation from an empty database and upgrades from a representative previous state. For rolling deployments, changes must remain compatible with application instances still running the old version. An additive column followed by a later backfill and removal is often safer than immediately renaming or dropping something the old code uses.

Flyway coordinates migration execution against a shared history table using database-specific locking, but the team still owns unique version assignment and SQL dependency ordering. Prefer a designated migration step or a deliberately configured startup strategy rather than unrelated processes changing the schema independently.

## Rules to Remember

- Keep versioned migrations immutable once they have been applied to a shared environment.
- Add new changes as new versions; use repeatables only for intentionally repeatable definitions.
- Ship the same reviewed migration files to every environment.
- Keep the history table intact and investigate mismatches instead of editing history by hand.
- Use controlled migration credentials, backups, and realistic upgrade tests.
- Remember the division of responsibility: you author the SQL; Flyway tracks and executes it.

## References

- [Flyway documentation](https://documentation.red-gate.com/flyway): Installation, getting started, database support, and integrations.
- [Migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations): Versioned and repeatable migrations, naming, and ordering.
- [Schema history table](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/flyway-schema-history-table): Recorded metadata and migration states.
- [Flyway commands](https://documentation.red-gate.com/flyway/reference/commands): `info`, `migrate`, `validate`, `baseline`, `repair`, and other operations.
- [Flyway configuration](https://documentation.red-gate.com/flyway/reference/configuration): Locations, environment variables, naming validation, and migration settings.