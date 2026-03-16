import promoContentJson from "./promoContent.json";

export type PromoAction = {
  label: string;
  href: string;
};

export type PromoHero = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  videoUrl: string;
  primaryCta: PromoAction;
  secondaryCta?: PromoAction;
  stats: string[];
};

export type PromoSection = {
  id: string;
  eyebrow: string;
  title: string;
  short: string;
  full: string;
};

export type PromoContent = {
  hero: PromoHero;
  sections: PromoSection[];
};

export const promoContent = promoContentJson as PromoContent;
