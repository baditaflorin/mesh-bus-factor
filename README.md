# mesh-bus-factor

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--bus--factor-22a3c3?style=flat-square)](https://baditaflorin.github.io/mesh-bus-factor/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-bus-factor?style=flat-square&color=22a3c3)](https://github.com/baditaflorin/mesh-bus-factor/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Anonymous bus-factor map for engineering teams — privately tick the systems you could carry; the room sees aggregate counts only.

**Live:** https://baditaflorin.github.io/mesh-bus-factor/

A 2-hour team-meeting tool. Every engineer opens the same URL with the same room ID, then privately ticks the systems they could carry alone if needed (auth, billing, deploy, search, on-call, …). A second tick records "I'd like to learn this." The room displays a horizontal bar chart of coverage counts per topic, sorted ascending — the bars at the bottom are the bus-factor 1 risks. Learning appetite shows as a dashed overlay so the room can see where there's training willingness.

The privacy property is the whole point. Nothing in the protocol or the UI exposes who knows what. A manager who tried to use it to identify "the person who doesn't know billing" gets only "billing has 1 knowledgeable engineer." Which is the actionable signal anyway.

## How it works

- One Yjs document per room (`mesh-bus-factor:<roomId>`), synced peer-to-peer via y-webrtc.
- `Y.Array<string>("topics")` — the shared list of topics, edited by anyone.
- `Y.Map<peerId, { knows, wantsToLearn }>("coverage")` — per-peer arrays of topic IDs the peer ticked.
- `peerId` is `crypto.randomUUID()` persisted to localStorage, so reloads don't double-count.
- The UI **never renders the map's values keyed by peer** — only sums.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). The signaling server sees the room name and IPs; the TURN server sees encrypted relay flow. Peers in the same room see the **whole Y.Doc**, including per-peer entries — but the aggregate-only render is the user-visible contract.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-bus-factor.git
cd mesh-bus-factor
npm install
npm run dev
```

Open two browsers (or two devices on the same network), enter the same Room ID, tap Connect. Tick coverage on one, watch the bars move on the other.

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Aggregate-only render, never per-name](docs/adr/0002-aggregate-only-render.md)
- [0003 — Topics are shared, edits permissionless](docs/adr/0003-shared-topics.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
