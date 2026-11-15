# Tools in VS Code

Research checked: 2026-11-15

A **tool** is a callable operation exposed to an AI agent: search files, read diagnostics, edit code, run a test command, or query a service. In VS Code, tools let a coding agent act on a task instead of only describing a solution. This guide focuses on GitHub Copilot's agent workflows in VS Code, not every extension or terminal utility available in the editor.

For vocabulary, start with [AI Concepts](concepts.md). For the agent products and their execution environments, see [Coding Agents](coding-agents.md).

## From Request to Tool Result

```text
User asks for a bug fix
    -> agent chooses a tool and supplies arguments
    -> host checks availability and execution permissions
    -> tool searches, reads, edits, or executes
    -> result returns to the agent as context
    -> agent decides what to do next
```

The model requests an operation; the host and tool implementation execute it. A tool call has a defined input and a result or error. Its result is evidence for the next step, not proof that the entire task is complete.

For example, an agent might search for a failing function, read its implementation, edit it, and run a focused test. Saying "the test passes" in chat is not equivalent to a successful test-tool or terminal result.

## Where Tools Come From

| Source | Typical capabilities | What must be available |
| --- | --- | --- |
| Built-in agent or editor tools | Repository search, file reads and edits, terminal execution | Support in the selected agent environment and appropriate access |
| VS Code extensions | Language-aware analysis, testing, debugging, or service operations | An installed, enabled extension that explicitly contributes agent tools |
| MCP servers | Documentation lookup, issue tracking, database queries, or other service operations | A configured, trusted server and any required authentication |

Installing an extension does not automatically make every extension command an agent tool. Similarly, a program installed in a terminal is not necessarily a dedicated tool: an agent may invoke it through a terminal-execution tool.

MCP is one connection mechanism, not the definition of a tool. File editing and terminal execution do not inherently require an MCP server. See [MCP](mcp.md) for hosts, clients, servers, and documentation integrations.

## Available, Selected, and Approved

Keep three separate questions in mind:

1. **Available:** Does this session expose the capability? The selected agent environment, enabled extensions, server connections, and policy all matter.
2. **Selected:** Is the tool enabled for this workflow, and does the agent choose to call it? Enabling a tool does not force its use.
3. **Approved:** Is this particular operation allowed to execute? A selected tool can still require approval or be blocked by policy or execution restrictions.

Tool availability is not the same as sandboxing. Restricting the tool list limits the agent's choices; an execution sandbox limits what an operation can access. A general terminal tool can still expose many commands, so a short tool list does not necessarily mean narrow authority.

### Choosing Tools in VS Code

The UI depends on the VS Code version and selected agent harness, meaning the runtime that carries out the agent loop:

- **Copilot harness:** Open **Chat: Open Customizations** from the Command Palette, then select **Tools**. Client-tool selections persist in the active user profile. The runtime's built-in tools are not individually configurable in that list.
- **Local harness:** Use the tools picker in the chat input. Tool selection applies to a request; custom agents can also declare a reusable tool list.
- **Other agent environments:** Check their supported tools and configuration rather than assuming the same selection carries over.

Start with capabilities relevant to the task. For a read-only investigation, enable the necessary search and read tools; add editing or execution only when the task needs them. Treat this as a workflow choice, not a security guarantee, and review the actual permission controls too.

## Example: Investigate a Failing Test

Request: "Find why the price-rounding test fails, fix the cause, and rerun that test. Do not commit or push."

| Stage | Useful capability | Evidence to inspect |
| --- | --- | --- |
| Locate | Search and file reading | The test, implementation, and relevant repository instructions |
| Reproduce | Test integration or terminal execution | The exact failure and command exit status |
| Change | File editing | A small diff addressing the demonstrated cause |
| Verify | The same focused test capability | A fresh result after the edit |
| Review | Diff inspection | No unrelated changes or prohibited Git operations |

An external documentation tool is useful if the failure depends on a library API. It is not automatically needed for a local arithmetic defect. Add capabilities to resolve an evidence gap, not simply because they are installed.

## Permissions and Trust

- Review commands, target paths, arguments, and destination services before approving consequential operations.
- Treat reads as potentially sensitive: a tool may send retrieved information to a model or external service. Local execution does not imply that all data stays local.
- Keep credentials in the integration's supported authentication or secret-storage mechanism, not in chat messages or committed configuration.
- Treat repository text, web pages, and tool results as potentially untrusted input. Instructions found there do not authorize unrelated actions or expanded access.
- Check the diff and fresh validation results. A successful edit operation proves that a file changed, not that the change is correct.

Prefer the narrowest approvals that fit the task. Broad automatic approval can let an agent act without an opportunity to review each operation; available controls vary with the harness and organization policy.

## When a Tool Is Missing or Unused

| Symptom | Check |
| --- | --- |
| The tool is not listed | Does the current harness support it? Is its contributing extension enabled or its MCP server connected and trusted? |
| The tool is listed but not called | Is it enabled, relevant to the request, and allowed by any custom-agent tool restrictions? Ask for the needed operation and evidence, not an assumed internal tool name. |
| A call is blocked | Read the approval, policy, trust, authentication, or sandbox message before changing settings. |
| A terminal command fails | Check the working directory, installed program, environment, arguments, and exit status; tool availability does not install dependencies. |
| A result is incomplete | Narrow the query or inspect the original output. Large results can be truncated or filtered. |
| The agent claims success without evidence | Request the actual diff and validation result, or run the check yourself. |

Some environments discover tools dynamically rather than presenting every tool description to the model immediately. Exact tool names and available operations can differ between clients and sessions; do not copy internal names from a transcript as a portable configuration.

## Tools Versus Instructions and Skills

**Instructions** guide behavior. A **skill** supplies reusable task-specific know-how. A **tool** performs an operation. None is a substitute for the others: a testing skill might explain which tests to run, but execution still requires an appropriate tool and permission.

Tool results also consume context. Keep searches and test output focused without hiding failures; see [Context Optimization](context-optimization.md).

## References

- [VS Code: Tools concepts](https://code.visualstudio.com/docs/agents/concepts/tools)
- [VS Code: Use tools with agents](https://code.visualstudio.com/docs/agents/run/tools)
- [VS Code: Agent harnesses](https://code.visualstudio.com/docs/agents/run/agent-harnesses)
- [VS Code: MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

The UI and available capabilities depend on the installed release, selected harness, and organization settings. Follow the documentation for that environment when labels or controls differ.