import { resolvePublicAssetUrl } from "../config/publicPaths";

export const promoAssets = {
  noiseOverlay: resolvePublicAssetUrl("promo/ref-02/noise-overlay.svg"),
  promoVideo: resolvePublicAssetUrl("DTM_lo.mp4"),

  sceneTransition: resolvePublicAssetUrl("promo/ref-02/scene-transition.webp"),
  sceneSystem: resolvePublicAssetUrl("promo/ref-02/scene-system.webp"),
  sceneCurved: resolvePublicAssetUrl("promo/ref-02/scene-curved.webp"),
  sceneTeamBenefits: resolvePublicAssetUrl("promo/ref-02/scene-team-benefits.webp"),
  sceneQuestionsTablet: resolvePublicAssetUrl("promo/ref-02/scene-questions-tablet.webp"),
  sceneAnalyticsPanel: resolvePublicAssetUrl("promo/ref-02/scene-analytics-panel.webp"),
  sceneAnalyticsMonitor: resolvePublicAssetUrl("promo/ref-02/scene-analytics-monitor.webp"),
  sceneAnalyticsStage: resolvePublicAssetUrl("promo/ref-02/scene-analytics-stage.webp"),
  sceneSpeedOrder: resolvePublicAssetUrl("promo/ref-02/scene-speed-order.webp"),
  sceneSecurityShield: resolvePublicAssetUrl("promo/ref-02/scene-security-shield.webp"),
  sceneFinalStage: resolvePublicAssetUrl("promo/ref-02/scene-final-stage.webp"),

  objectTablet: resolvePublicAssetUrl("promo/ref-02/object-tablet.webp"),
  objectPhone: resolvePublicAssetUrl("promo/ref-02/object-phone.webp"),
  objectServer: resolvePublicAssetUrl("promo/ref-02/object-server.webp"),
  objectIconYandex: resolvePublicAssetUrl("promo/ref-02/object-icon-yandex.webp"),
  objectIconSafe: resolvePublicAssetUrl("promo/ref-02/object-icon-safe.webp"),
} as const;

export type PromoAssetId = keyof typeof promoAssets;
