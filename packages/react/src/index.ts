export { InstagramProvider, useInstagramConfig, type InstagramProviderProps } from "./context/index.js";

export {
  useInstagramFeed,
  useInstagramReels,
  useInstagramProfile,
  useInstagramMedia,
  useInstagramConnection
} from "./hooks/index.js";

export { InstagramGrid } from "./components/InstagramGrid.js";
export { InstagramFeed } from "./components/InstagramFeed.js";
export { InstagramReels } from "./components/InstagramReels.js";
export { InstagramProfile } from "./components/InstagramProfile.js";
export { InstagramConnectButton } from "./components/InstagramConnectButton.js";

export type {
  InstagramReactConfig,
  UseInstagramFeedOptions,
  UseInstagramFeedResult,
  UseInstagramProfileOptions,
  UseInstagramProfileResult,
  UseInstagramMediaOptions,
  UseInstagramMediaResult,
  UseInstagramReelsOptions,
  UseInstagramConnectionOptions,
  UseInstagramConnectionResult,
  InstagramGridProps,
  InstagramFeedProps,
  InstagramReelsProps,
  InstagramProfileProps,
  InstagramConnectButtonProps
} from "./types/index.js";

