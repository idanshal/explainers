# Batch Processing with Temporal

Research checked: 2026-10-25

A Workflow can coordinate fetching database rows and making HTTP calls without carrying every row through its history. Choose the consistency model, unit of work, concurrency bound, and recovery policy deliberately.

This article assumes the [Temporal execution model](README.md), [Activity reliability rules](activities-and-failures.md), and [data/history boundaries](data-and-history.md). Examples use illustrative Java fragments; batch schemas are application design recommendations, not prescribed Temporal schemas.

## Option A: Page Existing Data and Pass IDs

```text
Workflow
  -> FetchPage(query, cursor, pageSize)
       returns { itemIds, nextCursor }
  -> ProcessItem(itemId) for each ID, with bounded concurrency
       reads the needed row, makes HTTP request, returns a small summary
  -> repeat, periodically Continue-As-New if necessary
```

This is a good starting point when the existing database already contains the data and you do not need an immutable snapshot. Do not copy an entire dataset to another table merely because Activities cannot share object references.

Use stable ordering and a suitable cursor or watermark. Offset pagination over changing data can skip or duplicate rows. Even keyset pagination is not an immutable snapshot unless the selection/versioning rules make it one.

## Option B: Materialize a Durable Batch and Pass a Batch ID

```text
Workflow
  -> PrepareBatch(batchKey, selection)
       persists batch membership or a snapshot; returns batchId
  -> ReadBatchPage(batchId, cursor)
       returns a bounded page of IDs and nextCursor
  -> ProcessItem(batchId, itemId), with bounded concurrency
       reads stored data, performs duplicate-safe HTTP work, records outcome
  -> FinalizeBatch(batchId)
```

This is a valid external-storage/reference pattern when you need stable membership, auditability, restartability outside one Activity attempt, or a dataset too large for history. It is an architectural choice, not a Temporal requirement or a guarantee of production readiness. SDK-level external payload storage is a separate mechanism described in [Data and History](data-and-history.md#external-payload-storage).

Returning only `batchId` does not tell the Workflow which items exist. It still needs bounded page reads, known shard descriptors, or chunk-processing Activities. Do not assume item IDs are contiguous integers from `1` to `N`.

## Fresh Data Versus a Snapshot

| Reference design | What a later Activity reads | Tradeoff |
| --- | --- | --- |
| Existing row ID | Current row at read time | Simple, but data can change or disappear between attempts |
| Batch membership plus row ID | Fixed membership, possibly current row contents | Stable selection does not imply stable contents |
| Batch snapshot or immutable object/version | The selected historical content | Reproducible processing, with extra storage and lifecycle management |

"A retry can fetch fresh data" is not always an advantage. If a repeated HTTP request uses the same idempotency key but a changed request body, the recipient may reject it or apply unintended semantics. Choose and document the consistency model.

## Choose the Unit of Work

- **Per item:** independent retries and clear outcomes, but more scheduling/history overhead.
- **Per chunk:** less overhead, but retry can revisit already-processed items; heartbeat a cursor and make each item's effect duplicate-safe.
- **Child Workflows:** useful for independently managed partitions; keep the parent's fan-out and history bounded too.

Pagination is not streaming bulk rows through Workflow memory. The bulk data stays in the external system, and the Workflow orchestrates bounded units of work.

## Bound Concurrent Processing

Inside Java Workflow code, a bounded page can be processed concurrently:

```java
List<Promise<ProcessResult>> pending = new ArrayList<>();
for (String itemId : pageIds) {
    pending.add(Async.function(activities::processItem, batchId, itemId));
}
Promise.allOf(pending).get();
for (Promise<ProcessResult> result : pending) {
    recordSummary(result.get());
}
```

Here `pageIds` must already be capped at the desired concurrency. Waiting for one bounded group before fetching the next is simple; a rolling window can improve utilization. Choose an explicit failure policy: the fragment lets an unhandled Activity failure propagate rather than classifying each failed item.

Apply worker concurrency limits and downstream rate limits as well. Limiting Activities per second does not necessarily limit HTTP requests per second if each Activity makes multiple requests. More threads cannot bypass DB connection pools, HTTP quotas, history growth, or Temporal service limits. For the distinction between Workflow `Async`, asynchronous completion, and virtual threads, see [Java Concurrency](java-concurrency.md).

## Durable Batch Tables

A permanent batch table is often preferable to a database session-scoped temporary table. Activity B may use another connection or worker, and the data must survive retries and restarts. Temporary-table lifetime and visibility depend on the database and creation options; they do not universally mean "automatically deleted when the Workflow finishes."

An illustrative schema is:

| Table | Useful fields and constraints |
| --- | --- |
| `processing_batch` | `batch_id` primary key, unique stable `batch_key`, originating Workflow ID, selection/version, lifecycle status, timestamps, optional expiry |
| `processing_item` | unique `(batch_id, item_id)`, source version or snapshot reference, status, stable operation/idempotency key, compact outcome, timestamps |

Add claim/lease/fencing fields if multiple processors can act on the same row. Attempt counters and detailed response logs are optional application concerns; they are not replacements for Temporal's execution state. Persist large or sensitive HTTP responses only when there is a business need.

### Make Batch Preparation Retry-Safe

Pass a stable logical `batchKey` into `PrepareBatch`. Use a unique constraint and a transaction/upsert strategy so a retry after "commit succeeded, Activity completion was lost" finds or completes the same batch rather than creating another.

For incremental population, consumers must not see an incomplete batch as ready. Use an explicit preparing/ready state or another atomic publication mechanism.

A Workflow ID can be correlation metadata, but is not universally a sufficient batch key. Workflow IDs can be reused after closure, schedules create distinct executions, and Continue-As-New changes the Run ID. Choose a business operation ID or durable batch UUID with explicit scope, and carry it across retries and new Runs.

### A Status Column Does Not Make HTTP Exactly-Once

The remote request can succeed before `processing_item` is marked completed. If the worker crashes in that gap, the retry sees an unfinished row and may send the request again. Apply the [duplicate-safe external-effects rules](activities-and-failures.md#make-external-effects-duplicate-safe): keep a stable operation key and compatible request contents, and arrange downstream deduplication or explicit reconciliation.

The batch's unique constraints and preparation transaction solve local consistency problems. They do not make a local database, an HTTP service, and Temporal's completion acknowledgment one atomic transaction.

## Retention and Cleanup

Define the supported retry, reset, and recovery window using the [general external-data retention rules](data-and-history.md#own-retention-explicitly). Keep membership, snapshots, and referenced objects available for every supported operation, not just the first processing attempt.

Use a retention policy and a separate cleanup/reconciliation job. A final cleanup Activity is useful but insufficient: termination and some failures can prevent it from running. Database TTL is product-specific, and permanent tables can also be kept for audit subject to cost, privacy, and retention requirements.

## References and Scope

- [Java Workflow basics and logic requirements](https://docs.temporal.io/develop/java/workflows/basics)
- [Java Activity basics, parameters, and return values](https://docs.temporal.io/develop/java/activities/basics)
- [Java data handling](https://docs.temporal.io/develop/java/best-practices/data-handling)
- [Java Activity timeouts, retries, and heartbeat APIs](https://docs.temporal.io/develop/java/activities/timeouts)
- [Java Continue-As-New](https://docs.temporal.io/develop/java/workflows/continue-as-new)
- [External Storage](https://docs.temporal.io/external-storage)

The schema, batch keys, and architectural tradeoffs are recommendations derived from the execution model, not required Temporal structures. Java fragments were not compiled against a pinned application SDK. Page sizes, concurrency limits, and cleanup policies require workload-specific tests.
