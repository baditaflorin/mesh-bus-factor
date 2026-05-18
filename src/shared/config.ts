export const appConfig = {
  appName: "mesh-bus-factor",
  storagePrefix: "mesh-bus-factor",
  description:
    "Peer-to-peer mesh: anonymous bus-factor map. Engineers tick systems they could carry; surfaces single points of failure.",
  accentHex: "#3fd4eb",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-bus-factor",
  pagesUrl: "https://baditaflorin.github.io/mesh-bus-factor/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
