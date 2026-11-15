# Agent Skills

Skills supply reusable task-specific know-how to a coding agent. They are not separate agents, models, or permissions. Start with [AI Concepts](concepts.md) for the vocabulary and [Coding Agents](coding-agents.md) for the applications that use them.

## Instructions, Skills, and Tools

| Component | Purpose | Example |
| --- | --- | --- |
| Instructions | Set behavioral rules and project conventions | Follow the repository's existing test patterns |
| Skill | Package guidance for a particular kind of task | A workflow for reviewing an interface's accessibility |
| Tool | Perform a callable operation | Read a file, edit a component, or run a test |

A skill might tell an agent how to choose a validation command. A tool executes the command, subject to the host's permissions. Merely loading a skill does not install its dependencies or authorize its scripts to run.

## Check Compatibility Before Installing

The open Agent Skills format packages guidance in a folder containing a `SKILL.md`, optionally accompanied by references, scripts, and other assets. Host products can differ in discovery, loading behavior, supported locations, and additional features; do not assume every package works unchanged in every assistant.

Before using a skill:

1. Check that the selected agent supports its format and installation location.
2. Read its instructions and inspect any scripts or installation commands.
3. Check dependencies and any network, filesystem, or credential access it requires.
4. Confirm that its recommendations fit the project rather than overriding existing conventions by default.
5. Validate its output with the same review and tests you would use for other agent-generated changes.

## Example: UI UX Pro Max

Product example checked: 2026-10-25

**UI UX Pro Max** is an installable AI-agent skill and companion CLI, published in the `nextlevelbuilder/ui-ux-pro-max-skill` repository. It supplies searchable design references and workflow guidance to help an agent generate or improve user interfaces. The project describes catalogs for UI styles, color palettes, typography, chart types, UX guidance, and framework-specific recommendations, plus a design-system generator. It supports multiple coding assistants and frontend stacks.

It is **design guidance and retrieval tooling**, not a UI framework, a hosted design service, or a replacement for product-specific design judgment. Check recommendations against the actual requirements, existing design system, accessibility needs, and codebase. Catalog counts and quality claims are maintained by the project and can change between releases.

The repository recommends installing through its current `ui-ux-pro-max-cli` package (`uipro` command); search features require Python 3. Check its README for current assistant-specific setup, compatibility, and prerequisites before installing.

## Related Guides

- [Tools in VS Code](tools-in-vscode.md): The operations an agent can call and the permissions governing execution.
- [MCP](mcp.md): Connections to servers exposing tools, resources, and prompts.
- [Context Optimization](context-optimization.md): Includes a response-concision skill and command-output filtering, which affect different sides of context usage.

## References

- [Agent Skills format](https://agentskills.io/specification)
- [VS Code: Agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [UI UX Pro Max project README](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)