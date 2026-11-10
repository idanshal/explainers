# Coding Agents

Research checked: 2026-10-25

Coding agents use models and tools to inspect repositories, change code, run commands, and work toward software-development goals. This guide compares product interfaces and execution boundaries, then distinguishes agent customization from the agent itself. For the underlying vocabulary, start with [AI Concepts](concepts.md).

## Execution Environments and Permissions

Before choosing an agent, distinguish the interface from the environment where its actions run:

| Question | Why it matters |
| --- | --- |
| Does work run locally or in a remote environment? | Determines which files, services, and credentials are available. |
| Which reads, edits, commands, and network operations require approval? | Determines how much authority the agent has. |
| What does its sandbox restrict? | Approval settings and execution isolation are different controls. |
| Which instructions, skills, hooks, and MCP integrations are supported? | Customization formats and capabilities vary by product. |
| What does organization policy permit? | Entitlements and administrator settings can affect availability. |

Review approval requests carefully. Broad or automatic tool approval increases the risk of unwanted edits or commands. Review the resulting changes and run appropriate tests; an agent's completion message is not a substitute for verification.

## Copilot CLI

**GitHub Copilot CLI** is GitHub's AI coding agent interface for a terminal. Start an interactive session in a project directory with `copilot`, or send a one-shot prompt with `copilot -p "..."`. It can explain, write, debug, and refactor code; work with GitHub repositories, issues, and pull requests; and use tools and MCP servers.

It is an agent, not merely shell autocomplete: depending on permissions, it can edit files and execute commands. GitHub documents local and cloud sandbox options, and organization policy or an active Copilot entitlement can affect availability.

**Useful distinction:** "Copilot CLI" here means GitHub's `copilot` terminal application. It is not the same thing as the older `gh copilot` GitHub CLI extension.

## Claude Code

**Claude Code** is Anthropic's agentic coding tool. It can inspect a codebase, answer questions, make changes, run commands, and help with Git workflows from natural-language instructions. It is available through terminal and IDE workflows, and can also be used with GitHub.

Claude Code can take actions, not just suggest code. Its permission modes determine what it can read, edit, or execute. It also supports customization and integrations such as skills, hooks, and MCP servers.

**Useful distinction:** Claude Code is the coding agent/tool; Claude is the underlying assistant/model family. Claude Code is not limited to a terminal even though its terminal interface is a common way to use it.

## Codex

**OpenAI Codex** is OpenAI's coding-agent product for delegating software tasks such as implementing features, fixing bugs, answering questions about a repository, and reviewing changes. Codex is available through multiple interfaces, including a cloud agent, an IDE integration, a desktop app, and the open-source **Codex CLI**.

The CLI runs locally in a terminal and works against a local project. Its sandbox and approval settings control whether it can read files, modify the workspace, or run commands. The cloud agent is a separate execution environment, useful for delegated work that runs remotely.

**Useful distinction:** "Codex" can refer to the overall product; "Codex CLI" specifically means its local, terminal-based interface. It is not the name of an old standalone OpenAI model in this context.

## Specialized Skills

A skill supplies reusable guidance to an agent; it is not another coding agent. Check the host product's supported skill format and loading behavior rather than assuming every skill works unchanged everywhere.

### UI UX Pro Max

**UI UX Pro Max** is an installable AI-agent skill and companion CLI, published in the `nextlevelbuilder/ui-ux-pro-max-skill` repository. It supplies searchable design references and workflow guidance to help an agent generate or improve user interfaces. The project describes catalogs for UI styles, color palettes, typography, chart types, UX guidance, and framework-specific recommendations, plus a design-system generator. It supports multiple coding assistants and frontend stacks.

It is **design guidance and retrieval tooling**, not a UI framework, a hosted design service, or a replacement for product-specific design judgment. Check recommendations against the actual requirements, existing design system, accessibility needs, and codebase. Catalog counts and quality claims are maintained by the project and can change between releases.

The repository recommends installing through its current `ui-ux-pro-max-cli` package (`uipro` command); search features require Python 3. Check its README for current assistant-specific setup, compatibility, and prerequisites before installing.

## Choosing a Tool

Choose based on the execution environment, permissions, repository integrations, and customization your workflow needs, not just the model or product name. A local CLI, IDE integration, and cloud agent from the same vendor need not have identical capabilities or access.

For documentation connections, see [MCP](mcp.md). For response concision and command-output filtering, see [Context Optimization](context-optimization.md).

## References

- [GitHub: About Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)
- [Official Copilot CLI repository](https://github.com/github/copilot-cli)
- [Claude Code overview](https://code.claude.com/docs/en/overview)
- [Official Claude Code repository](https://github.com/anthropics/claude-code)
- [OpenAI Codex](https://openai.com/codex/)
- [Codex CLI repository and interface options](https://github.com/openai/codex)
- [Codex CLI documentation](https://developers.openai.com/codex/cli)
- [UI UX Pro Max project README](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

Product capabilities are based on the linked documentation checked on the research date. Interfaces, permissions, and supported customization features can change; verify them for the installed release and organization policy.