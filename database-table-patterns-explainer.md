# Common Relational Table Patterns

Research checked: 2026-10-11

These names describe common **design roles** for tables. They are not formal table types defined by SQL. A relational database enforces structure through keys and constraints, such as primary keys, foreign keys, `UNIQUE`, and `NOT NULL`.

## 1. Entity table

An entity table stores rows for a business object with its own identity. It typically has a primary key.

**Example: `users`**

| Column | Purpose |
| --- | --- |
| `id` | Primary key |
| `email` | User's email; often also unique |
| `name` | User's display name |

An entity can participate in other patterns too. For example, a user is an entity and may be the parent in a one-to-many relationship with orders.

## 2. Detail or extension table

A detail table holds attributes associated closely with a parent row. A common design is a one-to-one relationship, enforced by making the foreign key unique (or using it as the detail table's primary key).

**Example: `user_details`**

| Column | Purpose |
| --- | --- |
| `user_id` | Primary key and foreign key to `users.id` |
| `bio` | Optional biography |
| `avatar_url` | Profile image location |
| `timezone` | Preferred time zone |

Splitting fields out can help when they have a different lifecycle, access policy, or usage pattern. It is not automatically better just because fields are optional or large: a separate table also adds joins and complexity.

## 3. Lookup or reference table

A reference table stores reusable values that other rows refer to with a foreign key.

**Example: `departments`**

| Column | Purpose |
| --- | --- |
| `id` | Primary key |
| `name` | Department name |

A `users.department_id` foreign key can reference `departments.id`. Reference tables are often used for categories, statuses, and types. If a supposed lookup value has its own substantial data and lifecycle, model it as a regular domain entity instead; the label depends on its role, not its size.

## 4. Child or dependent table

A child table stores rows associated with a parent, typically in a one-to-many relationship. The foreign key is on the many side.

**Example: `orders`**

| Column | Purpose |
| --- | --- |
| `id` | Primary key for the order |
| `user_id` | Foreign key to `users.id` |
| `total` | Order total |

One user can have many orders. An order can still be an entity with its own identity; “child” describes its relationship to the user, not whether the order is independently identifiable.

## 5. Association or join table

An association table represents a many-to-many relationship using foreign keys to both related tables.

**Example: `user_roles`**

| Column | Purpose |
| --- | --- |
| `user_id` | Foreign key to `users.id` |
| `role_id` | Foreign key to `roles.id` |

A primary key on (`user_id`, `role_id`) prevents the same role from being assigned to the same user more than once. A separate surrogate key can be used instead, with a `UNIQUE` constraint on the pair.

## 6. Value-object or embedded data

A value object is meaningful as part of its owner and normally has no independent identity. It does not have to be stored in a separate table.

**Example: an address belonging to a user**

| Column | Purpose |
| --- | --- |
| `street` | Street address |
| `city` | City |
| `postal_code` | Postal or ZIP code |

These columns could live on `users`. In an ORM such as Hibernate, an embeddable value object's fields can map to columns in the owning entity's table. A separate table is also possible when the relationship or data shape calls for it; a separate table alone does not make the value an independent entity.

## 7. Audit or history table

An audit table records changes to data over time, often including who made a change and when.

**Example: `user_audit_log`**

| Column | Purpose |
| --- | --- |
| `id` | Primary key for the audit record |
| `user_id` | User whose data changed |
| `changed_at` | Time of change |
| `changed_field` | Field that changed |
| `old_value` | Previous value |
| `new_value` | New value |

Audit designs vary: they may store field-level differences, full snapshots, or structured change records. Whether the records are append-only, how long they are retained, and how they relate to deleted users are separate design decisions.

## 8. Event or log table

An event table records occurrences or actions, such as a login attempt. Operational logs may capture runtime details; business-event records capture domain-relevant facts.

**Example: `login_events`**

| Column | Purpose |
| --- | --- |
| `id` | Primary key for the event |
| `user_id` | Related user, when known |
| `occurred_at` | Time of the attempt |
| `ip_address` | Source address |
| `success` | Whether authentication succeeded |

Event records are often append-oriented, but “append-only” is a design or operational policy, not an automatic property of a table. Events and audits can overlap, but they answer different questions: what happened versus what data changed and by whom.

## 9. Bridge or mapping table

A bridge table is another name for an association table. When the relationship itself has attributes, it is often useful to think of it as an **associative entity**. This is not a completely separate category from join tables; the terms overlap.

**Example: `enrollments`**

| Column | Purpose |
| --- | --- |
| `student_id` | Foreign key to `students.id` |
| `course_id` | Foreign key to `courses.id` |
| `enrolled_at` | Enrollment time |
| `grade` | Grade for this student in this course |

The student-course pair identifies the relationship, while `enrolled_at` and `grade` describe it. A composite primary key or a separate enrollment ID can identify each enrollment, depending on the domain and constraints.

## Quick guide

- A main business object with its own identity: **entity**
- Extra attributes closely owned by one object: **detail or extension**
- Reusable referenced values: **lookup or reference**
- Many rows belonging to one parent: **child / one-to-many**
- A many-to-many link: **association, join, or bridge**
- A relationship with its own attributes: **associative entity**
- Owned data with no independent identity: **value object / embedded data**
- A record of changes: **audit or history**
- A record that an occurrence took place: **event or log**

These patterns can overlap. Choose constraints and table boundaries based on identity, cardinality, lifecycle, and integrity requirements rather than treating the labels as mutually exclusive SQL categories.

Related database concepts are covered in [Foreign Keys and Indexes](foreign-keys-and-indexes-explainer.md).

## References

- [PostgreSQL: Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) — primary keys and foreign keys, including relationship enforcement.
- [PostgreSQL: Integer Array Functions](https://www.postgresql.org/docs/18/intagg.html) — includes a simple many-to-many table example.
- [Hibernate ORM: Embeddable objects](https://github.com/hibernate/hibernate-orm/blob/main/documentation/src/main/asciidoc/introduction/Entities.adoc) — value types without their own persistent identity.
- [Hibernate ORM User Guide: Embeddables](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#embeddable) — mapping embeddable values into their owning entity's table.
