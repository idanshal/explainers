# Explainer: AI Concepts, Agents, Skills, and MCP

Research checked: 2026-10-25

This guide separates general AI concepts from specific products. Product names
and implementation details change; core terms such as prompt, skill, agent, and
MCP describe different parts of an AI-enabled workflow.

## Core AI Concepts

**Model**: The AI system that processes input and generates output. A model is
not by itself the application or agent wrapped around it.

**Large language model (LLM)**: A model trained to process and generate
language. “LLM” describes a kind of model, not a chat app or agent product.

**Prompt**: The input for a model request. It can include the user's request,
instructions, conversation history, examples, and other context. A prompt is
not necessarily just the latest sentence typed by the user.

**Instructions**: Rules that steer how a model should respond. Products may
separate system, developer, and user instructions, but the exact roles and
priority rules depend on the product or API.

**Context**: Information made available to the model for a request, such as
instructions, conversation messages, retrieved documents, or tool results. The
**context window** is the model's finite working limit for that information and
generated output; what counts toward it varies by product.

**Token**: A piece of text (or other input) the model processes. Tokens are not
the same as words; usage limits and costs are commonly measured in tokens.

**Tool**: An operation an AI application makes available, such as searching
documentation or running a command. The model may request a tool call, but the
application handles execution and any permission checks. A tool is not itself
an MCP server; MCP is one standard way to connect applications and servers that
provide tools.

**Agent**: An AI application that uses a model in a loop: it takes in a task,
chooses steps, may call tools, observes results, and continues until it stops or
hands control back. The degree of autonomy varies. An agent is not just a model
and is not the same thing as a skill.

**Workflow**: A defined sequence of tasks or steps. A workflow may be automated
without an AI agent; an agent may choose or adjust steps dynamically.

**Skill**: Reusable task-specific know-how for an agent, usually instructions
and sometimes reference files, templates, or scripts. The open Agent Skills
format packages these in a folder with a `SKILL.md`; individual products may
also use “skill” for their own, non-portable customization format. A skill
guides an agent but does not run independently as an agent.

**Memory**: Information an application stores for possible use in later turns
or sessions. Memory is distinct from the current context window; products vary
in what they retain and how users can manage it.

**Retrieval-augmented generation (RAG)**: A pattern where an application
searches an external knowledge source and supplies relevant results as context
for a model response. Retrieval can be implemented with or without MCP.

