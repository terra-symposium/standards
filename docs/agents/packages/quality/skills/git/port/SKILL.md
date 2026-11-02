---
name: port
description: Assign and change local development ports across the Terra Symposium repositories, and acquire ports safely before starting servers.
---

# Local development port assignments

Use this skill when adding or changing a local development server, reviewing port collisions, or reserving a port before launching a server.

## Assigned ports

Keep every independently running local server on its assigned port. When changing a port, update the launcher, origin and callback allowlists, test base URLs, and developer documentation together. Search the repository for both `localhost:<port>` and `127.0.0.1:<port>` references.

| Repo / app | Port |
|---|---:|
| Salesphere | 1000 |
| RMA Sports docs | 1010 |
| Terra Symposium Website — Astro | 2010 |
| Terra Symposium Website — Docs routes | 2011 (served by Website Astro; no separate server) |
| Terra Symposium Website — Drizzle Studio | 2012 |
| Terra Symposium Website — Sanity Studio | 2013 |
| Terra Symposium Docs | 2020 |
| Terra Symposium Styling docs | 2030 |
| Terra Symposium Business Docs | 2040 |
| Terra Symposium Standards docs | 2050 |
| Ambulance Dispatch Prototype | 3000 |
| Compression docs | 3010 |
| Notes | 3020 |
| Saibai Corpus | 3030 |
| Personal Docs | 4000 |
| Playlist Atlas | 4010 |
| Portfolio | 4020 (no local dev server is currently configured) |
| Strike Counter | 4030 |

The Website Docs routes share the Astro server on port 2010. Portfolio is currently a deploy-focused coordinator without a local development server. Do not create duplicate listeners solely to make either row appear independently runnable; update this table if either app later gets its own server.

## Port acquisition

Prefer the shared `terra-quality-dev` launcher when the repository provides it. It accepts an explicit `--port`, adds strict-port handling, and calls the shared Quality `acquirePort()` helper before launch. Host Docs apps may set `DOCS_DEV_PORT` in their `docs dev` script; Astro apps should use their fixed configured port and strict handling where supported.

`acquirePort(port)` terminates processes listening on that port, then waits until it can bind. Use it only for ports owned by the local development workflow. Never use port `0` as a fixed assignment: it requests an OS-selected ephemeral port. Validate that configured ports are integers from 1 through 65535 and keep assignments unique across concurrently used services. Ports below 1024 may require elevated privileges on Unix-like systems; confirm the local runtime can bind Salesphere’s assigned port 1000.

## Change procedure

1. Confirm the app has an independent local server and select its assigned port from the table.
2. Update the server launcher/configuration and enable strict port handling so a collision fails clearly.
3. Update local origins, OAuth callback examples, browser-test base URLs, and docs that name the port.
4. Search all tracked source and docs for the old port and check that no other app has the new port.
5. Review only the intended port changes before committing.
