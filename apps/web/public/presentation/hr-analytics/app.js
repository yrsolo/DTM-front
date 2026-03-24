const content = window.hrAnalyticsContent;

const iconPaths = {
  layers: '<path d="M4 8l8-4 8 4-8 4-8-4Z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
  spark: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m6 6 2.5 2.5"/><path d="m15.5 15.5 2.5 2.5"/><path d="m18 6-2.5 2.5"/><path d="m8.5 15.5-2.5 2.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 4.13a4 4 0 0 1 0 7.75"/>',
  briefcase: '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 12h18"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
  checklist: '<path d="M9 11l2 2 4-4"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/><path d="M16 5h5v5"/>',
  gauge: '<path d="M12 14 16.5 9.5"/><path d="M20.4 15a8 8 0 1 0-16.8 0"/><path d="M8 18h8"/>',
  automation: '<path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/><circle cx="12" cy="12" r="3"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.54 21h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>',
  database: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/><path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"/>',
  analytics: '<path d="M4 19h16"/><path d="M7 15V9"/><path d="M12 15V5"/><path d="M17 15v-3"/>',
  dashboard: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  process: '<rect x="3" y="4" width="6" height="6" rx="2"/><rect x="15" y="4" width="6" height="6" rx="2"/><rect x="9" y="14" width="6" height="6" rx="2"/><path d="M9 7h6"/><path d="M12 10v4"/>',
  network: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><circle cx="11" cy="12" r="2.5"/><path d="M7.5 12H8.5"/><path d="M12.5 11l4-4"/><path d="M12.5 13l4 4"/>',
};

function renderIcon(name, accent) {
  const paths = iconPaths[name] || iconPaths.layers;
  return `<span class="iconBadge iconAccent-${accent}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg></span>`;
}

function renderSlideIntro(containerId, slide) {
  const host = document.getElementById(containerId);
  if (!host) return;
  host.innerHTML = `<span class="slideIndex">Слайд ${slide.id}</span><div><h2>${slide.title}</h2><p>${slide.subtitle}</p></div>`;
}

function renderHero(slide) {
  document.getElementById("hero-title").textContent = "Аналитический HR-отчет по метрикам найма";
  document.getElementById("hero-lead").textContent = slide.heroLead;
  document.getElementById("hero-layout-note").textContent = slide.layoutNotes;

  document.getElementById("hero-summary").innerHTML = slide.summaryPoints
    .map((item) => `<div class="summaryItem">${renderIcon(item.icon, item.accent)}<div class="summaryText"><strong>${item.title}</strong><span>${item.text}</span></div></div>`)
    .join("");

  document.getElementById("hero-stats").innerHTML = slide.heroMetrics
    .map((item) => `<article class="metricCard">${renderIcon(item.icon, item.accent)}<span class="metricLabel">${item.label}</span><strong class="metricValue" data-counter="${item.value}" data-suffix="${item.suffix ?? ""}">${item.value}${item.suffix ?? ""}</strong></article>`)
    .join("");
}

function renderStageTable(stageRows) {
  const body = document.getElementById("stage-table-body");
  if (!body) return;
  body.innerHTML = stageRows.map((row) => `<tr><td>${row.stage}</td><td>${row.count}</td><td>${row.responseConversion}</td><td>${row.stageConversion}</td></tr>`).join("");
}

function renderMiniMetrics(containerId, items) {
  const host = document.getElementById(containerId);
  if (!host) return;
  host.innerHTML = items
    .map((item) => `<div class="miniMetric">${renderIcon(item.icon, item.accent)}<div class="miniMetricCopy"><span>${item.label}</span><strong>${item.value}</strong></div></div>`)
    .join("");
}

function renderResponseChart(stageRows) {
  const host = document.getElementById("response-chart");
  if (!host) return;
  host.innerHTML = [...stageRows].reverse().map((row) => `<div class="barRow"><div class="barLabel">${row.stage}</div><div class="barTrack"><div class="barFill" style="width:${row.responseConversion}%"></div></div><div class="barValue">${row.responseConversion}%</div></div>`).join("");
}

function renderFunnelChart(stageRows) {
  const host = document.getElementById("funnel-chart");
  if (!host) return;
  host.innerHTML = stageRows.map((row) => `<div class="funnelRow"><div class="funnelLabel"><span>${row.stage}</span><span>${row.stageConversion}%</span></div><div class="funnelBar" style="width:${Math.max(22, row.stageConversion)}%">${row.stageConversion}%</div></div>`).join("");
}

function renderInsights(items) {
  const host = document.getElementById("insights");
  if (!host) return;
  host.innerHTML = items
    .map((item) => `<article class="insightCard ${item.risk ? "insightCardRisk" : ""}"><div class="insightHead">${renderIcon(item.icon, item.accent)}<div><span class="insightTag">${item.type}</span><h3>${item.title}</h3></div></div>${(item.paragraphs || []).map((paragraph) => `<p>${paragraph}</p>`).join("")}${item.bullets ? `<ul>${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>` : ""}</article>`)
    .join("");
}

function renderTaskUniverse(slide) {
  document.getElementById("slide-2-layout-note").textContent = slide.layoutNotes;
  document.getElementById("task-universe-grid").innerHTML = slide.cards
    .map((task) => `<article class="taskItem"><div class="taskHeader"><span class="taskNum">${task.id}</span>${renderIcon(task.icon, task.accent)}<h3>${task.title}</h3></div><ul>${task.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul></article>`)
    .join("");
}

function renderJourney(slide) {
  document.getElementById("slide-3-layout-note").textContent = slide.layoutNotes;
  document.getElementById("journey-steps").innerHTML = slide.steps
    .map((step) => `<article class="journeyStep"><div class="journeyStepHead"><span class="journeyBadge">${step.id}</span>${renderIcon(step.icon, step.accent)}<h3>${step.title}</h3></div><p>${step.summary}</p><ul>${step.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul></article>`)
    .join("");
}

function animateCounters() {
  const values = document.querySelectorAll("[data-counter]");
  const formatNumber = (value, suffix) => `${new Intl.NumberFormat("ru-RU").format(value)}${suffix ?? ""}`;
  values.forEach((node) => {
    const target = Number(node.getAttribute("data-counter") || "0");
    const suffix = node.getAttribute("data-suffix") || "";
    const startedAt = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / 900);
      const current = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      node.textContent = formatNumber(current, suffix);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function boot() {
  if (!content?.slides?.length) return;
  const [slide1, slide2, slide3] = content.slides;
  renderSlideIntro("slide-1-intro", slide1);
  renderSlideIntro("slide-2-intro", slide2);
  renderSlideIntro("slide-3-intro", slide3);
  renderHero(slide1);
  renderStageTable(slide1.stageRows);
  renderMiniMetrics("summary-metrics", slide1.summaryMetrics);
  renderMiniMetrics("analysis-metrics", slide1.analysisMetrics);
  renderResponseChart(slide1.stageRows);
  renderFunnelChart(slide1.stageRows);
  renderInsights(slide1.insights);
  renderTaskUniverse(slide2);
  renderJourney(slide3);
  animateCounters();
}

boot();
