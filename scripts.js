const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.2 }
);

function observeReveals() {
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

observeReveals();

const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav]");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
    });
  });
}

function setActiveNav() {
  const path = window.location.pathname || "/";
  let target = "";
  if (path.startsWith("/label")) {
    target = "/label/";
  } else if (path.startsWith("/artists") || path.startsWith("/artist/")) {
    target = "/artists/";
  } else if (path === "/" || path === "/index.html") {
    target = "/";
  }

  if (!target) return;
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === target) {
      link.classList.add("active");
    }
  });
}

function loadData() {
  const fallback = window.KAH_DATA || {};
  const dataVersion = fallback.settings ? fallback.settings.dataVersion : "";
  try {
    const saved = localStorage.getItem("kah-prod-data");
    if (saved) {
      const parsed = JSON.parse(saved);
      const savedVersion = parsed && parsed.settings ? parsed.settings.dataVersion : "";
      if (!dataVersion || dataVersion === savedVersion) {
        return mergeDeep(fallback, parsed);
      }
    }
  } catch (error) {
    return fallback;
  }
  return fallback;
}

function mergeDeep(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }
  if (base && typeof base === "object") {
    const result = { ...base };
    if (override && typeof override === "object" && !Array.isArray(override)) {
      Object.keys(override).forEach((key) => {
        if (override[key] === undefined) return;
        result[key] = mergeDeep(base[key], override[key]);
      });
    }
    return result;
  }
  return override !== undefined ? override : base;
}

let DATA = loadData();
window.KAH_ACTIVE_DATA = DATA;

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node && value) node.textContent = value;
}

function setLink(selector, value, label) {
  const node = document.querySelector(selector);
  if (!node || !value) return;
  node.setAttribute("href", value);
  node.textContent = label || value;
}

function formatInstagram(url) {
  if (!url) return "";
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  if (match && match[1]) {
    return `@${match[1]}`;
  }
  return url;
}

function getPlaceholder(key) {
  return DATA.placeholders ? DATA.placeholders[key] : "";
}

function applyMedia(element, src, fallbackLetter) {
  if (!element) return;
  if (src) {
    element.style.backgroundImage = `url(${src})`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.textContent = "";
    element.removeAttribute("data-letter");
    return;
  }
  const placeholder = getPlaceholder("artist");
  if (placeholder) {
    element.style.backgroundImage = `url(${placeholder})`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.textContent = "";
    element.removeAttribute("data-letter");
    return;
  }
  if (fallbackLetter) {
    element.setAttribute("data-letter", fallbackLetter);
  }
}

function renderHero() {
  if (!DATA.hero) return;
  setText("[data-hero-pill]", DATA.hero.pill);
  setText("[data-hero-title]", DATA.hero.title);
  setText("[data-hero-subtitle]", DATA.hero.subtitle);
  setText("[data-hero-desc]", DATA.hero.description);
  setText("[data-hero-tag]", DATA.hero.highlightTag);

  if (DATA.stats) {
    const statsWrap = document.querySelector("[data-hero-stats]");
    if (statsWrap) {
      statsWrap.innerHTML = DATA.stats
        .map(
          (stat) => `
        <div>
          <span class="stat">${stat.value}</span>
          <span class="label">${stat.label}</span>
        </div>
      `
        )
        .join("");
    }
  }

  if (DATA.hero.release) {
    setText("[data-release-label]", DATA.hero.release.label);
    setText("[data-release-title]", DATA.hero.release.title);
    setText("[data-release-artist]", DATA.hero.release.artist);
    setText("[data-release-desc]", DATA.hero.release.description);
    setText("[data-release-date]", `Sortie : ${DATA.hero.release.date}`);
    setText("[data-release-meta]", DATA.hero.release.meta);
  }

  const heroVisual = document.querySelector(".hero-visual");
  if (heroVisual) {
    const heroBg = DATA.hero.background || getPlaceholder("hero");
    if (heroBg) {
      heroVisual.style.backgroundImage = `url(${heroBg})`;
      heroVisual.style.backgroundSize = "cover";
      heroVisual.style.backgroundPosition = "center";
      heroVisual.classList.add("has-bg");
    } else {
      heroVisual.classList.remove("has-bg");
    }
  }
}

