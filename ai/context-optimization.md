# Context Optimization for Coding Agents

Research checked: 2026-10-25

Reducing token use can mean changing what an agent reads, what it writes, or both. These are different interventions with different tradeoffs. For definitions of tokens, prompts, and context windows, see [AI Concepts](concepts.md).

## Input Reduction Versus Output Concision

| Approach | What changes | Main risk |
| --- | --- | --- |
| Filter command output or retrieved pages | Less input reaches the model. | Important diagnostics or qualifications may be removed. |
| Request concise responses | The model generates less output. | Necessary explanation or uncertainty may be omitted. |
| Adjust model or effort routing | Different execution choices handle a task. | Suitability depends on the task and configuration, not just token count. |

A reduction in one command's output is not the same percentage reduction in total context, latency, or cost. Keep a way to inspect full output when details matter, and evaluate quality as well as usage.

## Caveman

[Caveman](https://github.com/JuliusBrussee/caveman) is a project for reducing token use in AI coding-agent workflows. Its current offering includes an agent skill for more concise responses and CLI/integrations that filter tool output. The project also describes optional model-and-effort routing, reusable script blocks, and web-page compression. Features and supported agents vary by component and installation method.

The skill mainly targets **output** (what the agent says); command-output filters and web compression target **input** (what the agent reads). Some components use a local proxy, but the project's features are broader than a skill-plus-proxy split.

Concision can make responses less natural or omit nuance if the instructions are not followed well. It does not improve the underlying model's reasoning, and should not suppress necessary safety warnings, uncertainty, or explanation.

## RTK

**RTK** means **Rust Token Killer**. It is a command-line tool and agent integration for reducing noisy shell-command output before it reaches an AI coding agent. It can be invoked directly or configured to rewrite supported commands; examples include tests, builds, Git, package managers, and logs. RTK also has a configurable pipeline and an optional, separately installed proxy for processing configured provider API traffic. Which features apply depends on the command, integration, and configuration.

RTK's command filters primarily target **input context**: less shell output reaches the model. Filtering is not a substitute for inspecting full output when details matter. RTK's current documentation says telemetry is opt-in; check the project's current telemetry and privacy documentation for the specific release and configuration.

## How They Differ

Caveman includes response-style guidance as well as input-reduction components; RTK focuses on command-output filtering, with an optional provider-traffic proxy. Their capabilities overlap, and both vary by integration. Some setups can use both.

The projects' published benchmark results are maintainer-reported measurements for the stated tasks, not independently verified guarantees for other models or workflows. Measure representative work and check whether filtered output still supports accurate decisions.

## References

- [Caveman project, documentation, and benchmarks](https://github.com/JuliusBrussee/caveman)
- [RTK documentation and source](https://github.com/rtk-ai/rtk)
- [RTK product overview](https://rtk-ai.app/)
- [RTK telemetry and privacy](https://www.rtk-ai.app/guide/resources/telemetry)

Product capabilities and privacy settings are based on the linked sources checked on the research date and may change between releases.