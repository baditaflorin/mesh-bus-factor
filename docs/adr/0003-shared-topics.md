---
status: accepted
date: 2026-05-12
---

# 0003 — Topics are shared, edits permissionless

## Context

The list of topics ("auth," "billing," "deploy," …) needs to be agreed-upon for the chart to mean anything. Three options to manage that list:

1. **Bundled into the app at build time.** Inflexible — every team has different systems.
2. **Per-peer local lists.** Useless — peers wouldn't be ticking the same buckets.
3. **One shared list in the Yjs document.**

Option 3 is right. The question is *who can edit it*.

## Decision

The topics list is a `Y.Array<string>` in the shared document. **Anyone in the room can add or remove a topic.** There is no host, no permission, no edit lock.

When a topic is removed, the per-peer `coverage` map entries are filtered to drop references to it (in the same transaction).

## Consequences

- **Pros.** Matches the level of trust a 2-hour team-meeting exercise needs. Teams are small, in a meeting together, can shout if someone edits something disruptive. Edit conflicts are resolved by Yjs CRDT semantics — the array converges.
- **Pros.** No host-onboarding step. The first person to join seeds the default topics; everyone else just joins.
- **Cons.** Trivially trolled by anyone in the room. But this is the same property as a shared whiteboard, and teams have solved this socially for decades.
- **Cons.** Not suitable as a long-term governance tool. If a team wants topic lists baked into a recurring review process, the "Copy as markdown" action exports a snapshot that can be checked into the team's docs repo and re-typed into a fresh room next time.

## Alternatives considered

- **First-join wins, then locked.** Rejected — felt like petty politics for a tool designed to surface honesty.
- **Admin key derived from a password set on first-join.** Rejected as too much ceremony, and it doesn't gain much over social pressure within the room.
- **Topics in URL hash.** Considered. Rejected because the URL gets long with 8–12 topics and it makes mid-meeting additions awkward (everyone has to reload). The shared-Yjs version makes "add billing-router" mid-meeting trivial.

## Future variant

If the tool is used across a multi-team org, the answer is probably a small backend that owns the topic list for an org, and the per-room flow stays unchanged. That's a v2 problem.