function renderSignature() {
  const wrap = document.querySelector("[data-signature]");
  if (!wrap || !DATA.signature) return;
  wrap.innerHTML = DATA.signature
    .map(
      (item) => `
      <div class="feature-card reveal">
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </div>
    `
    )
    .join("");
}

function renderFeatured() {
  const wrap = document.querySelector("[data-featured]");
  if (!wrap) return;
  const featured = DATA.featured || {};
  const artist =
    (DATA.artists || []).find((item) => item.slug === featured.slug) ||
    (DATA.artists || [])[0];
  if (!artist) return;

  const metrics = featured.metrics || artist.metrics || [];
  const metricsHtml = metrics
    .map(
      (metric) => `
      <div>
        <span class="stat">${metric.value}</span>
        <span class="label">${metric.label}</span>
      </div>
    `
    )
    .join("");

  wrap.innerHTML = `
    <div class="featured-card reveal">
      <div class="featured-media" data-photo="${artist.photo || ""}" data-letter="${
    artist.name ? artist.name[0] : "K"
  }"></div>
      <div class="featured-content">
        <div class="pill">${featured.tag || "Artiste phare"}</div>
        <h3>${artist.name}</h3>
        <p>${featured.description || artist.bio}</p>
        <div class="featured-metrics">${metricsHtml}</div>
        <div class="hero-actions">
          <a class="cta" href="/artist/${artist.slug}/">Voir le profil</a>
          <a class="ghost" href="/#releases">Discographie</a>
        </div>
      </div>
    </div>
  `;
}

function renderArtists() {
  const wrap = document.querySelector("[data-artists]");
  if (wrap && DATA.artists) {
    wrap.innerHTML = DATA.artists
      .map((artist) => {
        const badges = [];
        if (artist.flagship || (DATA.featured && artist.slug === DATA.featured.slug)) badges.push("Phare");
        if (artist.status) badges.push(artist.status);
        return `
        <article class="artist-card reveal">
          ${badges.map((badge) => `<span class="badge">${badge}</span>`).join("")}
          <div class="artist-photo" data-letter="${artist.name ? artist.name[0] : "K"}" data-photo="${artist.photo || ""}"></div>
          <div class="artist-info">
            <h3>${artist.name}</h3>
            <p>${artist.style} - ${artist.city}</p>
            <span>${artist.highlight || ""}</span>
            <a class="link" href="/artist/${artist.slug}/">Voir le profil</a>
          </div>
        </article>
      `;
      })
      .join("");
  }

  const roster = document.querySelector("[data-roster]");
  if (roster && DATA.artists) {
    roster.innerHTML = DATA.artists
      .map((artist) => {
        const badges = [];
        if (artist.flagship || (DATA.featured && artist.slug === DATA.featured.slug)) badges.push("Phare");
        if (artist.status) badges.push(artist.status);
        return `
        <a class="roster-card reveal" href="/artist/${artist.slug}/">
          ${badges.map((badge) => `<span class="badge">${badge}</span>`).join("")}
          <div class="roster-photo" data-letter="${artist.name ? artist.name[0] : "K"}" data-photo="${artist.photo || ""}"></div>
          <div>
            <h3>${artist.name}</h3>
            <p>${artist.style} - ${artist.city}</p>
          </div>
        </a>
      `;
      })
      .join("");
  }

  const focus = document.querySelector("[data-roster-focus]");
  if (focus && DATA.artists) {
    focus.textContent = DATA.artists.map((artist) => artist.name).join(" - ");
  }
}

