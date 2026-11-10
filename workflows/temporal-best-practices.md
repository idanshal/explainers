# Temporal Best Practices: Activities, Data, Retries, and Schedules

Research checked: 2026-10-25

Temporal makes orchestration durable. It does not turn remote work into local
method calls, make external side effects exactly-once, or remove the need for
timeouts and data-lifecycle decisions.

This guide focuses on Workflows orchestrating Activities. The principles are
generic; API examples use the Java SDK. Examples are illustrative fragments, not
a complete application. Timeout values and batch sizes must fit your workload.

## 1. The mental model: orchestration versus external work

| Component | Responsibility |
| --- | --- |
| Workflow | Decide what happens next, coordinate work, handle results, wait durably |
| Activity | Perform external I/O or other work unsuitable for Workflow replay |
| Temporal Service | Persist execution history, dispatch tasks, enforce timeouts, schedule retries |
| Worker | Run registered Workflow and Activity implementations |
| Application database or object store | Own business data and any explicitly offloaded bulk data |

Keep database queries, HTTP calls, filesystem access, and other external I/O in
Activities, not Workflow code. A replay reconstructs Workflow state from history;
it does not normally rerun successfully completed Activities. Retried Activities
are a different matter: their external work can execute again. [1][2]

In Java Workflow code, use Temporal's clock, timers, random-number APIs, and
concurrency primitives. Do not use native threads, `CompletableFuture`, direct
configuration reads, or ordinary blocking I/O to control Workflow execution.
Workflow code changes also need a replay-compatible deployment/versioning strategy.
[1]

## 2. "Over the wire" means values, not shared object references

An Activity stub looks like a Java method call, but it schedules work through
Temporal. For an ordinary remote Activity, the conceptual path is:

```text
Workflow argument
    -> DataConverter -> encoded payload -> Temporal Service/history
    -> Activity worker -> decoded input
    -> Activity result -> DataConverter -> Temporal Service/history
    -> Workflow worker -> decoded result
```

The Activity might run in the same process, another process, or another host.
None of those placements gives the caller shared Java object identity across the
Activity boundary. Treat arguments and results as messages containing values.
[2][3]

### Mutating an Activity argument does not mutate the Workflow object

Suppose `request` contains `status = "pending"`:

```java
activities.process(request);
```

If the Activity changes its decoded input to `status = "completed"`, that does
not update the Workflow's `request`. Return the required result explicitly:

```java
ProcessResult result = activities.process(request);
```

The same rule applies between Activities: Activity B does not receive Activity
A's live object reference. It receives a decoded representation of whatever the
Workflow passes to it. Use value equality and stable IDs, not `==` or identity-based
maps, to relate data across calls.

Also distinguish two different kinds of reference:

- **Java object reference:** a process-local identity that does not cross this boundary.
- **Business/storage reference:** a serializable ID, object key, or version that another Activity can resolve.

Do not use mutable Activity instance fields or static variables to pass business
state between calls. Activities can run on different workers, retry after a crash,
and execute concurrently on a shared implementation instance.

### Serializable does not mean Java `Serializable`

Inputs, outputs, and explicit failure/heartbeat details must round-trip through
the configured `DataConverter`. Java's default converter supports ordinary
JSON-compatible objects through Jackson, along with other supported encodings;
implementing `java.io.Serializable` is neither the requirement nor a guarantee.
[2][3]

Use small DTOs with stable schemas. Avoid passing ORM entities with lazy proxies,
HTTP clients, streams, database connections, or framework-managed objects. Keep
readers compatible with older payloads for as long as histories may be replayed.
Custom converters/codecs must be configured compatibly on the participants that
encode and decode the data.

## 3. Activity timeouts: four different questions

| Setting | What it bounds | Practical role |
| --- | --- | --- |
| `StartToClose` | One attempt, from worker pickup to completion | Bound a single attempt and detect a lost worker |
| `ScheduleToClose` | The whole Activity Execution, including queueing, attempts, and retry backoff | Bound total time spent trying |
| `ScheduleToStart` | Queue wait for an individual Activity Task | Specialized queue-routing/outage requirement; usually monitor queue latency instead |
| `HeartbeatTimeout` | Time without a heartbeat received by the Service while the attempt is running | Detect lost or unresponsive long-running work sooner |

