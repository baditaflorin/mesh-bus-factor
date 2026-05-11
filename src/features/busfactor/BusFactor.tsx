import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { createRoomSync, type RoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";

type Coverage = { knows: string[]; wantsToLearn: string[] };

type Props = {
  roomId: string;
  peerId: string;
};

const DEFAULT_TOPICS = [
  "auth",
  "billing",
  "deploy",
  "search",
  "on-call",
  "frontend build",
  "database migrations",
  "observability",
];

export function BusFactor({ roomId, peerId }: Props) {
  const [armed, setArmed] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [coverage, setCoverage] = useState<Map<string, Coverage>>(new Map());
  const [knows, setKnows] = useState<Set<string>>(new Set());
  const [wants, setWants] = useState<Set<string>>(new Set());
  const [peers, setPeers] = useState(0);
  const [copied, setCopied] = useState(false);

  const room = useMemo<RoomSync | null>(() => {
    if (!armed) return null;
    return createRoomSync(roomId);
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      room?.provider?.destroy();
    };
  }, [room]);

  const topicsArrayRef = useRef<Y.Array<string> | null>(null);
  const coverageMapRef = useRef<Y.Map<Coverage> | null>(null);

  useEffect(() => {
    if (!room) return;
    const doc = room.doc;
    const yTopics = doc.getArray<string>("topics");
    const yCoverage = doc.getMap<Coverage>("coverage");
    topicsArrayRef.current = yTopics;
    coverageMapRef.current = yCoverage;

    // Seed defaults if room is empty (only one peer should win, but multiple seeds are idempotent
    // for a brand-new room; Yjs will reconcile).
    doc.transact(() => {
      if (yTopics.length === 0) {
        yTopics.push([...DEFAULT_TOPICS]);
      }
    });

    const refreshTopics = () => setTopics(yTopics.toArray());
    const refreshCoverage = () => {
      const next = new Map<string, Coverage>();
      yCoverage.forEach((v, k) => next.set(k, v));
      setCoverage(next);
    };
    refreshTopics();
    refreshCoverage();
    yTopics.observe(refreshTopics);
    yCoverage.observe(refreshCoverage);

    const own = yCoverage.get(peerId);
    if (own) {
      setKnows(new Set(own.knows));
      setWants(new Set(own.wantsToLearn));
    }

    const awareness = room.provider?.awareness;
    const updatePeerCount = () => {
      setPeers(awareness ? awareness.getStates().size : 1);
    };
    awareness?.on("change", updatePeerCount);
    updatePeerCount();

    return () => {
      yTopics.unobserve(refreshTopics);
      yCoverage.unobserve(refreshCoverage);
      awareness?.off("change", updatePeerCount);
    };
  }, [room, peerId]);

  function persistCoverage(nextKnows: Set<string>, nextWants: Set<string>) {
    const yCoverage = coverageMapRef.current;
    if (!yCoverage) return;
    yCoverage.set(peerId, {
      knows: Array.from(nextKnows),
      wantsToLearn: Array.from(nextWants),
    });
  }

  function toggleKnow(topic: string) {
    setKnows((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      persistCoverage(next, wants);
      return next;
    });
  }
  function toggleWant(topic: string) {
    setWants((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      persistCoverage(knows, next);
      return next;
    });
  }

  function addTopic(raw: string) {
    const yTopics = topicsArrayRef.current;
    if (!yTopics) return;
    const t = raw.trim();
    if (!t) return;
    if (yTopics.toArray().includes(t)) return;
    yTopics.push([t]);
  }
  function removeTopic(topic: string) {
    const yTopics = topicsArrayRef.current;
    const yCoverage = coverageMapRef.current;
    if (!yTopics || !yCoverage) return;
    const arr = yTopics.toArray();
    const idx = arr.indexOf(topic);
    if (idx >= 0) yTopics.delete(idx, 1);
    yCoverage.forEach((v, k) => {
      if (v.knows.includes(topic) || v.wantsToLearn.includes(topic)) {
        yCoverage.set(k, {
          knows: v.knows.filter((x) => x !== topic),
          wantsToLearn: v.wantsToLearn.filter((x) => x !== topic),
        });
      }
    });
  }
  function clearCoverage() {
    const yCoverage = coverageMapRef.current;
    if (!yCoverage) return;
    yCoverage.doc?.transact(() => {
      yCoverage.clear();
    });
    setKnows(new Set());
    setWants(new Set());
  }

  // Aggregates
  const aggregates = useMemo(() => {
    const knowsCount = new Map<string, number>();
    const wantsCount = new Map<string, number>();
    for (const t of topics) {
      knowsCount.set(t, 0);
      wantsCount.set(t, 0);
    }
    coverage.forEach((v) => {
      for (const t of v.knows) knowsCount.set(t, (knowsCount.get(t) ?? 0) + 1);
      for (const t of v.wantsToLearn) wantsCount.set(t, (wantsCount.get(t) ?? 0) + 1);
    });
    const rows = topics.map((t) => ({
      topic: t,
      knows: knowsCount.get(t) ?? 0,
      wants: wantsCount.get(t) ?? 0,
    }));
    rows.sort((a, b) => a.knows - b.knows || a.topic.localeCompare(b.topic));
    return rows;
  }, [topics, coverage]);

  const maxKnows = Math.max(1, ...aggregates.map((r) => Math.max(r.knows, r.wants)));

  async function copyMarkdown() {
    const lines = [
      `# Bus factor — room \`${roomId}\``,
      "",
      `Snapshot taken with ${coverage.size} respondents.`,
      "",
      "| Topic | Can carry | Want to learn |",
      "|---|---|---|",
      ...aggregates.map((r) => `| ${r.topic} | ${r.knows} | ${r.wants} |`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  if (!armed) {
    return (
      <div className="busfactor-arm">
        <h1>mesh-bus-factor</h1>
        <p>
          A 2-hour team exercise. Privately tick which systems you could carry alone. The room sees
          only the aggregate — never who ticked what. The lowest bar is your team's bus-factor 1
          risk.
        </p>
        <button type="button" className="busfactor-arm-button" onClick={() => setArmed(true)}>
          Connect
        </button>
        <p className="busfactor-hint">
          Room <code>{roomId}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="busfactor-stage">
      <div className="busfactor-hud">
        <span>{peers} phones</span>
        <span>·</span>
        <span>{coverage.size} responses</span>
        <span>·</span>
        <span>{topics.length} topics</span>
      </div>

      <section className="busfactor-chart" aria-label="coverage chart">
        {aggregates.length === 0 ? (
          <p className="busfactor-empty">No topics yet — add some in Settings.</p>
        ) : (
          aggregates.map((row) => {
            const atRisk = row.knows <= 1;
            return (
              <div className="busfactor-row" key={row.topic}>
                <div className="busfactor-label" title={row.topic}>
                  {row.topic}
                </div>
                <div className="busfactor-bars">
                  <div
                    className={`busfactor-bar busfactor-bar-knows${atRisk ? " busfactor-bar-risk" : ""}`}
                    style={{ width: `${(row.knows / maxKnows) * 100}%` }}
                  >
                    <span className="busfactor-bar-num">{row.knows}</span>
                  </div>
                  {row.wants > 0 && (
                    <div
                      className="busfactor-bar busfactor-bar-wants"
                      style={{ width: `${(row.wants / maxKnows) * 100}%` }}
                    >
                      <span className="busfactor-bar-num">{row.wants} want</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="busfactor-self">
        <h2>Your private ticks</h2>
        <p className="busfactor-self-help">Only counts leave your phone. Names never do.</p>
        {topics.map((t) => {
          const k = knows.has(t);
          const w = wants.has(t);
          return (
            <div className="busfactor-self-row" key={t}>
              <span className="busfactor-self-topic">{t}</span>
              <label className={`busfactor-check${k ? " busfactor-check-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={k}
                  onChange={() => toggleKnow(t)}
                  aria-label={`I can carry ${t}`}
                />
                <span>can carry</span>
              </label>
              <label
                className={`busfactor-check busfactor-check-want${w ? " busfactor-check-on" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={w}
                  onChange={() => toggleWant(t)}
                  aria-label={`I want to learn ${t}`}
                />
                <span>want to learn</span>
              </label>
            </div>
          );
        })}

        <AddTopicInline onAdd={addTopic} />

        <details className="busfactor-manage">
          <summary>Manage topics</summary>
          <ul>
            {topics.map((t) => (
              <li key={t}>
                <span>{t}</span>
                <button type="button" onClick={() => removeTopic(t)} aria-label={`Remove ${t}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="busfactor-danger" onClick={clearCoverage}>
            Clear all coverage in this room
          </button>
        </details>

        <button type="button" className="busfactor-copy" onClick={copyMarkdown}>
          {copied ? "Copied!" : "Copy as markdown"}
        </button>
      </section>
    </div>
  );
}

function AddTopicInline({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="busfactor-add"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(v);
        setV("");
      }}
    >
      <input
        placeholder="Add a topic…"
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label="Add a topic"
      />
      <button type="submit">Add</button>
    </form>
  );
}
