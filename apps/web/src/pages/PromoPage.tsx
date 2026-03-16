import React from "react";

import { promoAssets } from "../content/promoAssets";
import { promoContent } from "../content/promoContent";

function PromoSectionCard(props: { section: (typeof promoContent.sections)[number] }) {
  const [expanded, setExpanded] = React.useState(false);
  const description = expanded ? props.section.full : props.section.short;
  const toggleLabel = expanded ? "Свернуть" : "Подробнее";
  const screenshotUrl = props.section.asset
    ? promoAssets[props.section.asset as keyof typeof promoAssets]
    : null;
  const isMobileAsset = props.section.asset === "promo-mobile-view";
  const isLeftAligned = props.section.align === "left";

  if (props.section.type === "showcase" && screenshotUrl) {
    return (
      <article className={`promoShowcaseScene${isLeftAligned ? " isReversed" : ""}`}>
        <div className="promoShowcaseCopy">
          <span className="promoSectionKicker">{props.section.eyebrow}</span>
          <h2>{props.section.title}</h2>
          <p>{description}</p>
          <div className="promoInlineActions">
            <button type="button" className="promoTextToggle" onClick={() => setExpanded((value) => !value)}>
              {toggleLabel}
            </button>
            {props.section.caption ? (
              <span className="promoSectionCaption">{props.section.caption}</span>
            ) : null}
          </div>
        </div>
        <figure className={`promoShowcaseVisual${isMobileAsset ? " isMobile" : ""}`}>
          <img src={screenshotUrl} alt={props.section.alt ?? props.section.title} />
        </figure>
      </article>
    );
  }

  if (props.section.type === "summary") {
    return (
      <article className="promoSummaryBand">
        <span className="promoSectionKicker">{props.section.eyebrow}</span>
        <div className="promoSummaryBody">
          <div className="promoSummaryLead">
            <h2>{props.section.title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="promoTextToggle" onClick={() => setExpanded((value) => !value)}>
            {toggleLabel}
          </button>
        </div>
      </article>
    );
  }

  if (props.section.type === "cta") {
    return (
      <section className="promoFinalCta">
        <div className="promoFinalGlow" aria-hidden="true" />
        <div className="promoFinalCopy">
          <span className="promoSectionKicker">{props.section.eyebrow}</span>
          <h2>{props.section.title}</h2>
          <p>{description}</p>
        </div>
        <div className="promoInlineActions">
          <button type="button" className="promoTextToggle promoTextToggleLight" onClick={() => setExpanded((value) => !value)}>
            {toggleLabel}
          </button>
          <a className="promoPrimaryCta" href={promoContent.hero.primaryCta.href}>
            {promoContent.hero.primaryCta.label}
          </a>
        </div>
      </section>
    );
  }

  return (
    <article className="promoEditorialSection">
      <span className="promoSectionKicker">{props.section.eyebrow}</span>
      <div className="promoEditorialBody">
        <h2>{props.section.title}</h2>
        <p>{description}</p>
        <button type="button" className="promoTextToggle" onClick={() => setExpanded((value) => !value)}>
          {toggleLabel}
        </button>
      </div>
    </article>
  );
}

export function PromoPage() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoStarted, setVideoStarted] = React.useState(false);
  const heroScreenshotUrl = promoAssets[promoContent.hero.screenshot.asset as keyof typeof promoAssets];

  const startVideo = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoStarted(true);
    void video.play().catch(() => {
      setVideoStarted(false);
    });
  }, []);

  return (
    <div className="promoPage">
      <section className="promoHero">
        <div className="promoHeroCopy">
          <span className="promoSectionKicker">{promoContent.hero.eyebrow}</span>
          <h1>{promoContent.hero.headline}</h1>
          <p className="promoLead">{promoContent.hero.subheadline}</p>

          <div className="promoCtaRow">
            <a className="promoPrimaryCta" href={promoContent.hero.primaryCta.href}>
              {promoContent.hero.primaryCta.label}
            </a>
            {promoContent.hero.secondaryCta ? (
              <a className="promoSecondaryCta" href={promoContent.hero.secondaryCta.href}>
                {promoContent.hero.secondaryCta.label}
              </a>
            ) : null}
          </div>

          <ul className="promoStatList">
            {promoContent.hero.stats.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <figure className="promoHeroVisual">
          <img src={heroScreenshotUrl} alt={promoContent.hero.screenshot.alt} />
          {promoContent.hero.screenshot.caption ? (
            <figcaption>{promoContent.hero.screenshot.caption}</figcaption>
          ) : null}
        </figure>
      </section>

      <section className="promoVideoStrip" aria-label="Короткий видеообзор DTM">
        <div className="promoVideoCopy">
          <span className="promoSectionKicker">Видео</span>
          <h2>Короткий обзор работы DTM</h2>
          <p>
            Видео остается на странице, но больше не спорит с первым экраном. Здесь
            можно быстро увидеть живой ритм продукта, не ломая главный hero-фокус.
          </p>
        </div>

        <div className="promoVideoCard">
          <div className={`promoVideoFrame${videoStarted ? " isPlaying" : ""}`}>
            <video
              ref={videoRef}
              className="promoVideo"
              src={promoContent.hero.videoUrl}
              preload="metadata"
              controls
              playsInline
            />
            {!videoStarted ? (
              <button type="button" className="promoVideoOverlay" onClick={startVideo}>
                <span className="promoVideoPlay">▶</span>
                <span>Запустить ролик</span>
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="promoStorySection" id="promo-sections">
        {promoContent.sections.map((section) => (
          <PromoSectionCard key={section.id} section={section} />
        ))}
      </section>

      <footer className="promoFooter">
        <div className="promoFooterBrand">
          <strong>DTM</strong>
          <span>Рабочий слой над таблицей для дизайн-команд.</span>
        </div>
        <div className="promoFooterLinks">
          <a href="/">Открыть DTM</a>
          <a href="#promo-sections">Секции</a>
        </div>
      </footer>
    </div>
  );
}