At least `StartToClose` or `ScheduleToClose` must be specified. If only
`ScheduleToClose` is set, the Service uses it for `StartToClose` too. Explicitly
setting `StartToClose` is recommended. `ScheduleToStart` timeouts are non-retryable:
retrying would just put the task back into the same queue. [4][5]

### Choose a real attempt budget

Set `StartToClose` above the longest legitimate duration of one attempt, with
headroom for expected variability. Do not set it to the normal or average duration
if healthy attempts can take longer. Set a separate `ScheduleToClose` when there
is an overall business deadline for retries.

For a long-running, checkpointable Activity, illustrative Java options are:

```java
ActivityOptions options = ActivityOptions.newBuilder()
    .setStartToCloseTimeout(Duration.ofMinutes(30))
    .setScheduleToCloseTimeout(Duration.ofHours(2))
    .setHeartbeatTimeout(Duration.ofSeconds(30))
    .build();
```

This allows up to 30 minutes per attempt, but at most two hours overall. With the
default Activity Retry Policy, retryable failures can produce additional attempts
within that budget. Queue waits and backoff consume the overall budget too.

Set HTTP connection/read/request deadlines and database query timeouts inside the
Activity as well. Temporal timeouts do not replace downstream client timeouts.

### A timeout is not a process kill

When the Service times out an attempt, the old Activity code may still be running.
A retry can overlap it. Temporal cannot forcibly stop an arbitrary HTTP request,
thread, or external job. Use cooperative cancellation where supported and protect
side effects with idempotency or fencing. [4]

## 4. Long-running Activities: heartbeat AND timeout

**Heartbeats complement `StartToClose`; they do not replace or extend it.** An
Activity that heartbeats continuously still times out when its attempt budget
expires. Heartbeats do not extend `ScheduleToClose` either. [4][5]

For example, with the options above:

- A healthy attempt can run for up to 30 minutes while heartbeating.
- If its worker crashes, missing heartbeats can trigger a retry after roughly the heartbeat timeout, rather than waiting out 30 minutes.
- If it keeps heartbeating but never finishes, `StartToClose` still bounds the attempt.

### Heartbeats can carry restart checkpoints

Inside a Java Activity:

```java
ActivityExecutionContext context = Activity.getExecutionContext();
long nextOffset = context.getHeartbeatDetails(Long.class).orElse(0L);

while (hasMore(nextOffset)) {
    processChunkIdempotently(nextOffset);
    nextOffset = nextOffset + 1;
    context.heartbeat(nextOffset);
}
```

Here the checkpoint means "the next chunk to process." On retry, application code
must read the checkpoint and resume explicitly. Temporal does not resume the Java
stack at the interrupted line. [5]

The SDK throttles heartbeat transmission. A crash can lose the latest locally
recorded checkpoint, and a side effect can succeed before its checkpoint reaches
the Service. Reprocessing a chunk must therefore be safe.

For remote Activities, heartbeat responses also deliver cancellation requests.
Cancellation is cooperative, and throttling can delay delivery. Do not swallow
cancellation exceptions and continue processing indefinitely. Local Activities do
not support heartbeat-based failure detection. [4][5]

### When heartbeats are not the answer

| Situation | Better approach |
| --- | --- |
| Large input/output payload | Reduce or offload data; heartbeats do not solve payload size |
| Quick HTTP request | Short, realistic client deadlines and `StartToClose`; usually no heartbeat loop needed |
| Many hours of checkpointable processing | Long-enough attempt budget plus heartbeats, or split into bounded chunks |
| External job that runs independently | Submit and poll with Activities plus Workflow timers, or use asynchronous completion |
| Indefinite wait for an external event | Consider a Workflow Signal/Update and durable wait rather than holding an Activity thread |

A background heartbeat timer can show that a process is alive while its real work
is stuck. Tie progress checkpoints to actual completed work, and use downstream
timeouts or explicit stall detection rather than assuming a heartbeat proves
useful progress.

## 5. Exceptions cross a failure-conversion boundary

"Exceptions must be serializable" is incomplete. Temporal serializes a structured
**Failure**, not an arbitrary live Java exception object. The SDK's failure
converter handles that translation. [6]

For an ordinary Java Activity exception, the SDK normally creates an
`ApplicationFailure` containing the exception type name, message, stack trace,
and converted cause. Custom exception fields are not automatically preserved as
business details. The Workflow normally receives an `ActivityFailure` whose cause
is the underlying `ApplicationFailure` or `TimeoutFailure`, once retries have
ended. Do not expect to catch the original custom Java exception class in the
Workflow. [6]

