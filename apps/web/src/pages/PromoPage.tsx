import React from "react";

import { promoContent } from "../content/promoContent";

function PromoSectionCard(props: { section: (typeof promoContent.sections)[number] }) {
  const [expanded, setExpanded] = React.useState(false);
  const description = expanded ? props.section.full : props.section.short;

  return (
    <article className="promoStoryCard">
      <div className="promoStoryCopy">
        <span className="promoEyebrow">{props.section.eyebrow}</span>
        <h2>{props.section.title}</h2>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className="promoToggleButton"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Свернуть" : "Подробнее"}
      </button>
    </article>
  );
}

export function PromoPage() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoStarted, setVideoStarted] = React.useState(false);

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
      </section>

      <section className="promoStorySection" id="promo-sections">
        <div className="promoSectionHeading">
          <span className="promoEyebrow">Как это устроено</span>
          <h2>Короткая версия по умолчанию. Детали — по клику внутри блока.</h2>
          <p>
            Мы оставили смысловые блоки компактными, чтобы страницу можно было быстро
            просканировать. Если хочется подробностей, каждый блок раскрывается прямо на месте.
          </p>
        </div>

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
            Лендинг показывает принцип. Сам продукт показывает, как это ощущается в повседневной
            работе команды.
          </p>
        </div>
        <a className="promoPrimaryCta" href={promoContent.hero.primaryCta.href}>
          {promoContent.hero.primaryCta.label}
        </a>
      </section>
    </div>
  );
}
