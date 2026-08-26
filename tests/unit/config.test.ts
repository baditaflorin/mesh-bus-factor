import { describe, expect, it } from "vitest";
import { appConfig } from "../../src/shared/config";

describe("appConfig", () => {
  it("keeps Bus Factor's stable identity and canonical app endpoints", () => {
    expect(appConfig).toMatchObject({
      appName: "mesh-bus-factor",
      storagePrefix: "mesh-bus-factor",
      repositoryUrl: "https://github.com/baditaflorin/mesh-bus-factor",
      pagesUrl: "https://baditaflorin.github.io/mesh-bus-factor/",
    });
    expect(appConfig.description).toContain("bus-factor");
    expect(appConfig.accentHex).toMatch(/^#[\da-f]{6}$/i);
    expect(appConfig.signalingUrl).toMatch(/^wss:\/\//);
    expect(appConfig.turnTokenUrl).toMatch(/^https:\/\//);
  });
});