Use explicit, small, converter-compatible details when the caller needs structured
information. For example, a permanent validation error can be reported inside an
Activity as:

```java
throw ApplicationFailure.newNonRetryableFailure(
    "Item failed validation",
    "INVALID_ITEM",
    itemId);
```

The Workflow can catch `ActivityFailure`, inspect its cause, and use
`ApplicationFailure.getType()` and `getDetails()` to decide what to do.

| Failure | Typical policy |
| --- | --- |
| Temporary network problem, rate limit, retryable service error | Retry with bounded backoff/deadline; coordinate with downstream retry behavior |
| Invalid business input that will not improve on retry | Explicit non-retryable application failure or matching retry-policy exclusion |
| Timeout with unknown external outcome | Retry only with duplicate-safe side effects or reconciliation |
| Cancellation | Propagate or handle intentionally; do not turn it into an ordinary retryable error |

Activities have a default Retry Policy. Workflow Executions do not retry by
default. In Java, an ordinary unexpected exception thrown directly by Workflow
code generally fails the **Workflow Task**, which is retried, rather than closing
the entire Workflow Execution. Use intentional Temporal failures or configured
failure types when the Workflow should fail. [5][6]

Keep messages and details small and free of credentials or unnecessary personal
data. Failure messages/stack traces need their own encoding configuration if you
require them to be encrypted; encrypting ordinary payloads alone is not a blanket
guarantee for all failure metadata. [6]

## 6. Keep Activity I/O small, but also control event count

Activity inputs and successful results are recorded in the parent Workflow's
history. Large payloads increase conversion cost, network traffic, persistence,
history retrieval, and replay overhead. Small payloads still create many events
when the Workflow orchestrates a very large number of Activities. [2][7]

Relevant documented Cloud limits include:

| Resource | Documented limit or threshold |
| --- | --- |
| Payload/blob size | 2 MB; the limits page also describes this as a single-request payload limit |
| gRPC message | 4 MB total, not permission to send multiple near-limit payloads safely |
| History transaction | 4 MB across the events in that transaction |
| Workflow Run history | 51,200 events or 50 MB; warnings after 10,240 events or 10 MB |

These are safety limits, not recommended operating targets. Measure encoded
payloads and leave ample headroom. Check your deployment's configuration, especially
when self-hosting. [7]

Use **Continue-As-New** before a long batch-processing Workflow accumulates too
much history. It creates a new Run with fresh history, so carry forward only the
small state needed to resume, such as a batch ID, cursor, and aggregate counts.
Wait for outstanding work to finish before continuing; Continue-As-New is not a
way to transfer in-flight Activities to the next Run. [8]

## 7. Model "fetch rows, then make HTTP calls" deliberately

### Option A: page existing data, pass IDs

```text
Workflow
  -> FetchPage(query, cursor, pageSize)
       returns { itemIds, nextCursor }
  -> ProcessItem(itemId) for each ID, with bounded concurrency
       reads the needed row, makes HTTP request, returns a small summary
  -> repeat, periodically Continue-As-New if necessary
```

This is a good starting point when the existing database already contains the
data and you do not need an immutable snapshot. Do not copy an entire dataset to
another table merely because Activities cannot share object references.

Use stable ordering and a suitable cursor or watermark. Offset pagination over
changing data can skip or duplicate rows. Even keyset pagination is not an
immutable snapshot unless the selection/versioning rules make it one.

### Option B: materialize a durable batch, pass a batch ID

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

This is a valid external-storage/reference pattern when you need stable membership,
auditability, restartability outside one Activity attempt, or a dataset too large
for history. It is an architectural choice, not a Temporal requirement or a
guarantee of production readiness. Temporal also documents SDK-level external
payload storage; that feature is currently **Public Preview**, and is distinct
from designing an application batch table. Verify SDK support and preview status
before adopting it. [3][9]

Returning only `batchId` does not tell the Workflow which items exist. It still
needs bounded page reads, known shard descriptors, or chunk-processing Activities.
Do not assume item IDs are contiguous integers from `1` to `N`.

### Decide whether consumers need fresh data or a snapshot

| Reference design | What a later Activity reads | Tradeoff |
| --- | --- | --- |
| Existing row ID | Current row at read time | Simple, but data can change or disappear between attempts |
| Batch membership plus row ID | Fixed membership, possibly current row contents | Stable selection does not imply stable contents |
| Batch snapshot or immutable object/version | The selected historical content | Reproducible processing, with extra storage and lifecycle management |

