---
title: "Temporal Data and History"
---

# Temporal Data and History

Research checked: 2026-10-25

Activity inputs and successful results are recorded in the parent Workflow's history. Large payloads increase conversion cost, network traffic, persistence, history retrieval, and replay overhead. Small payloads still create many events when the Workflow orchestrates a very large number of Activities.

For serialization and value boundaries, start with the [Temporal Overview](index.md). For an application design that passes IDs instead of bulk rows, see [Batch Processing](batch-processing.md).

## Keep Payloads and Event Counts Bounded

Relevant documented Cloud limits at the research baseline include:

| Resource | Documented limit or threshold |
| --- | --- |
| Payload/blob size | 2 MB; the limits page also describes this as a single-request payload limit |
| gRPC message | 4 MB total, not permission to send multiple near-limit payloads safely |
| History transaction | 4 MB across the events in that transaction |
| Workflow Run history | 51,200 events or 50 MB; warnings after 10,240 events or 10 MB |

These are safety limits, not recommended operating targets. Measure encoded payloads and leave ample headroom. Check current Cloud limits and your deployment's configuration, especially when self-hosting.

Reducing payload size does not eliminate scheduling and history overhead. Bound fan-out and the number of Activities coordinated by each Run, not just the size of each result. Heartbeats detect progress or carry checkpoints; they do not solve oversized inputs or outputs.

## Continue-As-New

Use **Continue-As-New** before a long batch-processing Workflow accumulates too much history. It creates a new Run with fresh history, so carry forward only the small state needed to resume, such as a batch ID, cursor, and aggregate counts.

Wait for outstanding work to finish before continuing; Continue-As-New is not a way to transfer in-flight Activities to the next Run. External data referenced by the new Run still needs its own lifecycle policy.

## External Payload Storage

Passing a durable storage reference can keep bulk data out of history. An application can design its own batch table or immutable object/version scheme. Those are application-level architectural choices, not mandatory Temporal schemas.

Temporal also documents SDK-level external payload storage. At the research baseline, that feature was **Public Preview**; it is distinct from designing an application batch table. Verify SDK support and current preview status before adopting it.

An offloaded payload still needs compatible readers and durable storage. Replacing a payload with a reference does not make an evicting cache a safe source of historical data.

## Own Retention Explicitly

Keep external data available for the full processing/retry/recovery window. If an old reference can be used by a reset or another recovery mechanism, either retain the data for that use or explicitly rule it out.

For SDK-offloaded payloads, the official guidance at the research baseline is to retain data for the full Workflow lifetime plus the namespace retention period, because history can still reference it. Application batch tables need a similarly explicit policy based on how their references are used.

Retention must account for references carried across Continue-As-New and any supported recovery operations. A Workflow's final cleanup step is not a complete lifecycle policy: termination or failure can prevent it from running. See [Batch Processing](batch-processing.md#retention-and-cleanup) for batch-specific cleanup and reconciliation.

## References and Scope

- [Java Activity basics, parameters, and return values](https://docs.temporal.io/develop/java/activities/basics)
- [Temporal Cloud system limits](https://docs.temporal.io/cloud/limits)
- [Java Continue-As-New](https://docs.temporal.io/develop/java/workflows/continue-as-new)
- [Data conversion](https://docs.temporal.io/dataconversion)
- [Java data handling](https://docs.temporal.io/develop/java/best-practices/data-handling)
- [External Storage](https://docs.temporal.io/external-storage)

Limits and preview status can change. Match the documentation to your deployment and SDK. Storage schemas and retention decisions remain application responsibilities.
