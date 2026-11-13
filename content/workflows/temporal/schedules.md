# Temporal Schedules

Research checked: 2026-10-25

A Schedule controls recurring Workflow starts. Its timing, overlap policy, and lifecycle are separate from the [Activity retry rules](activities-and-failures.md) inside each Workflow. Start with the [Temporal Overview](index.md) if those execution boundaries are unfamiliar.

## Use the Current CLI

`tctl` is deprecated and no longer actively supported. Its underscore-style flags must not be copied unchanged into the current CLI. Prefer the documented `temporal schedule` commands.

The commands below are examples only. They assume an installed CLI, a configured endpoint/authentication context, an existing namespace, and compatible workers polling the task queue. No schedule needs to be created or deleted to read this guide.

## Create a Schedule Every 48 Hours

This example runs a registered `CustomerSyncWorkflow` on the `customer-sync-tasks` task queue every 48 hours (`172800` seconds), with an explicit overlap policy. The namespace, Workflow Type, and task queue are example values; substitute your own consistently:

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

## Choose an Overlap Policy

`Skip` is the default overlap policy: if the preceding scheduled Workflow is still open, the new action is skipped. Choose `BufferOne` if one delayed follow-up run is desired, or another policy deliberately. `AllowAll` permits concurrent runs and requires data isolation or duplicate-safe processing. Configure catchup behavior for outages and consider jitter for fleets of Schedules.

## Inspect Before Changing or Deleting

```bash
temporal schedule describe \
  --namespace example-namespace \
  --schedule-id customer-sync
```

Inspect the next action times, Workflow Type, task queue, inputs, and policies. Consult the installed CLI's `--help` because flags can vary by release. At the research baseline, the CLI reference describes `schedule update` as a full replacement: omitted options reset to defaults, so do not treat it as a partial patch.

## Delete or Pause a Schedule

To delete the same Schedule created above:

```bash
temporal schedule delete \
  --namespace example-namespace \
  --schedule-id customer-sync
```

**Deleting a Schedule does not cancel or terminate Workflow Executions it already started.** Handle those executions separately if needed. To stop automatic starts temporarily without deleting the configuration, use Schedule pause controls; pausing also leaves already-started Workflows running.

## References and Scope

- [Legacy tctl reference and deprecation notice](https://docs.temporal.io/tctl-v1)
- [Temporal CLI Schedule command reference](https://docs.temporal.io/cli/schedule)
- [Schedule semantics: timing, IDs, pause, and policies](https://docs.temporal.io/schedule)

CLI examples were not executed against a Temporal Service. Verify flags against the installed CLI and inspect the target namespace and Schedule before making operational changes.