function renderReleases() {
  const wrap = document.querySelector("[data-releases]");
  if (!wrap || !DATA.releases) return;
  wrap.innerHTML = DATA.releases
    .map(
      (release) => `
      <div class="release-card reveal">
        <div class="cover" data-cover="${release.cover || ""}"></div>
        <div>
          <h4>${release.artist} - ${release.title}</h4>
          <p>${release.type} - ${release.year}</p>
          <div class="mini-player" data-player data-audio="${release.audio || ""}">
            <button class="player-toggle" type="button">Extrait</button>
            <div class="player-track">
              <div class="player-progress"></div>
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

function renderVideos() {
  const wrap = document.querySelector("[data-videos]");
  if (!wrap || !DATA.videos) return;
  wrap.innerHTML = DATA.videos
    .map((video) => {
      const tag = video.link ? "a" : "div";
      const attrs = video.link
        ? `href="${video.link}" target="_blank" rel="noopener"`
        : "";
      return `
      <${tag} class="video-card reveal" ${attrs}>
        <div class="video-thumb" data-thumb="${video.thumbnail || ""}">
          <span>></span>
        </div>
        <h4>${video.artist} - ${video.title}</h4>
        <p>Clip officiel - ${video.year}</p>
      </${tag}>
    `;
    })
    .join("");
}

function renderProof() {
  const wrap = document.querySelector("[data-proof-cards]");
  if (wrap && DATA.proof) {
    wrap.innerHTML = `
      <div class="proof-card reveal">
        <h3>Présences médias</h3>
        <p>${DATA.proof.media || ""}</p>
      </div>
      <div class="proof-card reveal">
        <h3>Partenariats</h3>
        <p>${DATA.proof.partners || ""}</p>
      </div>
      <div class="proof-card reveal">
        <h3>Communauté</h3>
        <p>${DATA.proof.community || ""}</p>
      </div>
    `;
  }

  const logos = document.querySelector("[data-proof-logos]");
  if (logos && DATA.proof && DATA.proof.logos) {
    logos.innerHTML = DATA.proof.logos.map((logo) => `<span>${logo}</span>`).join("");
  }
}

function renderSocials() {
  const wrap = document.querySelector("[data-socials]");
  if (!wrap || !DATA.socials) return;
  wrap.innerHTML = DATA.socials
    .map((social) => {
      const isLink = Boolean(social.url);
      const tag = isLink ? "a" : "div";
      const attrs = isLink ? `href="${social.url}" target="_blank" rel="noopener"` : "";
      const status = social.status ? `<span class="social-status">${social.status}</span>` : "";
      return `
      <${tag} class="social-card reveal${isLink ? "" : " is-disabled"}" ${attrs}>
        <div class="social-top">
          <span class="social-name">${social.name || ""}</span>
          ${status}
        </div>
        <h3>${social.handle || ""}</h3>
        <p>${social.description || ""}</p>
      </${tag}>
    `;
    })
    .join("");
}

function renderEvents() {
  const wrap = document.querySelector("[data-events]");
  if (!wrap || !DATA.events) return;
  wrap.innerHTML = DATA.events
    .map(
      (event) => `
      <div class="timeline-item reveal">
        <div class="date">${event.date}</div>
        <div>
          <h4>${event.title}</h4>
          <p>${event.description}</p>
        </div>
      </div>
    `
    )
    .join("");
}

function renderContacts() {
  if (!DATA.contact) return;
  setText("[data-contact-management]", DATA.contact.management);
  setText("[data-contact-booking]", DATA.contact.booking);
  setText("[data-contact-press]", DATA.contact.press);
  setText("[data-contact-communication]", DATA.contact.communication);
  setLink(
    "[data-contact-instagram]",
    DATA.contact.instagram,
    DATA.contact.instagramLabel || formatInstagram(DATA.contact.instagram)
  );
  setLink(
    "[data-footer-instagram]",
    DATA.contact.instagram,
    DATA.contact.instagramLabel || "Instagram"
  );
}

function renderLabelPage() {
  if (!DATA.label) return;
  setText("[data-label-title]", DATA.brand ? DATA.brand.name : "Kah-Prod");
  setText("[data-label-intro]", DATA.label.intro);
  setText("[data-label-vision]", DATA.label.vision);

  const values = document.querySelector("[data-label-values]");
  if (values && DATA.label.values) {
    values.innerHTML = DATA.label.values
      .map(
        (item) => `
        <div class="feature-card reveal">
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </div>
      `
      )
      .join("");
  }

  const team = document.querySelector("[data-label-team]");
  if (team && DATA.label.team) {
    team.innerHTML = DATA.label.team
      .map(
        (member) => `
        <div class="team-card reveal">
          <div class="team-avatar">${member.name[0]}</div>
          <h3>${member.name}</h3>
          ${member.subname ? `<div class="team-subname">(${member.subname})</div>` : ""}
          <p>${member.role}</p>
        </div>
      `
      )
      .join("");
  }

  const services = document.querySelector("[data-label-services]");
  if (services && DATA.label.services) {
    services.innerHTML = DATA.label.services
      .map(
        (service) => `
        <div class="service-card reveal">
          <h3>${service.title}</h3>
          <p>${service.text}</p>
        </div>
      `
      )
      .join("");
  }
}

function renderArtistPage() {
  const slug = document.body.dataset.artist;
  if (!slug || !DATA.artists) return;
  const artist = DATA.artists.find((item) => item.slug === slug);
  if (!artist) return;

  setText("[data-artist-name]", artist.name);
  setText("[data-artist-pill]", `${artist.style} - ${artist.city}`);
  setText("[data-artist-bio]", artist.bio);

  const photo = document.querySelector("[data-artist-photo]");
  applyMedia(photo, artist.photo, artist.name ? artist.name[0] : "K");

  const statsWrap = document.querySelector("[data-artist-stats]");
  if (statsWrap) {
    if (artist.metrics && artist.metrics.length) {
      statsWrap.innerHTML = artist.metrics
        .map(
          (metric) => `
        <div>
          <span class="stat">${metric.value}</span>
          <span class="label">${metric.label}</span>
        </div>
      `
        )
        .join("");
    } else if (artist.stats) {
      statsWrap.innerHTML = `
        <div>
          <span class="stat">${artist.stats.streams}</span>
          <span class="label">Streams</span>
        </div>
        <div>
          <span class="stat">${artist.stats.listeners}</span>
          <span class="label">Auditeurs mensuels</span>
        </div>
        <div>
          <span class="stat">${artist.stats.clips}</span>
          <span class="label">Clips officiels</span>
        </div>
      `;
    }
  }

  const taglineEl = document.querySelector("[data-artist-tagline]");
  if (taglineEl) taglineEl.textContent = artist.tagline || "";
  const storyEl = document.querySelector("[data-artist-story]");
  if (storyEl) storyEl.textContent = artist.story || "";
  const quoteEl = document.querySelector("[data-artist-quote]");
  if (quoteEl) quoteEl.textContent = artist.quote || "";

  const themes = document.querySelector("[data-artist-themes]");
  if (themes && artist.themes && artist.themes.length) {
    themes.innerHTML = artist.themes.map((item) => `<li>${item}</li>`).join("");
  } else if (themes) {
    themes.innerHTML = "";
  }

  const signature = document.querySelector("[data-artist-signature]");
  if (signature && artist.signature && artist.signature.length) {
    signature.innerHTML = artist.signature.map((item) => `<li>${item}</li>`).join("");
  } else if (signature) {
    signature.innerHTML = "";
  }

  const highlightsWrap = document.querySelector("[data-artist-highlights]");
  const highlightsSection = document.querySelector("#highlights");
  if (highlightsWrap && artist.highlights && artist.highlights.length) {
    highlightsWrap.innerHTML = artist.highlights
      .map(
        (item) => `
        <div class="highlight-card reveal">
          <h3>${item.title || item}</h3>
          <p>${item.text || ""}</p>
        </div>
      `
      )
      .join("");
  } else if (highlightsWrap) {
    highlightsWrap.innerHTML = "";
  }
  if (highlightsSection) {
    highlightsSection.hidden = !(artist.highlights && artist.highlights.length);
  }

  const timelineWrap = document.querySelector("[data-artist-timeline]");
  const timelineSection = document.querySelector("#timeline");
  if (timelineWrap && artist.timeline && artist.timeline.length) {
    timelineWrap.innerHTML = artist.timeline
      .map(
        (item) => `
        <div class="timeline-item reveal">
          <div class="date">${item.year}</div>
          <div>
            <h4>${item.title}</h4>
            <p>${item.description}</p>
          </div>
        </div>
      `
      )
      .join("");
  } else if (timelineWrap) {
    timelineWrap.innerHTML = "";
  }
  if (timelineSection) {
    timelineSection.hidden = !(artist.timeline && artist.timeline.length);
  }

  const pressSection = document.querySelector("#press");
  const pressText = document.querySelector("[data-artist-press]");
  const pressLink = document.querySelector("[data-artist-presslink]");
  const pressMail = document.querySelector("[data-artist-pressmail]");
  const pressData = artist.press || {};

  if (pressText) pressText.textContent = pressData.text || "";
  if (pressLink) {
    if (pressData.kit) {
      pressLink.href = pressData.kit;
      pressLink.hidden = false;
    } else {
      pressLink.hidden = true;
    }
  }
  if (pressMail) {
    const mail = pressData.mail || (DATA.contact ? DATA.contact.press : "");
    if (mail) {
      pressMail.href = `mailto:${mail}`;
      pressMail.textContent = mail;
      pressMail.hidden = false;
    } else {
      pressMail.hidden = true;
    }
  }

  const socialsWrap = document.querySelector("[data-artist-socials]");
  if (socialsWrap) {
    const socials = artist.socials || {};
    const entries = Object.entries(socials).filter(([, value]) => value);
    socialsWrap.innerHTML = entries
      .map(
        ([key, value]) => `
        <a class="social-pill" href="${value}" target="_blank" rel="noopener">${key}</a>
      `
      )
      .join("");
  }

  if (pressSection) {
    const hasPress =
      (pressData && (pressData.text || pressData.kit || pressData.mail)) ||
      (artist.socials && Object.values(artist.socials).some((val) => val));
    pressSection.hidden = !hasPress;
  }

  const galleryWrap = document.querySelector("[data-artist-gallery]");
  const gallerySection = document.querySelector("#gallery");
  if (galleryWrap && artist.gallery && artist.gallery.length) {
    galleryWrap.innerHTML = artist.gallery
      .map(
        (src) => `
        <div class="gallery-card reveal" data-gallery="${src || ""}"></div>
      `
      )
      .join("");
  } else if (galleryWrap) {
    galleryWrap.innerHTML = "";
  }
  if (gallerySection) {
    gallerySection.hidden = !(artist.gallery && artist.gallery.length);
  }

  const portraitSection = document.querySelector("#portrait");
  const hasPortrait =
    artist.tagline ||
    artist.story ||
    artist.quote ||
    (artist.themes && artist.themes.length) ||
    (artist.signature && artist.signature.length);
  if (portraitSection) {
    portraitSection.hidden = !hasPortrait;
  }

  const releases = document.querySelector("[data-artist-releases]");
  const discographySection = document.querySelector("#discography");
  if (releases && artist.discography && artist.discography.length) {
    releases.innerHTML = artist.discography
      .map(
        (release) => `
        <div class="release-card reveal">
          <div class="cover" data-cover="${release.cover || ""}"></div>
          <div>
            <h4>${release.title}</h4>
            <p>${release.type} - ${release.year}</p>
            <div class="mini-player" data-player data-audio="${release.audio || ""}">
              <button class="player-toggle" type="button">Extrait</button>
              <div class="player-track">
                <div class="player-progress"></div>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  } else if (releases) {
    releases.innerHTML = "";
  }
  if (discographySection) {
    discographySection.hidden = !(artist.discography && artist.discography.length);
  }

  const videos = document.querySelector("[data-artist-videos]");
  const videosSection = document.querySelector("#videos");
  if (videos && artist.videos && artist.videos.length) {
    videos.innerHTML = artist.videos
      .map((video) => {
        const tag = video.link ? "a" : "div";
        const attrs = video.link
          ? `href="${video.link}" target="_blank" rel="noopener"`
          : "";
        return `
        <${tag} class="video-card reveal" ${attrs}>
          <div class="video-thumb" data-thumb="${video.thumbnail || ""}">
            <span>></span>
          </div>
          <h4>${video.title}</h4>
          <p>Clip officiel - ${video.year}</p>
        </${tag}>
      `;
      })
      .join("");
  } else if (videos) {
    videos.innerHTML = "";
  }
  if (videosSection) {
    videosSection.hidden = !(artist.videos && artist.videos.length);
  }

  const heroPrimaryCta = document.querySelector('.artist-hero .hero-actions .cta[href="#discography"]');
  if (heroPrimaryCta) {
    heroPrimaryCta.hidden = !(artist.discography && artist.discography.length);
  }

  const heroSecondaryCta = document.querySelector('.artist-hero .hero-actions .ghost[href="#videos"]');
  if (heroSecondaryCta) {
    heroSecondaryCta.hidden = !(artist.videos && artist.videos.length);
  }
}