"A retry can fetch fresh data" is not always an advantage. If a repeated HTTP
request uses the same idempotency key but a changed request body, the recipient may
reject it or apply unintended semantics. Choose and document the consistency model.

### Per-item versus per-chunk Activities

- **Per item:** independent retries and clear outcomes, but more scheduling/history overhead.
- **Per chunk:** less overhead, but retry can revisit already-processed items; heartbeat a cursor and make each item's effect duplicate-safe.
- **Child Workflows:** useful for independently managed partitions; keep the parent's fan-out and history bounded too.

Pagination is not streaming bulk rows through Workflow memory. The bulk data stays
in the external system, and the Workflow orchestrates bounded units of work.

## 8. Permanent tables are valid; lifecycle and idempotency matter

A permanent batch table is often preferable to a database session-scoped temporary
table. Activity B may use another connection or worker, and the data must survive
retries and restarts. Temporary-table lifetime and visibility depend on the
database and creation options; they do not universally mean "automatically deleted
when the Workflow finishes."

An illustrative schema is:

| Table | Useful fields and constraints |
| --- | --- |
| `processing_batch` | `batch_id` primary key, unique stable `batch_key`, originating Workflow ID, selection/version, lifecycle status, timestamps, optional expiry |
| `processing_item` | unique `(batch_id, item_id)`, source version or snapshot reference, status, stable operation/idempotency key, compact outcome, timestamps |

Add claim/lease/fencing fields if multiple processors can act on the same row.
Attempt counters and detailed response logs are optional application concerns;
they are not replacements for Temporal's execution state. Persist large or
sensitive HTTP responses only when there is a business need.

### Make batch preparation retry-safe

Pass a stable logical `batchKey` into `PrepareBatch`. Use a unique constraint and a
transaction/upsert strategy so a retry after "commit succeeded, Activity completion
was lost" finds or completes the same batch rather than creating another.

For incremental population, consumers must not see an incomplete batch as ready.
Use an explicit preparing/ready state or another atomic publication mechanism.

A Workflow ID can be correlation metadata, but is not universally a sufficient
batch key. Workflow IDs can be reused after closure, schedules create distinct
executions, and Continue-As-New changes the Run ID. Choose a business operation ID
or durable batch UUID with explicit scope, and carry it across retries and new Runs.

### A status column does not make HTTP exactly-once

Consider this failure sequence:

1. The Activity sends a request; the remote service applies it.
2. The worker crashes before recording `completed` or reporting Activity completion.
3. Temporal retries, and the row still appears unfinished.

A unique database row or a `processing` flag cannot eliminate this window. A local
database transaction does not ordinarily cover the remote HTTP service and
Temporal's completion acknowledgment.

Prefer a stable idempotency key accepted and durably deduplicated by the remote
service. Use the **same key for the same logical effect across retries**, not a new
key per attempt. Ensure the request contents remain compatible and the recipient's
deduplication retention covers possible retries. If the remote system cannot
deduplicate, design outcome lookup/reconciliation, fencing where applicable, or
compensation; do not claim exactly-once effects.

### Own retention explicitly

Keep external data available for the full processing/retry/recovery window. If an
old reference can be used by a reset or another recovery mechanism, either retain
the data for that use or explicitly rule it out.

For SDK-offloaded payloads, the official guidance is to retain data for the full
Workflow lifetime plus the namespace retention period, because history can still
reference it. An evicting cache is not a durable substitute. Application batch
tables need a similarly explicit policy based on how their references are used. [9]

Use a retention policy and a separate cleanup/reconciliation job. A final cleanup
Activity is useful but insufficient: termination and some failures can prevent it
from running. Database TTL is product-specific, and permanent tables can also be
kept for audit subject to cost, privacy, and retention requirements.

## 9. Java async patterns: three distinct mechanisms

| Mechanism | Use it for | What it does not mean |
| --- | --- | --- |
| Workflow `Async` and `Promise` | Concurrent orchestration of Activities/Child Workflows | Permission to run ordinary threaded I/O in Workflow code |
| Asynchronous Activity Completion | Activity work completed later by a callback or another component | Automatically durable background threads or unlimited Activity lifetime |
| SDK virtual threads | JVM execution-thread efficiency on supported JDK/SDK versions | Unlimited downstream capacity, extra durability, or changed determinism rules |

