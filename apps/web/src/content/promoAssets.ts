import { resolvePublicAssetUrl } from "../config/publicPaths";

export type PromoAssetId =
  | "promo-timeline-desktop"
  | "promo-task-drawer"
  | "promo-mobile-view";

export const promoAssets: Record<PromoAssetId, string> = {
  "promo-timeline-desktop": resolvePublicAssetUrl("promo/timeline-desktop.png"),
  "promo-task-drawer": resolvePublicAssetUrl("promo/task-drawer.png"),
  "promo-mobile-view": resolvePublicAssetUrl("promo/mobile-view.png"),
};
