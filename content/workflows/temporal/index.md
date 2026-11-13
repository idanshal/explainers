# Temporal Overview

Research checked: 2026-10-25

Temporal makes orchestration durable. It does not turn remote work into local method calls, make external side effects exactly-once, or remove the need for timeouts and data-lifecycle decisions.

Start here for the execution model and Activity boundaries. The principles are generic; examples throughout these articles use the Java SDK. Code fragments are illustrative, not complete applications.

## Orchestration Versus External Work

| Component | Responsibility |
| --- | --- |
| Workflow | Decide what happens next, coordinate work, handle results, wait durably |
| Activity | Perform external I/O or other work unsuitable for Workflow replay |
| Temporal Service | Persist execution history, dispatch tasks, enforce timeouts, schedule retries |
| Worker | Run registered Workflow and Activity implementations |
| Application database or object store | Own business data and any explicitly offloaded bulk data |

Keep database queries, HTTP calls, filesystem access, and other external I/O in Activities, not Workflow code. A replay reconstructs Workflow state from history; it does not normally rerun successfully completed Activities. Retried Activities are a different matter: their external work can execute again.

In Java Workflow code, use Temporal's clock, timers, random-number APIs, and concurrency primitives. Do not use native threads, `CompletableFuture`, direct configuration reads, or ordinary blocking I/O to control Workflow execution. Workflow code changes also need a replay-compatible deployment/versioning strategy.

## Activity Calls Pass Values, Not Shared References

An Activity stub looks like a Java method call, but it schedules work through Temporal. For an ordinary remote Activity, the conceptual path is:

```text
Workflow argument
    -> DataConverter -> encoded payload -> Temporal Service/history
    -> Activity worker -> decoded input
    -> Activity result -> DataConverter -> Temporal Service/history
    -> Workflow worker -> decoded result
```

The Activity might run in the same process, another process, or another host. None of those placements gives the caller shared Java object identity across the Activity boundary. Treat arguments and results as messages containing values.

### Mutating an Activity Argument Does Not Mutate the Workflow Object

Suppose `request` contains `status = "pending"`:

```java
activities.process(request);
```

If the Activity changes its decoded input to `status = "completed"`, that does not update the Workflow's `request`. Return the required result explicitly:

```java
ProcessResult result = activities.process(request);
```

The same rule applies between Activities: Activity B does not receive Activity A's live object reference. It receives a decoded representation of whatever the Workflow passes to it. Use value equality and stable IDs, not `==` or identity-based maps, to relate data across calls.

Also distinguish two different kinds of reference:

- **Java object reference:** a process-local identity that does not cross this boundary.
- **Business/storage reference:** a serializable ID, object key, or version that another Activity can resolve.

Do not use mutable Activity instance fields or static variables to pass business state between calls. Activities can run on different workers, retry after a crash, and execute concurrently on a shared implementation instance.

### Serializable Does Not Mean Java `Serializable`

Inputs, outputs, and explicit failure/heartbeat details must round-trip through the configured `DataConverter`. Java's default converter supports ordinary JSON-compatible objects through Jackson, along with other supported encodings; implementing `java.io.Serializable` is neither the requirement nor a guarantee.

Use small DTOs with stable schemas. Avoid passing ORM entities with lazy proxies, HTTP clients, streams, database connections, or framework-managed objects. Keep readers compatible with older payloads for as long as histories may be replayed. Custom converters/codecs must be configured compatibly on the participants that encode and decode the data.

## Topic Guides

| Reader goal | Guide |
| --- | --- |
| Bound Activity execution and handle failures safely | [Activities and Failures](activities-and-failures.md) |
| Control payloads, history growth, and external-data retention | [Data and History](data-and-history.md) |
| Process database rows or large datasets reliably | [Batch Processing](batch-processing.md) |
| Distinguish Workflow concurrency, asynchronous completion, and virtual threads | [Java Concurrency](java-concurrency.md) |
| Create and operate recurring Workflow starts | [Schedules](schedules.md) |

## Production Checklist

- Keep external I/O in Activities and Workflow code replay-compatible, following the execution boundaries above.
- [Bound retries and handle failures](activities-and-failures.md): choose realistic timeouts, heartbeat checkpointable work, handle cancellation, and make repeated effects safe.
- [Control data and history](data-and-history.md): keep payloads small, bound event counts, and own external-data retention.
- [Design batches deliberately](batch-processing.md): choose current-data versus snapshot semantics, bound concurrency, and make preparation and cleanup recoverable.
- [Use supported Java concurrency mechanisms](java-concurrency.md): do not confuse async orchestration or virtual threads with durable external execution.
- [Verify schedule semantics](schedules.md): check timing, overlap, and lifecycle behavior before changing recurring starts.

## References and Scope

- [Java Workflow basics and logic requirements](https://docs.temporal.io/develop/java/workflows/basics)
- [Java Activity basics, parameters, and return values](https://docs.temporal.io/develop/java/activities/basics)
- [Data conversion](https://docs.temporal.io/dataconversion)
- [Java data handling](https://docs.temporal.io/develop/java/best-practices/data-handling)

The research date records the source baseline, not a promise that every current SDK has identical defaults or APIs. Java fragments were not compiled against a pinned application SDK; check the topic guides for additional version and execution caveats.
