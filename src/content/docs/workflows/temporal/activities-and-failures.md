---
title: "Temporal Activities and Failures"
---

# Temporal Activities and Failures

Research checked: 2026-10-25

Activity reliability depends on timeouts, retries, heartbeats, cancellation, and duplicate-safe effects working together. For the execution model and serialized Activity boundaries, start with the [Temporal Overview](index.md).

Examples use the Java SDK and ordinary remote Activities unless stated otherwise. Timeout values are illustrative and must fit the workload.

## Activity Timeouts: Four Different Questions

| Setting | What it bounds | Practical role |
| --- | --- | --- |
| `StartToClose` | One attempt, from worker pickup to completion | Bound a single attempt and detect a lost worker |
| `ScheduleToClose` | The whole Activity Execution, including queueing, attempts, and retry backoff | Bound total time spent trying |
| `ScheduleToStart` | Queue wait for an individual Activity Task | Specialized queue-routing/outage requirement; usually monitor queue latency instead |
| `HeartbeatTimeout` | Time without a heartbeat received by the Service while the attempt is running | Detect lost or unresponsive long-running work sooner |

At least `StartToClose` or `ScheduleToClose` must be specified. If only `ScheduleToClose` is set, the Service uses it for `StartToClose` too. Explicitly setting `StartToClose` is recommended. `ScheduleToStart` timeouts are non-retryable: retrying would just put the task back into the same queue.

### Choose a Real Attempt Budget

Set `StartToClose` above the longest legitimate duration of one attempt, with headroom for expected variability. Do not set it to the normal or average duration if healthy attempts can take longer. Set a separate `ScheduleToClose` when there is an overall business deadline for retries.

For a long-running, checkpointable Activity, illustrative Java options are:

```java
ActivityOptions options = ActivityOptions.newBuilder()
    .setStartToCloseTimeout(Duration.ofMinutes(30))
    .setScheduleToCloseTimeout(Duration.ofHours(2))
    .setHeartbeatTimeout(Duration.ofSeconds(30))
    .build();
```

This allows up to 30 minutes per attempt, but at most two hours overall. With the default Activity Retry Policy, retryable failures can produce additional attempts within that budget. Queue waits and backoff consume the overall budget too.

Set HTTP connection/read/request deadlines and database query timeouts inside the Activity as well. Temporal timeouts do not replace downstream client timeouts.

### A Timeout Is Not a Process Kill

When the Service times out an attempt, the old Activity code may still be running. A retry can overlap it. Temporal cannot forcibly stop an arbitrary HTTP request, thread, or external job. Use cooperative cancellation where supported and protect side effects with idempotency or fencing.

## Heartbeats Complement Timeouts

**Heartbeats do not replace or extend `StartToClose`.** An Activity that heartbeats continuously still times out when its attempt budget expires. Heartbeats do not extend `ScheduleToClose` either.

For example, with the options above:

- A healthy attempt can run for up to 30 minutes while heartbeating.
- If its worker crashes, missing heartbeats can trigger a retry after roughly the heartbeat timeout, rather than waiting out 30 minutes.
- If it keeps heartbeating but never finishes, `StartToClose` still bounds the attempt.

### Heartbeats Can Carry Restart Checkpoints

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

Here the checkpoint means "the next chunk to process." On retry, application code must read the checkpoint and resume explicitly. Temporal does not resume the Java stack at the interrupted line.

The SDK throttles heartbeat transmission. A crash can lose the latest locally recorded checkpoint, and a side effect can succeed before its checkpoint reaches the Service. Reprocessing a chunk must therefore be safe.

For remote Activities, heartbeat responses also deliver cancellation requests. Cancellation is cooperative, and throttling can delay delivery. Do not swallow cancellation exceptions and continue processing indefinitely. Local Activities do not support heartbeat-based failure detection.

### When Heartbeats Are Not the Answer