Sources: [OpenAI developer documentation](https://developers.openai.com/api/docs) · [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28) · [Agent Skills overview](https://agentskills.io/)

## Coding Agents

### Copilot CLI

**GitHub Copilot CLI** is GitHub's AI coding agent interface for a terminal. Start an interactive session in a project directory with `copilot`, or send a one-shot prompt with `copilot -p "..."`. It can explain, write, debug, and refactor code; work with GitHub repositories, issues, and pull requests; and use tools and MCP servers.

It is an agent, not merely shell autocomplete: depending on permissions, it can edit files and execute commands. Review approval requests carefully. Automatic tool approval increases the risk of unwanted file changes or commands. GitHub documents local and cloud sandbox options, and organization policy or an active Copilot entitlement can affect availability.

**Useful distinction:** “Copilot CLI” here means GitHub's `copilot` terminal application. It is not the same thing as the older `gh copilot` GitHub CLI extension.

Sources: [GitHub documentation](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli) · [Official CLI repository](https://github.com/github/copilot-cli)

### Claude Code

**Claude Code** is Anthropic's agentic coding tool. It can inspect a codebase, answer questions, make changes, run commands, and help with Git workflows from natural-language instructions. It is available through terminal and IDE workflows, and can also be used with GitHub.

Claude Code can take actions, not just suggest code. Its permission modes determine what it can read, edit, or execute, so review permissions and proposed commands with the same care as for any coding agent. It also supports customization and integrations such as skills, hooks, and MCP servers.

**Useful distinction:** Claude Code is the coding agent/tool; Claude is the underlying assistant/model family. Claude Code is not limited to a terminal even though its terminal interface is a common way to use it.

Sources: [Claude Code overview](https://code.claude.com/docs/en/overview) · [Official Claude Code repository](https://github.com/anthropics/claude-code)

### Codex

**OpenAI Codex** is OpenAI's coding-agent product for delegating software tasks such as implementing features, fixing bugs, answering questions about a repository, and reviewing changes. Codex is available through multiple interfaces, including a cloud agent, an IDE integration, a desktop app, and the open-source **Codex CLI**.

The CLI runs locally in a terminal and works against a local project. Its sandbox and approval settings control whether it can read files, modify the workspace, or run commands. Those settings matter: broad or disabled approvals can grant more authority than intended. The cloud agent is a separate execution environment, useful for delegated work that runs remotely.

**Useful distinction:** “Codex” can refer to the overall product; “Codex CLI” specifically means its local, terminal-based interface. It is not the name of an old standalone OpenAI model in this context.

Sources: [OpenAI Codex](https://openai.com/codex/) · [Codex CLI repository and interface options](https://github.com/openai/codex) · [Codex CLI documentation](https://developers.openai.com/codex/cli)

## Token and Context Tools

### Caveman

[Caveman](https://github.com/JuliusBrussee/caveman) is a project for reducing token use in AI coding-agent workflows. Its current offering includes an agent skill for more concise responses and CLI/integrations that filter tool output. The project also describes optional model-and-effort routing, reusable script blocks, and web-page compression. Features and supported agents vary by component and installation method.

The skill mainly targets **output** (what the agent says); command-output filters and web compression target **input** (what the agent reads). Some components use a local proxy, but the project's features are broader than a skill-plus-proxy split. The project publishes benchmark results; treat those as maintainer-reported measurements for the stated tasks, not guarantees for other models or workflows.

Concision can make responses less natural or omit nuance if the instructions are not followed well. It does not improve the underlying model's reasoning, and should not suppress necessary safety warnings, uncertainty, or explanation.

Sources: [Caveman project, documentation, and benchmarks](https://github.com/JuliusBrussee/caveman)

### RTK

**RTK** means **Rust Token Killer**. It is a command-line tool and agent integration for reducing noisy shell-command output before it reaches an AI coding agent. It can be invoked directly or configured to rewrite supported commands; examples include tests, builds, Git, package managers, and logs. RTK also has a configurable pipeline and an optional, separately installed proxy for processing configured provider API traffic. Which features apply depends on the command, integration, and configuration.

RTK's command filters primarily target **input context**: less shell output reaches the model. This does not mean the same percentage reduction in total context or cost, and filtering is not a substitute for inspecting full output when details matter. RTK's current documentation says telemetry is opt-in; check the project's current telemetry and privacy documentation for the specific release and configuration.

**How it differs from Caveman:** Caveman includes response-style guidance as well as input-reduction components; RTK focuses on command-output filtering, with an optional provider-traffic proxy. Their capabilities overlap, and both vary by integration. Some setups can use both.

Sources: [RTK documentation and source](https://github.com/rtk-ai/rtk) · [RTK product overview](https://rtk-ai.app/) · [Telemetry and privacy](https://www.rtk-ai.app/guide/resources/telemetry)

## MCP Integrations

### Temporal docs MCP

**Temporal docs MCP** refers here to an assistant-side integration for searching
Temporal documentation and related knowledge sources with natural-language
queries. Implementations may return relevant snippets and source URLs, which can
help look up Temporal concepts and implementation guidance without searching the
whole web.

This is a documentation-retrieval integration, not the Temporal platform, an SDK, or a
way to run or inspect a Workflow Execution. Search results are selected by
relevance and may be incomplete; follow the returned source links when exact
wording, version details, or full context matter. MCP server capabilities and
result formatting depend on the specific integration and host.

**Useful distinction:** Use this when the question is specifically about Temporal
and its concepts or docs. It searches Temporal-focused knowledge sources; it is
not a general-purpose documentation index for arbitrary libraries.

Source: [Temporal documentation glossary](https://docs.temporal.io/glossary) for Temporal terminology; consult the specific MCP server's documentation for its integration behavior.

### Context7 MCP

**Context7 MCP** provides an assistant with documentation and code examples for
supported libraries. Its common workflow is to resolve a product or package name
to a Context7 library ID, then query that ID with a focused question. Where
available, a version-specific ID can help retrieve docs for a particular
release.

Context7 is documentation context, not the library itself and not a guarantee
that every result matches the project's installed version. Resolve the right
library and version, and follow source links when correctness depends on exact
API details. Context7 says it refreshes indexed documentation automatically
based on popularity and offers maintainers a GitHub Action for refreshes on
pushes; this is not a live lookup of every upstream page or a guarantee that
every change is already indexed.

**Useful distinction:** Use Context7 for library-specific documentation across
many supported projects; use the Temporal docs MCP when you specifically need
Temporal's knowledge sources. Neither tool replaces checking the project's
actual dependency versions or testing code.

Sources: [Context7 documentation](https://context7.com/docs) · [Indexing and refresh details](https://context7.com/docs/adding-libraries) · [Context7 MCP project](https://github.com/upstash/context7)

## Other Tools and Platforms

### Cloudflare Pages

**Cloudflare Pages** is a managed platform for deploying websites and full-stack applications to Cloudflare's network. A common workflow connects a GitHub or GitLab repository, selects a build command and output directory, and deploys on pushes. Git-connected projects can create preview deployments for non-production branches. Pages also supports direct upload and Pages Functions for server-side code.

Pages is especially straightforward for static sites and frontend projects. It is not simply a general-purpose virtual machine: dynamic behavior runs within Cloudflare's serverless platform and its supported runtime/bindings.

**Current platform direction:** Cloudflare's documentation says Workers supports most Pages use cases, has a broader feature set, and is its primary platform for building applications; it recommends starting new projects with Workers. Pages remains a documented, deployable product, so that guidance is a platform recommendation rather than a statement that Pages is unavailable. Consider Pages for an existing Pages workflow or a simple static deployment; consider Workers for a new application needing the broader current platform. Review the migration compatibility table if relying on a specific feature.

Sources: [Pages overview](https://developers.cloudflare.com/pages/) · [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Cloudflare's Pages-to-Workers comparison and guidance](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)

### UI UX Pro Max skill

**UI UX Pro Max** is an installable AI-agent skill and companion CLI, published in the [`nextlevelbuilder/ui-ux-pro-max-skill` repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). It supplies searchable design references and workflow guidance to help an agent generate or improve user interfaces. The project describes catalogs for UI styles, color palettes, typography, chart types, UX guidance, and framework-specific recommendations, plus a design-system generator. It supports multiple coding assistants and frontend stacks.

It is **design guidance and retrieval tooling**, not a UI framework, a hosted design service, or a replacement for product-specific design judgment. Its recommendations should be checked against the actual requirements, the project's existing design system, accessibility needs, and the codebase. Catalog counts and quality claims are maintained by the project and can change between releases.

The repository recommends installing through its current `ui-ux-pro-max-cli` package (`uipro` command); search features require Python 3. Check its README for current assistant-specific setup, compatibility, and prerequisites before installing.

Source: [UI UX Pro Max project README](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

## Quick Distinctions

| Term | Think of it as | Key difference |
|---|---|---|
| Model | The generator | Processes input and produces output; not the surrounding app |
| LLM | A language-focused model | A model type, not a chat app or agent product |
| Prompt | The request package | Messages and context supplied for a model response |
| Instructions | The behavioral rules | Guide responses; role names and priority vary by product |
| Tool | A callable operation | Performs an action or lookup through the host application |
| Agent | The task-running application | Uses a model in a loop and may call tools to complete work |
| Workflow | A defined process | Can be automated without an agent; agents may adapt steps dynamically |
| Skill | Reusable know-how | Guides an agent through a task; does not run on its own |
| MCP | A connection protocol | Standardizes how an AI host connects to servers and capabilities |
| Memory | Persisted information | May carry information across turns or sessions; not the same as context |
| RAG | A retrieval pattern | Finds external information and adds it to a model's context |

## Source notes

Product capabilities and platform recommendations are based on the linked official documentation or project repositories checked on the research date. Product features can change after that date. Project-published benchmark numbers are maintainer-reported, not presented as independently verified or universal results. The Temporal glossary supports Temporal terminology, not claims about every assistant-side MCP integration. Context7's indexing is refreshed over time; check results against the project's actual dependency version when exact API details matter.
