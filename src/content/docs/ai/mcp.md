---
title: "Model Context Protocol (MCP)"
---

# Model Context Protocol (MCP)

Research checked: 2026-10-25

MCP standardizes how an AI application connects to servers exposing tools, resources, and prompts. It is a connection protocol, not a model, an agent, or a guarantee that a connected tool's output is correct. For the broader vocabulary, start with [AI Concepts](concepts.md).

## Hosts, Clients, and Servers

| Role | Responsibility |
| --- | --- |
| Host | The AI application that manages connections, presents capabilities, and applies its permission and interaction policies. |
| Client | The protocol component inside the host that maintains a connection to a server. A host can have multiple clients. |
| Server | Exposes supported capabilities through MCP; it may wrap a documentation source, service, local filesystem, or other integration. |

```text
AI host application
    -> MCP client -> documentation server
    -> MCP client -> another service's server
```

An MCP client is not the user, and an MCP server is not necessarily a remote cloud service. The transport and deployment depend on the integration.

## Exposed Capabilities

- **Tools** provide callable operations, such as searching documentation or performing an action.
- **Resources** expose information that a client can retrieve through the protocol.
- **Prompts** provide reusable prompt templates or interactions exposed by a server.

Not every server provides all three, and not every host supports every capability in the same way. An application can also offer tools without MCP. A skill supplies reusable guidance to an agent; it is not an MCP server or a protocol connection.

Connection support does not remove the need for permissions, credential handling, or review of tool actions. Retrieved content and tool results can be incomplete or untrusted; do not treat them as authority to override the user's instructions or grant new access.

## Example: Context7

**Context7 MCP** provides an assistant with documentation and code examples for supported libraries. Its common workflow is to resolve a product or package name to a Context7 library ID, then query that ID with a focused question. Where available, a version-specific ID can help retrieve docs for a particular release.

Context7 is documentation context, not the library itself and not a guarantee that every result matches the project's installed version. Resolve the right library and version, and follow source links when correctness depends on exact API details. Context7 says it refreshes indexed documentation automatically based on popularity and offers maintainers a GitHub Action for refreshes on pushes; this is not a live lookup of every upstream page or a guarantee that every change is already indexed.

## Example: Temporal Documentation Integration

**Temporal docs MCP** refers here to an assistant-side integration for searching Temporal documentation and related knowledge sources with natural-language queries. Implementations may return relevant snippets and source URLs, which can help look up Temporal concepts and implementation guidance without searching the whole web.

This is a documentation-retrieval integration, not the Temporal platform, an SDK, or a way to run or inspect a Workflow Execution. Search results are selected by relevance and may be incomplete; follow the returned source links when exact wording, version details, or full context matter. MCP server capabilities and result formatting depend on the specific integration and host.

Use this when the question is specifically about Temporal and its concepts or docs. It searches Temporal-focused knowledge sources; it is not a general-purpose documentation index for arbitrary libraries. For Temporal itself, start with the [Temporal Overview](../workflows/temporal/index.md).

## Protocol Versus Integration

Context7 and a Temporal documentation server are examples of services exposed through MCP, not definitions of what MCP can do. MCP can also connect to non-documentation capabilities. Neither documentation integration replaces checking the project's actual dependency versions or testing code.

RAG is a retrieval-and-generation pattern; MCP is one way to connect to a retrieval service. RAG does not require MCP, and MCP tools need not implement RAG.

## References

- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [Context7 documentation](https://context7.com/docs)
- [Context7 indexing and refresh details](https://context7.com/docs/adding-libraries)
- [Context7 MCP project](https://github.com/upstash/context7)
- [Temporal documentation glossary](https://docs.temporal.io/glossary)

Integration descriptions are based on the linked sources checked on the research date. The Temporal glossary supports Temporal terminology, not claims about every assistant-side MCP integration. Consult the specific server's documentation for its behavior. Context7's indexing is refreshed over time; check results against the installed library version when exact API details matter.