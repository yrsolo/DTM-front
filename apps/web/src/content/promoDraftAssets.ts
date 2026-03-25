import { resolvePublicAssetUrl } from "../config/publicPaths";

export const promoDraftAssetUrls = {
  dtmLogo: resolvePublicAssetUrl("dtm_ico_256x256.png"),
  heroFull: resolvePublicAssetUrl("promo/penpot-draft/hf_20260316_210039_9166e0bd-06cb-4985-a597-7053558176f8.webp"),
  heroGlow: resolvePublicAssetUrl("promo/penpot-draft/hero-glow-from-penpot.webp"),
  topStrip: resolvePublicAssetUrl("promo/penpot-draft/top-strip-from-penpot.png"),
  videoFrame: resolvePublicAssetUrl("promo/penpot-draft/video-frame-from-penpot.png"),
  scene192815: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192815_b610f131-2d6a-42ec-ad75-91680ffaaccd.webp"),
  systemScene: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192939_d92165da-8558-4c87-9074-f0c0ede19a38.webp"),
  mobileScene: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192941_0eb5f40f-1a12-4982-a0e8-d174fbd1c462.webp"),
  problemScene: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192813_d73583d4-31d6-4fc1-b9fc-23789543eba1.webp"),
  scene031324: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_031324_f832d7bf-5a55-4dbb-8b3e-cd2b9c6d7734.webp"),
  scene192812: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192812_8d370bb5-0550-4073-8990-5b0741229e98.webp"),
  benefitsScene: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192920_4869906f-b198-487e-9d8d-cefd3ce54483.webp"),
  scene192933: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192933_fb330689-1f22-49c3-8642-37fe97297435.webp"),
  scene192947: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_192947_02ff1162-ebe4-4107-9357-045f42fd8841.webp"),
  scene032638: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_032638_61105319-f625-47f5-b76f-3fe5f7a6d7f4.webp"),
  scene032640: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_032640_849c29bb-3222-4ba8-abec-3b7a606c04fb.webp"),
  scene221330: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_221330_6f543a8f-5276-4b71-b906-3d168aa6e480.webp"),
  scene221336: resolvePublicAssetUrl("promo/penpot-draft/hf_20260317_221336_a8fb8077-ba77-4984-87f3-6388a4f7353e.webp"),
} as const;

export type PromoDraftAssetKey = keyof typeof promoDraftAssetUrls;