| Situation | Better approach |
| --- | --- |
| Large input/output payload | [Reduce or offload data](data-and-history.md); heartbeats do not solve payload size |
| Quick HTTP request | Short, realistic client deadlines and `StartToClose`; usually no heartbeat loop needed |
| Many hours of checkpointable processing | Long-enough attempt budget plus heartbeats, or split into bounded chunks |
| External job that runs independently | Submit and poll with Activities plus Workflow timers, or use [asynchronous completion](java-concurrency.md#asynchronous-activity-completion) |
| Indefinite wait for an external event | Consider a Workflow Signal/Update and durable wait rather than holding an Activity thread |

A background heartbeat timer can show that a process is alive while its real work is stuck. Tie progress checkpoints to actual completed work, and use downstream timeouts or explicit stall detection rather than assuming a heartbeat proves useful progress.

## Exceptions Cross a Failure-Conversion Boundary

"Exceptions must be serializable" is incomplete. Temporal serializes a structured **Failure**, not an arbitrary live Java exception object. The SDK's failure converter handles that translation.

For an ordinary Java Activity exception, the SDK normally creates an `ApplicationFailure` containing the exception type name, message, stack trace, and converted cause. Custom exception fields are not automatically preserved as business details. The Workflow normally receives an `ActivityFailure` whose cause is the underlying `ApplicationFailure` or `TimeoutFailure`, once retries have ended. Do not expect to catch the original custom Java exception class in the Workflow.

Use explicit, small, converter-compatible details when the caller needs structured information. For example, a permanent validation error can be reported inside an Activity as:

```java
throw ApplicationFailure.newNonRetryableFailure(
    "Item failed validation",
    "INVALID_ITEM",
    itemId);
```

The Workflow can catch `ActivityFailure`, inspect its cause, and use `ApplicationFailure.getType()` and `getDetails()` to decide what to do.

| Failure | Typical policy |
| --- | --- |
| Temporary network problem, rate limit, retryable service error | Retry with bounded backoff/deadline; coordinate with downstream retry behavior |
| Invalid business input that will not improve on retry | Explicit non-retryable application failure or matching retry-policy exclusion |
| Timeout with unknown external outcome | Retry only with duplicate-safe side effects or reconciliation |
| Cancellation | Propagate or handle intentionally; do not turn it into an ordinary retryable error |

Activities have a default Retry Policy. Workflow Executions do not retry by default. In Java, an ordinary unexpected exception thrown directly by Workflow code generally fails the **Workflow Task**, which is retried, rather than closing the entire Workflow Execution. Use intentional Temporal failures or configured failure types when the Workflow should fail.

Keep messages and details small and free of credentials or unnecessary personal data. Failure messages/stack traces need their own encoding configuration if you require them to be encrypted; encrypting ordinary payloads alone is not a blanket guarantee for all failure metadata.

## Make External Effects Duplicate-Safe

Consider this failure sequence:

1. The Activity sends a request; the remote service applies it.
2. The worker crashes before recording success or reporting Activity completion.
3. Temporal retries, and the external request executes again.

A unique database row or a `processing` flag cannot eliminate this window. A local database transaction does not ordinarily cover the remote HTTP service and Temporal's completion acknowledgment.

Prefer a stable idempotency key accepted and durably deduplicated by the remote service. Use the **same key for the same logical effect across retries**, not a new key per attempt. Ensure the request contents remain compatible and the recipient's deduplication retention covers possible retries. If the remote system cannot deduplicate, design outcome lookup/reconciliation, fencing where applicable, or compensation; do not claim exactly-once effects.

[Batch Processing](batch-processing.md) applies these rules to durable batch preparation, per-item processing, and recovery.

## References and Scope

- [Detecting Activity failures: timeouts and heartbeats](https://docs.temporal.io/encyclopedia/detecting-activity-failures)
- [Java Activity timeouts, retries, and heartbeat APIs](https://docs.temporal.io/develop/java/activities/timeouts)
- [Temporal Failures reference](https://docs.temporal.io/references/failures)
- [Java Workflow basics and logic requirements](https://docs.temporal.io/develop/java/workflows/basics)

Java fragments were not compiled against a pinned application SDK. Timeout values and idempotency strategies are application design choices, not universal Temporal settings.
