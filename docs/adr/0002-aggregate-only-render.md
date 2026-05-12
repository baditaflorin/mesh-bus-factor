---
status: accepted
date: 2026-05-12
---

# 0002 — Aggregate-only render, never per-name

## Context

A bus-factor exercise depends entirely on people answering honestly. The instant the tool could expose "Alex ticked nothing on billing," the exercise becomes performative: people tick what they want their manager to see, not what they actually know. The whole point of running the exercise is to surface uncomfortable truths, so the tool's value is exactly proportional to how safe it feels to be honest.

The shared Yjs document does, technically, contain per-peer entries (peers see each other's `peerId` and the topics they ticked). We could render those per-peer rows in the UI. That would make the tool richer — a manager could spot training-pair opportunities ("Alex wants to learn billing, Sam knows billing"). But it would weaponize the same map for a manager who wants to single people out, and there is no UI affordance that makes the second use harder without making the first impossible.

## Decision

The UI **never** renders per-peer rows. The only screens are:

- A horizontal bar chart of per-topic coverage counts (and per-topic learning-appetite counts).
- The user's own private ticks, which live in component state and are only published as the user's own row of the map.
- A "Copy as markdown" action that exports the aggregate, never the per-peer detail.

The `peerId` keys remain in the Yjs map because they're needed to make a peer's edits update-in-place (so toggling a tick on/off works correctly across reloads). They are not surfaced anywhere in the UI.

## Consequences

- **Pros.** The trust property is structural, not policy. A team running this in a meeting can point at the source code and say "the aggregate is all you'll ever see." That's the property that makes people tick honestly.
- **Pros.** Pairs naturally with `crypto.randomUUID()` peer IDs that mean nothing to anyone outside the device.
- **Cons.** A small loss of value. Pairing recommendations are something a manager could do manually after the meeting by asking "who knows X and wants to learn Y?" — but the tool won't do it for them.
- **Cons.** A motivated attacker with packet capture inside the room _could_ in principle correlate `peerId` with IP address. This is documented in `docs/privacy.md` as out of threat-model scope for the v1 exercise; in v2 we'd consider Semaphore-style commit-reveal where the per-peer map keys are zero-knowledge commitments and only aggregates are reconstructible.

## Alternatives considered

- **Per-peer rows behind a "manager view" toggle.** Rejected. A toggle that exposes per-peer data, even if defaulted off, undermines the trust contract — people will tick defensively in case the toggle gets flipped.
- **Anonymous publish via commit-reveal**, where each peer publishes a SHA-256 commit of their ticks during the meeting and only reveals after a count-down. Rejected for v1 as too much ceremony for a 2-hour exercise where the room is small and the trust is already high; revisit if the tool is used in larger or less-trusted settings.
- **Server-aggregated count.** Rejected — would require a backend, which is the whole opposite of Mode A.
