# Privacy threat model — mesh-bus-factor

This tool depends on people answering honestly about systems they could carry alone. The trust contract is "the room sees only the aggregate, never who ticked what."

## What other peers in the same room can see

- The shared **topics list** (a Yjs `Y.Array<string>`).
- The shared **coverage map** (a Yjs `Y.Map<peerId, { knows, wantsToLearn }>`), which is keyed by `peerId`.

So technically the document does contain per-peer entries, even though the UI never renders them. The `peerId` is a `crypto.randomUUID()` generated on first visit and persisted to localStorage — not tied to your name, your IP (other than at the WebRTC layer), or any other identifier. A second device of yours that joins the same room has a different `peerId` and is treated as a separate respondent.

See [ADR 0002](adr/0002-aggregate-only-render.md) for why the per-peer entries exist (needed for edit-in-place semantics) but are never rendered.

## What stays local

- Your `peerId` (in localStorage, namespace `mesh-bus-factor:peerId`).
- Your room ID and signaling/TURN overrides (also localStorage).

## What the signaling server sees

`signaling-server` (mine, source at https://github.com/baditaflorin/signaling-server) sees:

- The **room name** (`mesh-bus-factor:<roomId>`).
- Encrypted **SDP** offer/answer blobs being relayed between peers.
- The IP address of the peer making the WebSocket connection.

It does **not** see topic edits or coverage ticks — those flow peer-to-peer over WebRTC DataChannel after SDP exchange completes.

## What the TURN server sees

`coturn-hetzner` (mine, source at https://github.com/baditaflorin/coturn-hetzner) relays encrypted WebRTC data when peers cannot connect directly. It sees:

- The IP addresses of the two peers being relayed.
- Encrypted DTLS / DataChannel bytes. It cannot decrypt them.

## Permissions asked

None. No camera, microphone, motion, or notifications. The "Connect" button initiates the WebRTC mesh — that's it.

## Caveats

- **`peerId` correlation with IP.** Any peer in the room with packet-capture tooling could correlate the `peerId` in the Yjs map with the IP address it sees on the WebRTC DataChannel. In a small trusted team this is not a meaningful threat — you're in a meeting with these people. In a larger or less-trusted setting, see [ADR 0002 → Alternatives considered](adr/0002-aggregate-only-render.md) for the commit-reveal direction.
- **The UI render is the trust boundary.** The aggregate-only property is enforced by the React component, not the protocol. A modified client could display per-peer rows. This is consistent with the rest of Mode A apps in this collection — see [ADR 0001](adr/0001-deployment-mode.md).
