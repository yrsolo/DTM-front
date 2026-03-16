import promoContentJson from "./promoContent.json";

export type PromoAction = {
  label: string;
  href: string;
};

export type PromoScreenshotRef = {
  asset: string;
  alt: string;
  caption?: string;
};

export type PromoHero = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  videoUrl: string;
  screenshot: PromoScreenshotRef;
  primaryCta: PromoAction;
  secondaryCta?: PromoAction;
  stats: string[];
};

export type PromoSection = {
  id: string;
  type: "editorial" | "showcase" | "summary" | "cta";
  eyebrow: string;
  title: string;
  short: string;
  full: string;
  asset?: string;
  align?: "left" | "right";
  alt?: string;
  caption?: string;
};

export type PromoContent = {
  hero: PromoHero;
  sections: PromoSection[];
};

export const promoContent = promoContentJson as PromoContent;