### Concurrent orchestration

Inside Workflow code, a bounded page can be processed concurrently:

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

Here `pageIds` must already be capped at the desired concurrency. Waiting for one
bounded group before fetching the next is simple; a rolling window can improve
utilization. Choose an explicit failure policy: the fragment lets an unhandled
Activity failure propagate rather than classifying each failed item. [1]

Apply worker concurrency limits and downstream rate limits as well. Limiting
Activities per second does not necessarily limit HTTP requests per second if each
Activity makes multiple requests. More threads cannot bypass DB connection pools,
HTTP quotas, history growth, or Temporal service limits.

### Asynchronous Activity Completion

In Java, an Activity can capture its task token, call
`ActivityExecutionContext.doNotCompleteOnReturn()`, and let another component use
`ActivityCompletionClient` to heartbeat, complete, or fail it later. [10]

The Activity remains open after its method returns, and Activity timeouts still
apply. The external component must manage correlation, retries, heartbeats when
configured, and duplicate/stale callbacks. Treat task tokens as sensitive. An
in-memory executor job launched by the Activity is not made durable by this API;
persist the handoff or use a durable external execution system when necessary.

For an independently durable job, another clear design is: submit in an Activity,
return a job ID, then poll status using Activities separated by Workflow timers.
A callback Signal is another option when correlation and duplicate handling are
designed explicitly.

### Native virtual-thread support

**Yes, the Java SDK has opt-in native virtual-thread support on JDK 21+.** The
official SDK source exposes two different configuration surfaces: [11][12]

```java
WorkerFactoryOptions factoryOptions = WorkerFactoryOptions.newBuilder()
    .setUsingVirtualWorkflowThreads(true)
    .build();

WorkerOptions workerOptions = WorkerOptions.newBuilder()
    .setUsingVirtualThreadsOnActivityWorker(true)
    .build();
```

Pass the factory options to `WorkerFactory.newInstance(client, factoryOptions)`
and the worker options to `factory.newWorker(taskQueue, workerOptions)`.

`setUsingVirtualWorkflowThreads` controls SDK-managed Workflow execution threads.
The factory source documents it as disabled by default and notes that enabling it
causes `maxWorkflowThreadCount` to be ignored. Worker options separately expose
`setUsingVirtualThreads(boolean)` for task executors and more targeted switches,
including Workflow Task and Activity task executors. These similarly named
settings are not interchangeable. [11][12]

These APIs were verified in the tagged **Java SDK 1.31.0** source, where they are
marked `@Experimental`; this is not a claim that 1.31.0 introduced them or that
they remain experimental in every later release. Check API availability and
stability against your pinned SDK release before adopting them. Load-test your
JDK, HTTP/DB libraries, worker slots, connection pools, and memory behavior.
Virtual threads are especially relevant to blocking I/O; they do not make
CPU-heavy work faster or authorize `Thread.startVirtualThread` inside Workflow code.

## 10. Schedules: use the current `temporal` CLI

`tctl` is deprecated and no longer actively supported. Its underscore-style flags
must not be copied unchanged into the current CLI. Prefer the documented
`temporal schedule` commands. [13][14]

The commands below are examples only. They assume an installed CLI, a configured
endpoint/authentication context, an existing namespace, and compatible workers
polling the task queue. No schedule needs to be created or deleted to read this
guide.

### Create a Schedule every 48 hours

This example runs a registered `CustomerSyncWorkflow` on the `customer-sync-tasks`
task queue every 48 hours (`172800` seconds), with an explicit overlap policy.
The namespace, Workflow Type, and task queue are example values; substitute your
own consistently:

```bash
temporal schedule create \
  --namespace example-namespace \
  --schedule-id customer-sync \
  --interval 48h \
  --workflow-id customer-sync \
  --type CustomerSyncWorkflow \
  --task-queue customer-sync-tasks \
  --overlap-policy Skip
```

Important distinctions:

- `--schedule-id` identifies the Schedule, not a Workflow Run.
- `--workflow-id` supplies the base Workflow ID; scheduled executions get an action-timestamp suffix.
- `--type` must match the registered Workflow Type; `--task-queue` must match worker polling.
- Supply `--input` or `--input-file` if the Workflow requires arguments.
- Intervals are aligned to the Unix epoch by default, not "48 hours after creation" or "48 hours after the previous completion."
- A 48-hour interval is not necessarily the same as a local-calendar rule across daylight-saving changes. Use calendar/time-zone specifications when that is the real requirement.

