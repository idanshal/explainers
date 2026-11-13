# AI Concepts

Research checked: 2026-10-25

Start here for the vocabulary used in AI-enabled workflows. A model, an agent, a tool, a skill, and a connection protocol describe different parts of a system, not interchangeable names for the same thing.

## Models, Prompts, and Context

**Model**: The AI system that processes input and generates output. A model is not by itself the application or agent wrapped around it.

**Large language model (LLM)**: A model trained to process and generate language. "LLM" describes a kind of model, not a chat app or agent product.

**Prompt**: The input for a model request. It can include the user's request, instructions, conversation history, examples, and other context. A prompt is not necessarily just the latest sentence typed by the user.

**Instructions**: Rules that steer how a model should respond. Products may separate system, developer, and user instructions, but the exact roles and priority rules depend on the product or API.

**Context**: Information made available to the model for a request, such as instructions, conversation messages, retrieved documents, or tool results. The **context window** is the model's finite working limit for that information and generated output; what counts toward it varies by product.

**Token**: A piece of text (or other input) the model processes. Tokens are not the same as words; usage limits and costs are commonly measured in tokens.

## Tools, Agents, Workflows, and Skills

**Tool**: An operation an AI application makes available, such as searching documentation or running a command. The model may request a tool call, but the application handles execution and any permission checks.

**Agent**: An AI application that uses a model in a loop: it takes in a task, chooses steps, may call tools, observes results, and continues until it stops or hands control back. The degree of autonomy varies. An agent is not just a model and is not the same thing as a skill.

**Workflow**: A defined sequence of tasks or steps. A workflow may be automated without an AI agent; an agent may choose or adjust steps dynamically.

**Skill**: Reusable task-specific know-how for an agent, usually instructions and sometimes reference files, templates, or scripts. The open Agent Skills format packages these in a folder with a `SKILL.md`; individual products may also use "skill" for their own, non-portable customization format. A skill guides an agent but does not run independently as an agent.

For example, a UI-design skill can guide a coding agent's design decisions. The agent still decides what to do and uses tools to edit or test the application. A concrete example is described under [Specialized Skills](coding-agents.md#specialized-skills).

## Memory, Retrieval, and Connections

**Memory**: Information an application stores for possible use in later turns or sessions. Memory is distinct from the current context window; products vary in what they retain and how users can manage it.

**Retrieval-augmented generation (RAG)**: A pattern where an application searches an external knowledge source and supplies relevant results as context for a model response. Retrieval can be implemented with or without MCP.

**Model Context Protocol (MCP)**: A protocol for connecting AI applications to servers that expose capabilities such as tools, resources, and prompts. A tool is not itself an MCP server, and an application can offer tools without using MCP. See [MCP](mcp.md) for the architecture and documentation-retrieval examples.

## Quick Distinctions

| Term | Think of it as | Key difference |
| --- | --- | --- |
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

## Further Reading

- [Coding Agents](coding-agents.md): Product interfaces, execution environments, permissions, and specialized skills.
- [Context Optimization](context-optimization.md): Input filtering, output concision, and token-saving tradeoffs.
- [MCP](mcp.md): Protocol roles and concrete server integrations.

## References

- [OpenAI developer documentation](https://developers.openai.com/api/docs)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [Agent Skills overview](https://agentskills.io/)