---
level: intermediate
technologies:
  - NGINX
---

# NGINX

NGINX is a web server and reverse proxy. It can serve files directly, accept HTTPS connections, and forward requests to application servers. A common deployment puts NGINX at the edge of a service: clients connect to NGINX, and NGINX routes each request to a static file or an application behind it.

This guide covers the core configuration model, request routing, static files, and reverse proxying. It uses the open-source NGINX HTTP server; exact package paths and service commands vary by operating system and container image.

## The Request Path

NGINX commonly runs a master process and worker processes. The master reads configuration and manages workers; workers handle many connections using an event-driven model. This lets NGINX handle concurrent network connections efficiently, while an application server can focus on application logic.

A typical reverse-proxy request follows this path:

```text
Browser --HTTP or HTTPS--> NGINX --HTTP--> application server
                                |
                                +-- serves static files directly
```

NGINX can terminate TLS, select a virtual server, choose a location, and then either return a response or proxy the request upstream. TLS termination means the client connection is HTTPS to NGINX; the connection from NGINX to the application is a separate connection and may also need encryption depending on the network and threat model.

## Configuration Structure

NGINX configuration uses nested blocks. Directives are settings or actions; blocks such as `http`, `server`, and `location` define where those directives apply. A minimal file often looks like this:

```nginx
http {
    server {
        listen 80;
        server_name example.com;

        location / {
            root /var/www/example.com;
            try_files $uri $uri/ =404;
        }
    }
}
```

Package configurations commonly include files from directories such as `conf.d` inside the `http` context. The exact include layout is distribution-specific; inspect the active configuration rather than assuming a path. A directive's valid context matters: for example, `upstream` is defined inside `http`, while `root` can be used in several contexts.

The main concepts are:

- **`http`**: HTTP-wide settings, upstream groups, and virtual servers.
- **`server`**: A virtual server, usually selected using the listening address and port, then the request's `Host` name.
- **`location`**: Rules for matching a request URI within the selected server.
- **`upstream`**: A named group of application servers to which requests can be sent.

## How NGINX Chooses a Server and Location

NGINX first selects a `server` block based on the connection's listening address and port, then uses the request host name to choose among matching server names. If no name matches, the default server for that address and port handles the request. A default server is a property of the `listen` address, not a special meaning of `server_name _` by itself.

Within that server, NGINX chooses a `location` based on the normalized URI path. Common forms include:

| Form | Example | Matching behavior |
| --- | --- | --- |
| Exact | `location = /health` | Matches only `/health` |
| Prefix | `location /images/` | Matches paths with this prefix; the longest matching prefix is considered |
| Preferred prefix | `location ^~ /assets/` | Uses this prefix without checking regular-expression locations afterward |
| Regular expression | `location ~* \\.css$` | Checks a case-sensitive (`~`) or case-insensitive (`~*`) pattern after prefix matching |

An exact match wins immediately. Otherwise NGINX remembers the longest prefix match, then checks regular-expression locations in configuration order unless the chosen prefix uses `^~`. The first matching regular expression wins; if none matches, NGINX uses the remembered prefix. This is why moving a regex location or changing a prefix can alter routing even when the paths look similar.

## Serving Static Files

The `root` directive forms a filesystem path by appending the request URI. With `root /var/www/example.com`, a request for `/images/logo.svg` looks for `/var/www/example.com/images/logo.svg`.

`try_files` checks candidate paths in order. The example below serves a file, then a directory index, and returns `404` if neither exists:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

For a single-page application, a fallback such as `try_files $uri $uri/ /index.html;` lets client-side routes return the app shell. Use that only for routes intended to be handled by the frontend; otherwise a missing asset or API path can incorrectly receive `index.html` with a successful status.

## Reverse Proxying to an Application

An application usually listens on a local or private interface, and NGINX forwards matching requests to it. Define an upstream group and proxy requests to that group:

```nginx
http {
    upstream app {
        server 127.0.0.1:8080;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

Here, NGINX forwards requests to the application at `127.0.0.1:8080`. `proxy_pass` without a URI suffix preserves the request URI in this simple location. Adding a URI to `proxy_pass`, or using rewrites, can change how the path is forwarded; check the proxy module documentation when mounting an application under a path prefix.

The forwarding headers tell an application about the original host, client address, and scheme. They are not trustworthy merely because they exist. Configure the application to accept them only from the known proxy, and configure NGINX's real-client-IP handling only for known upstream proxies. Otherwise a direct client may spoof a forwarded address or scheme.

## Multiple Application Servers

An upstream group can contain multiple servers:

```nginx
upstream app {
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
}
```

By default, NGINX distributes requests across eligible servers using a round-robin method. Other methods, such as least connections or hashing, are available for workloads with different needs. Load balancing does not make an application stateful-service-aware by itself: shared sessions, health checks, retry behavior, and failure handling must be designed for the application and NGINX edition in use.

## Validate and Reload Safely

After changing configuration, test it before asking NGINX to reload:

```sh
sudo nginx -t
sudo nginx -T
sudo systemctl reload nginx
```

`nginx -t` checks configuration syntax and attempts to open referenced files. `nginx -T` prints the full effective configuration, including included files; review its output carefully and avoid sharing it if it contains sensitive values. A reload asks the master process to apply the new configuration while existing workers finish their current requests. The service manager and command may differ in containers or non-systemd environments.

If the test fails, fix the reported file and line before reloading. If a valid configuration still does not behave as expected, check the selected server and location, the upstream's reachability, application logs, and NGINX's error log. A `502 Bad Gateway` often means NGINX could not get a valid response from the upstream; a `404` may come from either NGINX's file lookup or the application.

## References

- [NGINX Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [How nginx processes a request](https://nginx.org/en/docs/http/request_processing.html)
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX load balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html)