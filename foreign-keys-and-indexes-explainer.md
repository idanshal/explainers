# Foreign Keys and Indexes

Research checked: 2026-10-11

Foreign keys enforce relationships between rows. Indexes can help the database find rows efficiently and can also enforce uniqueness. They are related concepts, but an index is not automatically required for every foreign key or query; choose indexes based on data integrity requirements and actual query patterns.

## Foreign Keys

A foreign key is a column or group of columns whose values refer to a candidate key (usually a primary key, or another unique key) in the same or another table. It enforces referential integrity: a non-`NULL` foreign-key value must match a referenced row. Use `NOT NULL` as well when every child row must have a parent.

```sql
CREATE TABLE parent_table (
    id UUID PRIMARY KEY
);

CREATE TABLE child_table (
    id UUID PRIMARY KEY,
    parent_id UUID NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE
);
```

`ON DELETE CASCADE` means deleting a parent row also deletes rows that reference it through this foreign key. Use it when those child rows should not outlive the parent; otherwise, consider restricting deletion or handling it explicitly. In PostgreSQL, defining a foreign key does not automatically create an index on the referencing column, so consider one when parent deletes/updates or queries need to find matching child rows efficiently.

## Indexes

An index is a data structure the database can use to find or order rows without scanning the entire table. Indexes can help with common filters, joins, and sort operations, but they are not guaranteed to improve every query. Choose them based on actual query patterns and execution plans: indexes take storage and add work to inserts, updates, and deletes. PostgreSQL creates a B-tree index by default; other index types suit particular data and operators.

```sql
CREATE INDEX idx_gh_user_targets_fk_attuid
    ON gh_user_targets (fk_attuid);
```

A multicolumn index can support queries that filter or sort by multiple columns. Column order matters, so match the index to the queries you need to support rather than combining columns arbitrarily.

## Unique Indexes

A unique index prevents duplicate indexed values (or duplicate combinations of values for a multicolumn index). A table has at most one primary key, but can have multiple unique constraints and unique indexes.

```sql
CREATE UNIQUE INDEX idx_child_table_unique_columns
    ON child_table (column1, column2);
```

In PostgreSQL, a primary key or `UNIQUE` constraint creates a unique index to enforce uniqueness. Prefer a `UNIQUE` constraint when expressing a business rule; a unique index is useful when you need index-specific features such as a partial index. By default, PostgreSQL treats `NULL` values as distinct in a unique index, so multiple rows may contain `NULL` in an indexed column. Use `NULLS NOT DISTINCT` if `NULL` values should count as equal.

## References

- [PostgreSQL: Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) — primary keys and foreign keys, including relationship enforcement and foreign-key index behavior.
- [PostgreSQL: Index Types](https://www.postgresql.org/docs/18/indexes-types.html) — available index types and their use cases.
- [PostgreSQL: Multicolumn Indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html) — behavior and considerations for indexes over multiple columns.
- [PostgreSQL: Unique Indexes](https://www.postgresql.org/docs/18/indexes-unique.html) — uniqueness enforcement, including `NULL` behavior.