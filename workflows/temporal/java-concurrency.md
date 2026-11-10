# Java Concurrency in Temporal

Research checked: 2026-10-25

Workflow concurrency, asynchronous Activity completion, and virtual threads solve different problems. None permits arbitrary threaded I/O inside Workflow code or makes an in-memory background job durable. Start with the [Temporal Overview](README.md) for replay and execution boundaries.

## Three Distinct Mechanisms

| Mechanism | Use it for | What it does not mean |
| --- | --- | --- |
| Workflow `Async` and `Promise` | Concurrent orchestration of Activities/Child Workflows | Permission to run ordinary threaded I/O in Workflow code |
| Asynchronous Activity Completion | Activity work completed later by a callback or another component | Automatically durable background threads or unlimited Activity lifetime |
| SDK virtual threads | JVM execution-thread efficiency on supported JDK/SDK versions | Unlimited downstream capacity, extra durability, or changed determinism rules |

## Concurrent Workflow Orchestration

Use the Java SDK's Workflow concurrency primitives rather than native threads or `CompletableFuture` to coordinate concurrent work from Workflow code. `Async` schedules concurrent Workflow work, and `Promise` represents its result; external I/O still belongs in Activities.

Bound concurrency instead of launching one operation per row in an unbounded dataset. [Batch Processing](batch-processing.md#bound-concurrent-processing) contains the canonical `Async.function` and `Promise.allOf` example for a capped page of item IDs.

Workflow concurrency limits, worker slots, downstream connection pools, and request quotas constrain different parts of execution. A higher thread count does not remove any of those boundaries.

## Asynchronous Activity Completion

In Java, an Activity can capture its task token, call `ActivityExecutionContext.doNotCompleteOnReturn()`, and let another component use `ActivityCompletionClient` to heartbeat, complete, or fail it later.

The Activity remains open after its method returns, and [Activity timeouts](activities-and-failures.md#activity-timeouts-four-different-questions) still apply. The external component must manage correlation, retries, heartbeats when configured, and duplicate/stale callbacks. Treat task tokens as sensitive. An in-memory executor job launched by the Activity is not made durable by this API; persist the handoff or use a durable external execution system when necessary.

For an independently durable job, another clear design is: submit in an Activity, return a job ID, then poll status using Activities separated by Workflow timers. A callback Signal is another option when correlation and duplicate handling are designed explicitly.

## Native Virtual-Thread Support

The Java SDK has opt-in native virtual-thread support on JDK 21+. The tagged Java SDK **1.31.0** source exposes two different configuration surfaces:

```java
WorkerFactoryOptions factoryOptions = WorkerFactoryOptions.newBuilder()
    .setUsingVirtualWorkflowThreads(true)
    .build();

WorkerOptions workerOptions = WorkerOptions.newBuilder()
    .setUsingVirtualThreadsOnActivityWorker(true)
    .build();
```

Pass the factory options to `WorkerFactory.newInstance(client, factoryOptions)` and the worker options to `factory.newWorker(taskQueue, workerOptions)`.

`setUsingVirtualWorkflowThreads` controls SDK-managed Workflow execution threads. The factory source documents it as disabled by default and notes that enabling it causes `maxWorkflowThreadCount` to be ignored. Worker options separately expose `setUsingVirtualThreads(boolean)` for task executors and more targeted switches, including Workflow Task and Activity task executors. These similarly named settings are not interchangeable.

These APIs are marked `@Experimental` in Java SDK 1.31.0; this is not a claim that 1.31.0 introduced them or that they remain experimental in every later release. Check API availability and stability against your pinned SDK release before adopting them.

Load-test your JDK, HTTP/DB libraries, worker slots, connection pools, and memory behavior. Virtual threads are especially relevant to blocking I/O; they do not make CPU-heavy work faster or authorize `Thread.startVirtualThread` inside Workflow code.

## References and Scope

- [Java Workflow basics and logic requirements](https://docs.temporal.io/develop/java/workflows/basics)
- [Java Asynchronous Activity Completion](https://docs.temporal.io/develop/java/asynchronous-activity-completion)
- [Java SDK 1.31.0 source: WorkerFactoryOptions](https://github.com/temporalio/sdk-java/blob/v1.31.0/temporal-sdk/src/main/java/io/temporal/worker/WorkerFactoryOptions.java)
- [Java SDK 1.31.0 source: WorkerOptions](https://github.com/temporalio/sdk-java/blob/v1.31.0/temporal-sdk/src/main/java/io/temporal/worker/WorkerOptions.java)

Java fragments were not compiled against a pinned application SDK. The tagged source establishes the stated API baseline; it does not establish compatibility with every SDK or JDK release.
