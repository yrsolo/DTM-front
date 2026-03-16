import React from "react";

import { promoAssets } from "../content/promoAssets";
import { promoContent } from "../content/promoContent";

function PromoSectionCard(props: { section: (typeof promoContent.sections)[number] }) {
  const [expanded, setExpanded] = React.useState(false);
  const description = expanded ? props.section.full : props.section.short;
  const screenshotUrl = props.section.asset
    ? promoAssets[props.section.asset as keyof typeof promoAssets]
    : null;
  const isMobileAsset = props.section.asset === "promo-mobile-view";

  if (screenshotUrl) {
    return (
      <article className="promoShowcaseCard">
        <div className="promoShowcaseCopy">
          <span className="promoEyebrow">{props.section.eyebrow}</span>
          <h2>{props.section.title}</h2>
          <p>{description}</p>
          <div className="promoSectionActions">
            <button
              type="button"
              className="promoToggleButton"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Свернуть" : "Подробнее"}
            </button>
            {props.section.caption ? (
              <span className="promoSectionCaption">{props.section.caption}</span>
            ) : null}
          </div>
        </div>
        <figure className={`promoShowcaseFigure${isMobileAsset ? " isMobile" : ""}`}>
          <img src={screenshotUrl} alt={props.section.alt ?? props.section.title} />
        </figure>
      </article>
    );
  }

  return (
    <article className="promoStoryCard">
      <div className="promoStoryCopy">
        <span className="promoEyebrow">{props.section.eyebrow}</span>
        <h2>{props.section.title}</h2>
        <p>{description}</p>
        <div className="promoSectionActions">
          <button
            type="button"
            className="promoToggleButton"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Свернуть" : "Подробнее"}
          </button>
        </div>
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
      <section className="promoHero card">
        <div className="promoSilhouette promoSilhouetteLeft" aria-hidden="true" />
        <div className="promoSilhouette promoSilhouetteRight" aria-hidden="true" />

        <div className="promoHeroCopy">
          <span className="promoEyebrow">{promoContent.hero.eyebrow}</span>
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

        <div className="promoHeroVisual">
          <figure className="promoHeroShot">
            <img src={heroScreenshotUrl} alt={promoContent.hero.screenshot.alt} />
            {promoContent.hero.screenshot.caption ? (
              <figcaption>{promoContent.hero.screenshot.caption}</figcaption>
            ) : null}
          </figure>

          <div className="promoVideoCard">
            <div className="promoVideoHeader">
              <span className="promoEyebrow">Видео</span>
              <span className="promoVideoMeta">Короткий обзор работы DTM</span>
            </div>
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
        </div>
      </section>

      <section className="promoStorySection" id="promo-sections">
        <div className="promoStoryGrid">
          {promoContent.sections.map((section) => (
            <PromoSectionCard key={section.id} section={section} />
          ))}
        </div>
      </section>

      <section className="promoFinalCta card">
        <div className="promoFinalCopy">
          <span className="promoEyebrow">Попробовать вживую</span>
          <h2>Открой DTM и посмотри, как таблица превращается в рабочий интерфейс.</h2>
          <p>
            Лендинг показывает принцип. Сам продукт показывает, как это ощущается в
            повседневной работе команды.
          </p>
        </div>
        <a className="promoPrimaryCta" href={promoContent.hero.primaryCta.href}>
          {promoContent.hero.primaryCta.label}
        </a>
      </section>
    </div>
  );
}
