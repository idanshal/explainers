---
level: intermediate
technologies:
  - Docker
---

# Docker Networking

Docker networking provides connectivity between isolated container processes, other containers, and external callers. A container normally has its own network namespace, so its loopback address is separate from the host's. Choosing the right destination address and deciding whether to publish a port are different tasks.

Documentation checked: 2026-11-15. Examples target Linux containers on a local Docker Engine or Docker Desktop.

## Three Different Addresses

| Caller | Destination | Address to use |
| --- | --- | --- |
| Browser or process on your laptop | A published container service | Host address and published host port, such as `127.0.0.1:8080` |
| Container | Another container on the same user-defined network | Container name or Compose service name and the destination's container port, such as `db:5432` |
| Container | A service running on your laptop | `host.docker.internal` with Docker Desktop; native Linux may require explicit host-gateway configuration |

Inside a container, `localhost` normally means **that container**. It does not mean your laptop or the database in another container. An application connecting to `localhost:5432` inside its own container is not connecting to a sibling PostgreSQL container.

## Container Ports and Published Ports

```sh
docker run --detach --name docker-guide-server --publish 127.0.0.1:8080:80 nginx:stable-alpine
```

The mapping is `HOST_IP:HOST_PORT:CONTAINER_PORT`: traffic to your host's loopback port `8080` goes to port `80` in the container. The application still needs to listen on the container port and an address reachable through its container network interface, normally `0.0.0.0` rather than only `127.0.0.1`.

- `EXPOSE 80` in a Dockerfile documents a container port; it does not publish it.
- `--publish` or `-p` publishes a port; it does not change the application's listening port.
- `-p 8080:80` usually binds all host interfaces. Use an explicit loopback address for a local-only development service.
- `-P` publishes all exposed ports to automatically assigned host ports. Inspect the assigned mappings rather than assuming a specific port.
- Port mappings use TCP by default. Specify `/udp` for a UDP service.

Older Docker Engine releases before 28.0.0 had a localhost-publishing caveat that could permit access from the same layer-2 network. Keep the engine current; see the official port-publishing reference.

```sh
curl --fail http://127.0.0.1:8080/
docker port docker-guide-server
docker rm --force docker-guide-server
```

These commands deliberately remove only the example server. Choose another host port if `8080` is occupied.

## Container-to-Container Communication

Use a user-defined bridge network for related containers on one Docker host. It provides name-based discovery; do not rely on container IPs, which can change when containers are recreated.

The following is a separate lab; run it after removing the previous example server:

```sh
docker network create docker-guide-net
docker run --detach --name docker-guide-server --network docker-guide-net nginx:stable-alpine
docker run --rm --network docker-guide-net busybox:1.37 wget -qO- http://docker-guide-server:80/
docker network inspect docker-guide-net
docker rm --force docker-guide-server
docker network rm docker-guide-net
```

The temporary BusyBox container resolves `docker-guide-server` through Docker's DNS and reaches the server's port `80`. There is **no published host port** in this example. The network allows the containers to communicate; publishing is only needed for callers outside that network through the host.

The legacy default `bridge` network behaves differently from a user-defined bridge, notably for automatic name resolution. Prefer an explicit user-defined network or the default network that Compose creates for a project. Legacy `--link` is not the normal solution.

## Compose Service Discovery

Compose normally attaches a project's services to a project-specific default network. If the services are named `app` and `db`, configure the app's database hostname as `db`, not a generated container name or the database's host-published port.

Services must share a network to communicate directly. Multiple networks can separate frontend and backend connectivity, but network membership is not authentication: database users, TLS where appropriate, and application authorization still matter.

Avoid specifying `container_name` merely to make discovery work; service names already provide discovery and custom container names can prevent scaling. See [Docker Compose](compose.md) for a complete two-service example.

## Reach a Service on the Host

Docker Desktop provides `host.docker.internal`. Native Linux Engine may need:

```sh
docker run --rm --add-host host.docker.internal:host-gateway busybox:1.37 nslookup host.docker.internal
```

The application's host service must listen on an address reachable from the Docker network, and host firewall rules must permit access. A native Linux service bound only to host loopback may not be reachable through the bridge gateway. Do not solve this by exposing a development service broadly without considering who can connect.

Host networking removes the normal network isolation boundary and changes how port publishing works; Docker Desktop support also depends on its settings and version. It is not the default fix for an incorrect hostname.

## Debug in Order

1. **Process:** Is the destination running, and do its logs show a successful startup?
2. **Listener:** Is it listening on the expected port and interface inside the container?
3. **Network membership:** Are both containers attached to the intended network?
4. **Name resolution:** Does the source container resolve the correct service name?
5. **Protocol and credentials:** Are you using HTTP versus HTTPS, the correct database protocol, and valid authentication?
6. **Host publication:** If calling from the host, is the expected host port published and free?

Use a temporary diagnostic container on the same network when the application image lacks tools. Do not assume every runtime image contains `curl`, `ping`, a shell, or a package manager, and do not install ad hoc packages into a production container as a permanent fix.

## References

- [Docker networking overview](https://docs.docker.com/engine/network/)
- [Bridge networks](https://docs.docker.com/engine/network/drivers/bridge/)
- [Port publishing](https://docs.docker.com/engine/network/port-publishing/)
- [Compose networking](https://docs.docker.com/compose/how-tos/networking/)
- [Docker Desktop networking](https://docs.docker.com/desktop/features/networking/)