function hydrateMedia() {
  document.querySelectorAll("[data-photo]").forEach((el) => {
    const src = el.getAttribute("data-photo");
    applyMedia(el, src, el.getAttribute("data-letter") || "K");
  });

  document.querySelectorAll("[data-cover]").forEach((el) => {
    const src = el.getAttribute("data-cover");
    const cover = src || getPlaceholder("cover");
    if (cover) {
      el.style.backgroundImage = `url(${cover})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }
  });

  document.querySelectorAll("[data-thumb]").forEach((el) => {
    const src = el.getAttribute("data-thumb");
    const thumb = src || getPlaceholder("video");
    if (thumb) {
      el.style.backgroundImage = `url(${thumb})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }
  });

  document.querySelectorAll("[data-gallery]").forEach((el) => {
    const src = el.getAttribute("data-gallery");
    if (src) {
      el.style.backgroundImage = `url(${src})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }
  });
}

function initPlayers() {
  document.querySelectorAll("[data-player]").forEach((player) => {
    const button = player.querySelector(".player-toggle");
    if (!button) return;
    const idleLabel = button.textContent || "Play";
    button.dataset.idle = idleLabel;

    const audioSrc = player.getAttribute("data-audio");
    let audio = null;
    if (audioSrc) {
      audio = new Audio(audioSrc);
    }

    button.addEventListener("click", () => {
      const isPlaying = player.classList.toggle("playing");
      button.textContent = isPlaying ? "Pause" : button.dataset.idle;

      if (audio) {
        if (isPlaying) {
          audio.currentTime = 0;
          audio.play();
        } else {
          audio.pause();
        }
      }
    });

    if (audio) {
      audio.addEventListener("ended", () => {
        player.classList.remove("playing");
        button.textContent = button.dataset.idle;
      });
    }
  });
}

function renderAll() {
  renderHero();
  renderSignature();
  renderFeatured();
  renderArtists();
  renderReleases();
  renderVideos();
  renderProof();
  renderSocials();
  renderEvents();
  renderContacts();
  renderLabelPage();
  renderArtistPage();
  hydrateMedia();
  initPlayers();
  observeReveals();
}

async function refreshFromApi() {
  try {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload || !payload.data) return;
    DATA = mergeDeep(window.KAH_DATA || {}, payload.data);
    window.KAH_ACTIVE_DATA = DATA;
    try {
      localStorage.setItem("kah-prod-data", JSON.stringify(DATA));
    } catch (error) {
      // ignore storage errors
    }
    renderAll();
  } catch (error) {
    return;
  }
}

renderAll();
refreshFromApi();
setActiveNav();



