# AI

Artificial intelligence (AI) is a broad field concerned with systems that perform tasks such as recognizing patterns, generating language, or choosing actions. In a developer workflow, an AI model is usually one component of an application, not the entire system.

The model generates responses, the agent coordinates work, tools perform operations, and integrations connect external capabilities. A useful way to evaluate an AI system is to separate what it can generate from what it can actually access, execute, and verify.

## The Parts of an AI Workflow

- **Model:** Processes input and generates output. A large language model is a language-focused model; it does not inherently have repository access or permission to execute commands.
- **Context:** The information supplied for a request, including instructions, conversation history, retrieved documents, and tool results. Its size is limited, and its quality affects the response.
- **Agent:** An application that coordinates a model and tools in a loop to work toward a goal. The host controls execution and permissions.
- **Tools:** Callable operations such as reading files, running tests, or querying documentation. Their results provide evidence, but can be incomplete or untrusted.
- **Skills and instructions:** Reusable guidance that influences decisions. Guidance is neither an executable capability nor permission to act.
- **Integrations:** Connections to other systems. MCP is one protocol for exposing capabilities; it is not required for every tool or every retrieval workflow.

For example, a coding agent investigating a failing test can read the implementation, make a change, and rerun the test. The model's proposed explanation is a hypothesis; the actual diff and fresh test result are what support the conclusion.

## What to Evaluate

Check where execution runs, which data leaves the environment, what requires approval, and what evidence supports the result. A fluent answer is not proof of correctness. Model quality, access control, useful context, and validation solve different problems; improving one does not automatically improve the others.

The linked guides below focus on developer-facing AI systems. They are not a survey of all AI techniques, model training, or machine learning mathematics.

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