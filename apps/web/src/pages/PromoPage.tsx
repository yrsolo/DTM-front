import "../styles/promo.css";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { promoAssets } from "../content/promoAssets";
import { promoContent } from "../content/promoContent";

const PROMO_DESIGN_WIDTH = 1920;
const PROMO_PAGE_GUTTER = 48;

function renderActions(
  actions: ReadonlyArray<{ label: string; href: string; tone?: "primary" | "secondary" }> | undefined,
) {
  if (!actions?.length) {
    return null;
  }

  return (
    <div className="promoActions">
      {actions.map((action) => (
        <a
          key={`${action.href}-${action.label}`}
          className={action.tone === "primary" ? "promoAction promoAction--primary" : "promoAction"}
          href={action.href}
        >
          {action.label}
        </a>
      ))}
    </div>
  );
}

function renderBullets(items: ReadonlyArray<string> | undefined) {
  if (!items?.length) {
    return null;
  }

  return (
    <ul className="promoBullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PromoPage() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [sceneHeight, setSceneHeight] = useState(0);
  const [navHeight, setNavHeight] = useState(78);

  const coreNav = promoContent.screens.filter((screen) =>
    [
      "promo-hero",
      "promo-system",
      "promo-phone",
      "promo-benefits",
      "promo-analytics-panel",
      "promo-security",
      "promo-stack",
    ].includes(screen.id),
  );

  const [hero, transition, system, phone, curved, benefits, questions, analyticsPanel, analyticsMonitor, analyticsStage, speedOrder, security, stack, finalStage] =
    promoContent.screens;

  useEffect(() => {
    const updateScale = () => {
      const nextScale = Math.min(1, Math.max(0.2, (window.innerWidth - PROMO_PAGE_GUTTER) / PROMO_DESIGN_WIDTH));
      setScale(nextScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      if (sceneRef.current) {
        setSceneHeight(sceneRef.current.scrollHeight);
      }

      if (navRef.current) {
        setNavHeight(navRef.current.offsetHeight);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    if (sceneRef.current) {
      resizeObserver.observe(sceneRef.current);
    }

    if (navRef.current) {
      resizeObserver.observe(navRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const scaledWidth = useMemo(() => PROMO_DESIGN_WIDTH * scale, [scale]);
  const landingStyle = useMemo(
    () =>
      ({
        "--promo-scale": String(scale),
      }) as CSSProperties,
    [scale],
  );

  return (
    <div className="promoLanding" style={landingStyle}>
      <div
        className="promoLanding__noiseShell"
        style={{ width: `${scaledWidth}px`, height: `${sceneHeight * scale}px` }}
        aria-hidden="true"
      >
        <div className="promoLanding__noiseLayer">
          <img className="promoLanding__noise" src={promoAssets.noiseOverlay} alt="" aria-hidden="true" />
        </div>
      </div>

      <header className="promoGlassNav">
        <div className="promoGlassNav__shell" style={{ width: `${scaledWidth}px`, height: `${navHeight * scale}px` }}>
          <div className="promoGlassNav__inner" ref={navRef}>
          <a className="promoGlassNav__brand" href="/" aria-label="Open DTM table">
              <span className="promoGlassNav__brandMark">
                <img className="promoGlassNav__brandIcon" src={promoAssets.brandLogo} alt="" aria-hidden="true" />
                <span className="promoGlassNav__brandWord">DTM</span>
              </span>
            </a>

            <nav className="promoGlassNav__links" aria-label="Promo navigation">
              {coreNav.map((link) => (
                <a key={link.id} href={`#${link.id}`}>
                  {link.navLabel}
                </a>
              ))}
            </nav>

            <a className="promoGlassNav__cta" href={promoContent.navigation.cta.href}>
              {promoContent.navigation.cta.label}
            </a>
          </div>
        </div>
      </header>

      <main className="promoLanding__main" style={{ width: `${scaledWidth}px`, height: `${sceneHeight * scale}px` }}>
        <div className="promoLanding__scene" ref={sceneRef}>
          <section className="promoHero" id={hero.id}>
            <div className="promoHero__inner">
              <div className="promoText promoText--hero">
                {hero.eyebrow ? <p className="promoText__eyebrow">{hero.eyebrow}</p> : null}
                <h1 className="promoText__title">
                  {hero.title?.map((line) => <span key={line}>{line}</span>)}
                </h1>
                <div className="promoText__body">
                  {hero.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                {renderActions(hero.actions)}
              </div>

              <div className="promoHero__visual" aria-hidden="true">
                <img src={promoAssets.objectTablet} alt="" />
              </div>
            </div>
          </section>

          <section className="promoTransition" id={transition.id}>
            <img className="promoTransition__backdrop" src={promoAssets.sceneTransition} alt="" aria-hidden="true" />
            <div className="promoTransition__frame">
              <video
                className="promoTransition__video"
                src={promoAssets.promoVideo}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </section>

          <section className="promoSection promoSection--system promoSection--right" id={system.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--system" aria-hidden="true">
              <img src={promoAssets.sceneSystem} alt="" />
            </div>
            <div className="promoText promoText--right">
              {system.eyebrow ? <p className="promoText__eyebrow">{system.eyebrow}</p> : null}
              <h2 className="promoText__title">
                {system.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {system.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderActions(system.actions)}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--phone promoSection--left" id={phone.id}>
          <div className="promoSection__inner">
            <div className="promoText promoText--hero">
              {phone.eyebrow ? <p className="promoText__eyebrow">{phone.eyebrow}</p> : null}
              <h2 className="promoText__title">
                {phone.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {phone.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>

            <div className="promoSection__object promoSection__object--phone" aria-hidden="true">
              <img src={promoAssets.objectPhone} alt="" />
              {phone.objectCaption ? <span>{phone.objectCaption}</span> : null}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--curved promoSection--right" id={curved.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--full" aria-hidden="true">
              <img src={promoAssets.sceneCurved} alt="" />
            </div>
            <div className="promoText promoText--right promoText--medium">
              {curved.eyebrow ? <p className="promoText__eyebrow">{curved.eyebrow}</p> : null}
              <h2 className="promoText__title">
                {curved.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {curved.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderBullets(curved.bullets)}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--benefits" id={benefits.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--full" aria-hidden="true">
              <img src={promoAssets.sceneTeamBenefits} alt="" />
            </div>
            <div className="promoText promoText--benefits">
              <h2 className="promoText__title">
                {benefits.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {benefits.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
            <div className="promoFeatureRow">
              {benefits.featureItems?.map((item) => (
                <article key={item.title} className="promoFeatureCard">
                  {item.icon ? (
                    <span
                      className={`promoFeatureCard__icon promoFeatureCard__icon--${item.icon}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--questions" id={questions.id}>
          <div className="promoSection__inner">
            <div className="promoText promoText--center">
              <h2 className="promoText__title">
                {questions.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body promoText__body--center">
                {questions.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
            <div className="promoSection__visual promoSection__visual--questions" aria-hidden="true">
              <img src={promoAssets.sceneQuestionsTablet} alt="" />
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--panel" id={analyticsPanel.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--panel" aria-hidden="true">
              <img src={promoAssets.sceneAnalyticsPanel} alt="" />
            </div>
            <div className="promoText promoText--panel">
              <h2 className="promoText__title">
                {analyticsPanel.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {analyticsPanel.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--monitor promoSection--right" id={analyticsMonitor.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--monitor" aria-hidden="true">
              <img src={promoAssets.sceneAnalyticsMonitor} alt="" />
            </div>
            <div className="promoText promoText--right promoText--compact">
              <h2 className="promoText__title">
                {analyticsMonitor.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {analyticsMonitor.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderBullets(analyticsMonitor.bullets)}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--stage promoSection--left" id={analyticsStage.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--full" aria-hidden="true">
              <img src={promoAssets.sceneAnalyticsStage} alt="" />
            </div>
            <div className="promoText promoText--hero promoText--stage">
              {analyticsStage.eyebrow ? <p className="promoText__eyebrow">{analyticsStage.eyebrow}</p> : null}
              <h2 className="promoText__title">
                {analyticsStage.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {analyticsStage.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderBullets(analyticsStage.bullets)}
              {renderActions(analyticsStage.actions)}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--speed promoSection--right" id={speedOrder.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--flow" aria-hidden="true">
              <img src={promoAssets.sceneSpeedOrder} alt="" />
            </div>
            <div className="promoText promoText--right promoText--compact">
              <h2 className="promoText__title">
                {speedOrder.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {speedOrder.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderBullets(speedOrder.bullets)}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--security" id={security.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--shield" aria-hidden="true">
              <img src={promoAssets.sceneSecurityShield} alt="" />
            </div>
            <div className="promoText promoText--security">
              {security.eyebrow ? <p className="promoText__eyebrow">{security.eyebrow}</p> : null}
              <h2 className="promoText__title">
                {security.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {security.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
            <div className="promoIconCards">
              {security.iconCards?.map((item) => (
                <article key={item.title} className="promoIconCard">
                  {item.iconAsset ? <img src={promoAssets[item.iconAsset]} alt="" aria-hidden="true" /> : null}
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--stack promoSection--right" id={stack.id}>
          <div className="promoSection__inner">
            <div className="promoSection__object promoSection__object--server" aria-hidden="true">
              <img src={promoAssets.objectServer} alt="" />
            </div>
            <div className="promoText promoText--right promoText--compact">
              {stack.eyebrow ? <p className="promoText__eyebrow">{stack.eyebrow}</p> : null}
              <h2 className="promoText__title">
                {stack.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {stack.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderBullets(stack.bullets)}
            </div>
          </div>
          </section>

          <section className="promoSection promoSection--final" id={finalStage.id}>
          <div className="promoSection__inner">
            <div className="promoSection__visual promoSection__visual--final" aria-hidden="true">
              <img src={promoAssets.sceneFinalStage} alt="" />
            </div>
            <div className="promoText promoText--final">
              <h2 className="promoText__title">
                {finalStage.title?.map((line) => <span key={line}>{line}</span>)}
              </h2>
              <div className="promoText__body">
                {finalStage.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {renderActions(finalStage.actions)}
            </div>
          </div>
          </section>
        </div>
      </main>
    </div>
  );
}
