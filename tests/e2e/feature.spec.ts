import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer assertion for the ADVERTISED core action:
 *
 *   "privately tick the systems you could carry; the room sees aggregate
 *    counts only."
 *
 * Peer A adds a topic and privately ticks "can carry"; peer B — the OPPOSITE
 * peer in the same room — must see that topic appear and its aggregate
 * coverage count rise from 0 to 1, without ever seeing who ticked it.
 *
 * Uses a unique topic added by A (rather than a seeded default) so the
 * assertion is immune to the brand-new-room seed race and proves BOTH the
 * Y.Array("topics") and the Y.Map("coverage") cross the mesh.
 *
 * This fails if coverage writes go to local React state instead of the
 * shared Y.Map("coverage"), if the two peers read/write mismatched keys,
 * or if the aggregate never recomputes from the synced doc.
 *
 * NOTE: openTwoPeers runs both pages in ONE browser context, so they share
 * one localStorage origin and therefore one persisted peerId. That models a
 * single device's two tabs, not two devices — so distinct per-peer coverage
 * keys (and counts > 1) cannot be exercised headlessly here. The load-bearing
 * claim is "peer A's private tick is visible as an aggregate on peer B", which
 * this drives directly. Untick on A must also drop B's count back to 0.
 */
test("peer A's private tick raises the aggregate count peer B sees", async ({
  browser,
  baseURL,
}) => {
  const { context, a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Arm both peers (the app gates the mesh room behind a "Connect" click).
    await a.getByRole("button", { name: /connect/i }).click();
    await b.getByRole("button", { name: /connect/i }).click();

    // Peer A adds a unique topic via the inline add form.
    const topic = `kafka-${Math.random().toString(36).slice(2, 7)}`;
    await a.getByLabel("Add a topic").fill(topic);
    await a.getByRole("button", { name: "Add", exact: true }).click();

    // Peer B must SEE the new topic propagate across the mesh (Y.Array sync).
    await expect(b.getByText(topic, { exact: true }).first()).toBeVisible();

    // Locate B's chart row for the new topic; its count starts at 0.
    const bRow = b.locator(".busfactor-row").filter({ has: b.getByText(topic, { exact: true }) });
    const bKnowsBar = bRow.locator(".busfactor-bar-knows .busfactor-bar-num");
    await expect(bKnowsBar).toHaveText("0");

    // Peer A privately ticks "I can carry <topic>".
    await a.getByRole("checkbox", { name: `I can carry ${topic}` }).check();

    // Peer B — the OPPOSITE peer — now sees the aggregate rise to 1
    // (Y.Map("coverage") sync → recomputed aggregate).
    await expect(bKnowsBar).toHaveText("1");

    // Privacy contract: B sees only the count, never any peer identity — the
    // chart must contain no UUID-shaped per-peer key.
    await expect(b.locator(".busfactor-chart")).not.toContainText(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i,
    );

    // Live both ways: when peer A UN-ticks, peer B's aggregate drops back to
    // 0 — proving B re-reads the synced Y.Map rather than caching a stale sum.
    await a.getByRole("checkbox", { name: `I can carry ${topic}` }).uncheck();
    await expect(bKnowsBar).toHaveText("0");
  } finally {
    await cleanup();
    await context.close().catch(() => {});
  }
});