`Skip` is the default overlap policy: if the preceding scheduled Workflow is still
open, the new action is skipped. Choose `BufferOne` if one delayed follow-up run is
desired, or another policy deliberately. `AllowAll` permits concurrent runs and
requires data isolation or duplicate-safe processing. Configure catchup behavior
for outages and consider jitter for fleets of Schedules. [14][15]

### Inspect before changing or deleting

```bash
temporal schedule describe \
  --namespace example-namespace \
  --schedule-id customer-sync
```

Inspect the next action times, Workflow Type, task queue, inputs, and policies.
Consult the installed CLI's `--help` because flags can vary by release. The current
CLI reference describes `schedule update` as a full replacement: omitted options
reset to defaults, so do not treat it as a partial patch. [14]

### Delete a Schedule

To delete the same Schedule created above:

```bash
temporal schedule delete \
  --namespace example-namespace \
  --schedule-id customer-sync
```

**Deleting a Schedule does not cancel or terminate Workflow Executions it already
started.** Handle those executions separately if needed. To stop automatic starts
temporarily without deleting the configuration, use Schedule pause controls;
pausing also leaves already-started Workflows running. [14][15]

## 11. Production checklist

- Keep external I/O in Activities and Workflow code replay-compatible.
- Treat Activity boundaries as serialized value boundaries, never shared references.
- Set a realistic `StartToClose`; use `ScheduleToClose` to bound the overall retry budget.
- Heartbeat long-running work, checkpoint deliberately, and handle cancellation cooperatively.
- Assume an Activity attempt can execute again, including after an ambiguous external success.
- Convert failures intentionally; use stable types and small explicit details.
- Keep payloads small and bound concurrency, event count, and downstream request rate.
- Choose current-data versus snapshot semantics before adopting ID-only messages.
- Make batch preparation and external side effects retry-safe independently.
- Own external-data retention, cleanup, and recovery behavior.
- Use Temporal async APIs inside Workflows; enable virtual threads only through supported SDK configuration.
- Verify Schedule timing and overlap policies, and use current CLI flag names.

## References and research scope

The official documentation and SDK source below were consulted directly. Context7
and the Temporal documentation search integration could not be loaded in this
session, so no claim is made that either integration verified this guide. The
batch schemas, timeout values, and architectural tradeoffs are recommendations
derived from the documented execution model, not prescribed Temporal schemas.
Java fragments were not compiled against a pinned application SDK, and CLI
examples were not executed against a Temporal Service.

1. [Java Workflow basics and logic requirements](https://docs.temporal.io/develop/java/workflows/basics)
2. [Java Activity basics, parameters, and return values](https://docs.temporal.io/develop/java/activities/basics)
3. [Data conversion](https://docs.temporal.io/dataconversion) and [Java data handling](https://docs.temporal.io/develop/java/best-practices/data-handling)
4. [Detecting Activity failures: timeouts and heartbeats](https://docs.temporal.io/encyclopedia/detecting-activity-failures)
5. [Java Activity timeouts, retries, and heartbeat APIs](https://docs.temporal.io/develop/java/activities/timeouts)
6. [Temporal Failures reference](https://docs.temporal.io/references/failures)
7. [Temporal Cloud system limits](https://docs.temporal.io/cloud/limits)
8. [Java Continue-As-New](https://docs.temporal.io/develop/java/workflows/continue-as-new)
9. [External Storage](https://docs.temporal.io/external-storage)
10. [Java Asynchronous Activity Completion](https://docs.temporal.io/develop/java/asynchronous-activity-completion)
11. [Java SDK 1.31.0 source: WorkerFactoryOptions](https://github.com/temporalio/sdk-java/blob/v1.31.0/temporal-sdk/src/main/java/io/temporal/worker/WorkerFactoryOptions.java)
12. [Java SDK 1.31.0 source: WorkerOptions](https://github.com/temporalio/sdk-java/blob/v1.31.0/temporal-sdk/src/main/java/io/temporal/worker/WorkerOptions.java)
13. [Legacy tctl reference and deprecation notice](https://docs.temporal.io/tctl-v1)
14. [Temporal CLI Schedule command reference](https://docs.temporal.io/cli/schedule)
15. [Schedule semantics: timing, IDs, pause, and policies](https://docs.temporal.io/schedule)