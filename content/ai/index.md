# AI Explainers

These guides separate the parts of an AI coding workflow: the model generates responses, the agent coordinates work, tools perform operations, and integrations connect external capabilities.

## Reading Path

| Step | Guide | Question it answers |
| --- | --- | --- |
| 1 | [AI Concepts](concepts.md) | How do models, agents, tools, skills, context, and memory differ? |
| 2 | [Coding Agents](coding-agents.md) | Where does an agent run, and what authority does it have? |
| 3 | [Tools in VS Code](tools-in-vscode.md) | How does an agent search, edit, execute, and use external services? |
| 4 | [Agent Skills](skills.md) | How does reusable task guidance differ from a tool or agent? |
| 5 | [Model Context Protocol (MCP)](mcp.md) | How do external servers expose capabilities to an AI application? |
| 6 | [Context Optimization](context-optimization.md) | How can input and output be reduced without hiding important evidence? |

## Start With the Problem

- **Unclear terminology:** Start with concepts rather than product names.
- **Choosing a coding assistant:** Compare execution environments and permissions in Coding Agents.
- **An agent needs to take an action in VS Code:** Read Tools in VS Code, including tool availability and approval boundaries.
- **Adding reusable specialist guidance:** Read Agent Skills before installing a skill package.
- **Connecting documentation or a service:** Read MCP after understanding what a tool does.
- **A session is noisy or consumes too much context:** Read Context Optimization after identifying what information the task actually needs.

Product examples illustrate a category; they are not interchangeable parts or endorsements. Availability depends on the installed version, selected agent environment, and organization policy.