const DEFAULT_DATA = window.KAH_DATA || {};

const DATA_VERSION = DEFAULT_DATA.settings ? DEFAULT_DATA.settings.dataVersion : "";
const TOKEN_KEY = "kah-prod-token";
const LOCAL_KEY = "kah-prod-data";
const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const savedVersion = parsed && parsed.settings ? parsed.settings.dataVersion : "";
      if (!DATA_VERSION || DATA_VERSION === savedVersion) {
        return applyState(parsed);
      }
    }
  } catch (error) {
    return applyState(clone(DEFAULT_DATA));
  }
  return applyState(clone(DEFAULT_DATA));
}

function normalizeState(data) {
  const safe = data || {};
  safe.brand = safe.brand || { name: "Kah-Prod" };
  safe.hero = safe.hero || {};
  safe.hero.release = safe.hero.release || {};
  safe.stats = safe.stats || [];
  safe.signature = safe.signature || [];
  safe.featured = safe.featured || {};
  safe.featured.metrics = safe.featured.metrics || [];
  safe.artists = safe.artists || [];
  safe.releases = safe.releases || [];
  safe.videos = safe.videos || [];
  safe.events = safe.events || [];
  safe.proof = safe.proof || {};
  safe.proof.logos = safe.proof.logos || [];
  if (!safe.socials || !safe.socials.length) {
    safe.socials = clone(DEFAULT_DATA.socials || []);
  }
  safe.contact = safe.contact || {};
  safe.contact.instagram = safe.contact.instagram || "";
  safe.contact.communication = safe.contact.communication || "";
  safe.label = safe.label || {};
  safe.label.values = safe.label.values || [];
  safe.label.team = safe.label.team || [];
  safe.label.services = safe.label.services || [];
  safe.settings = safe.settings || {};
  return safe;
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

function applyState(next) {
  const merged = mergeDeep(DEFAULT_DATA, next || {});
  return normalizeState(merged);
}

let state = loadState();

const loginLayer = document.querySelector("[data-admin-login]");
const panel = document.querySelector("[data-admin-panel]");
const passwordInput = document.querySelector("[data-admin-password]");
const loginButton = document.querySelector("[data-admin-submit]");
const message = document.querySelector("[data-admin-message]");

const saveButton = document.querySelector("[data-admin-save]");
const exportButton = document.querySelector("[data-admin-export]");
const importInput = document.querySelector("[data-admin-import]");
const resetButton = document.querySelector("[data-admin-reset]");

function showMessage(text) {
  if (!message) return;
  message.textContent = text;
  setTimeout(() => {
    message.textContent = "";
  }, 3000);
}

function unlock() {
  if (loginLayer) loginLayer.hidden = true;
  if (panel) panel.hidden = false;
  renderAll();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiLogin(password) {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      return { ok: false, error: "Identifiants invalides" };
    }
    const payload = await response.json();
    return { ok: true, token: payload.token };
  } catch (error) {
    return { ok: false, error: "API indisponible" };
  }
}

async function apiGetState() {
  try {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload && payload.data ? payload.data : null;
  } catch (error) {
    return null;
  }
}

async function apiSaveState(token, payload) {
  try {
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data: payload })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function checkLogin() {
  const token = getToken();
  if (token) {
    const remote = await apiGetState();
    if (remote) {
      state = applyState(remote);
      unlock();
      return;
    }
    if (IS_LOCAL) {
      unlock();
      return;
    }
  }
}

async function handleLogin() {
  const pass = passwordInput ? passwordInput.value.trim() : "";
  if (!pass) {
    showMessage("Entre un mot de passe");
    return;
  }

  const result = await apiLogin(pass);
  if (result.ok) {
    setToken(result.token);
    const remote = await apiGetState();
    if (remote) {
      state = applyState(remote);
    }
    unlock();
    return;
  }

  if (IS_LOCAL) {
    const localPass = state.settings.adminPassword || "kahprod";
    if (pass === localPass) {
      unlock();
      return;
    }
  }

  showMessage(result.error || "Mot de passe incorrect");
}

if (loginButton) {
  loginButton.addEventListener("click", handleLogin);
}

if (passwordInput) {
  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  });
}

checkLogin();

async function saveState() {
  const token = getToken();
  if (!token && !IS_LOCAL) {
    showMessage("Connexion requise");
    return;
  }

  let saved = false;
  if (token) {
    saved = await apiSaveState(token, state);
  }

  if (saved || IS_LOCAL) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    showMessage("Contenu enregistré");
    return;
  }

  showMessage("Erreur sauvegarde API");
}

async function resetState() {
  state = applyState(clone(DEFAULT_DATA));
  await saveState();
  renderAll();
}

if (saveButton) saveButton.addEventListener("click", saveState);
if (resetButton) resetButton.addEventListener("click", resetState);

if (exportButton) {
  exportButton.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kah-prod-data.json";
    link.click();
    URL.revokeObjectURL(url);
  });
}

if (importInput) {
  importInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      state = applyState(JSON.parse(text));
      await saveState();
      renderAll();
    } catch (error) {
      showMessage("JSON invalide");
    }
  });
}

function createField(labelText, input) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-field";
  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function createInput(labelText, value, onChange) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.addEventListener("input", (event) => onChange(event.target.value));
  return createField(labelText, input);
}

function createTextarea(labelText, value, onChange) {
  const input = document.createElement("textarea");
  input.value = value || "";
  input.addEventListener("input", (event) => onChange(event.target.value));
  return createField(labelText, input);
}

function createNumber(labelText, value, onChange) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.addEventListener("input", (event) => onChange(event.target.value));
  return createField(labelText, input);
}

function createCheckbox(labelText, value, onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(value);
  input.addEventListener("change", (event) => onChange(event.target.checked));
  return createField(labelText, input);
}

function createButton(text, onClick, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (className) button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

function createRow(children) {
  const row = document.createElement("div");
  row.className = "admin-row";
  children.forEach((child) => row.appendChild(child));
  return row;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function createMediaField(labelText, value, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-field";

  const label = document.createElement("label");
  label.textContent = labelText;

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.placeholder = "URL ou data:...";
  urlInput.value = value || "";
  urlInput.addEventListener("input", (event) => onChange(event.target.value));

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*,audio/*,video/*";

  const preview = document.createElement("div");
  preview.className = "admin-preview";

  function updatePreview(src) {
    preview.innerHTML = "";
    if (!src) {
      preview.textContent = "Aucun média";
      return;
    }
    if (src.startsWith("data:image") || src.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      const img = document.createElement("img");
      img.src = src;
      preview.appendChild(img);
      return;
    }
    preview.textContent = "Média chargé";
  }

  updatePreview(value);

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const dataUrl = await readFile(file);
    urlInput.value = dataUrl;
    onChange(dataUrl);
    updatePreview(dataUrl);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(urlInput);
  wrapper.appendChild(fileInput);
  wrapper.appendChild(preview);
  return wrapper;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function renderHero() {
  const wrap = document.querySelector("[data-admin-hero]");
  if (!wrap) return;
  wrap.innerHTML = "";

  wrap.appendChild(createInput("Pill", state.hero.pill, (value) => (state.hero.pill = value)));
  wrap.appendChild(createInput("Titre", state.hero.title, (value) => (state.hero.title = value)));
  wrap.appendChild(
    createInput("Sous-titre", state.hero.subtitle, (value) => (state.hero.subtitle = value))
  );
  wrap.appendChild(
    createTextarea("Description", state.hero.description, (value) => (state.hero.description = value))
  );
  wrap.appendChild(
    createInput("Tag", state.hero.highlightTag, (value) => (state.hero.highlightTag = value))
  );
  wrap.appendChild(
    createMediaField("Background hero", state.hero.background, (value) => (state.hero.background = value))
  );

  const release = state.hero.release;
  const releaseCard = document.createElement("div");
  releaseCard.className = "admin-card";
  releaseCard.appendChild(createInput("Label", release.label, (value) => (release.label = value)));
  releaseCard.appendChild(createInput("Titre", release.title, (value) => (release.title = value)));
  releaseCard.appendChild(createInput("Artiste", release.artist, (value) => (release.artist = value)));
  releaseCard.appendChild(
    createTextarea("Description", release.description, (value) => (release.description = value))
  );
  releaseCard.appendChild(createInput("Date", release.date, (value) => (release.date = value)));
  releaseCard.appendChild(createInput("Meta", release.meta, (value) => (release.meta = value)));
  wrap.appendChild(releaseCard);
}

function renderStats() {
  const wrap = document.querySelector("[data-admin-stats]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.stats.forEach((stat, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Valeur", stat.value, (value) => (stat.value = value)));
    card.appendChild(createInput("Label", stat.label, (value) => (stat.label = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.stats.splice(index, 1);
        renderStats();
      }, "ghost")
    );
    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter une stat",
      () => {
        state.stats.push({ value: "", label: "" });
        renderStats();
      },
      "ghost admin-add"
    )
  );
}

function renderSignature() {
  const wrap = document.querySelector("[data-admin-signature]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.signature.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Titre", item.title, (value) => (item.title = value)));
    card.appendChild(createTextarea("Texte", item.text, (value) => (item.text = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.signature.splice(index, 1);
        renderSignature();
      }, "ghost")
    );
    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter une carte",
      () => {
        state.signature.push({ title: "", text: "" });
        renderSignature();
      },
      "ghost admin-add"
    )
  );
}

function renderFeatured() {
  const wrap = document.querySelector("[data-admin-featured]");
  if (!wrap) return;
  wrap.innerHTML = "";

  wrap.appendChild(createInput("Slug artiste", state.featured.slug, (value) => (state.featured.slug = value)));
  wrap.appendChild(createInput("Tag", state.featured.tag, (value) => (state.featured.tag = value)));
  wrap.appendChild(createInput("Headline", state.featured.headline, (value) => (state.featured.headline = value)));
  wrap.appendChild(
    createTextarea("Description", state.featured.description, (value) => (state.featured.description = value))
  );

  const metricsList = document.createElement("div");
  metricsList.className = "admin-list";
  const metricsTitle = document.createElement("h3");
  metricsTitle.textContent = "Métriques";
  metricsList.appendChild(metricsTitle);

  state.featured.metrics.forEach((metric, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Valeur", metric.value, (value) => (metric.value = value)));
    card.appendChild(createInput("Label", metric.label, (value) => (metric.label = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.featured.metrics.splice(index, 1);
        renderFeatured();
      }, "ghost")
    );
    metricsList.appendChild(card);
  });

  metricsList.appendChild(
    createButton(
      "Ajouter une métrique",
      () => {
        state.featured.metrics.push({ value: "", label: "" });
        renderFeatured();
      },
      "ghost admin-add"
    )
  );

  wrap.appendChild(metricsList);
}

function renderArtists() {
  const wrap = document.querySelector("[data-admin-artists]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.artists.forEach((artist, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";

    const nameField = createInput("Nom", artist.name, (value) => {
      artist.name = value;
      if (!artist.slug) artist.slug = slugify(value);
    });

    const slugField = createInput("Slug", artist.slug, (value) => (artist.slug = slugify(value)));
    const flagshipField = createCheckbox("Flagship", artist.flagship, (value) => (artist.flagship = value));
    const styleField = createInput("Style", artist.style, (value) => (artist.style = value));
    const cityField = createInput("Ville", artist.city, (value) => (artist.city = value));
    const highlightField = createInput("Highlight", artist.highlight, (value) => (artist.highlight = value));
    const bioField = createTextarea("Bio", artist.bio, (value) => (artist.bio = value));
    const taglineField = createInput("Tagline", artist.tagline, (value) => (artist.tagline = value));
    const storyField = createTextarea("Story", artist.story, (value) => (artist.story = value));
    const quoteField = createTextarea("Quote", artist.quote, (value) => (artist.quote = value));

    card.appendChild(createRow([nameField, slugField]));
    card.appendChild(flagshipField);
    card.appendChild(createRow([styleField, cityField]));
    card.appendChild(highlightField);
    card.appendChild(bioField);
    card.appendChild(taglineField);
    card.appendChild(storyField);
    card.appendChild(quoteField);

    if (!artist.stats) artist.stats = { streams: "", listeners: "", clips: "" };
    artist.metrics = artist.metrics || [];
    if (!artist.metrics.length) {
      const statsRow = createRow([
        createNumber("Streams", artist.stats.streams, (value) => (artist.stats.streams = value)),
        createNumber("Auditeurs", artist.stats.listeners, (value) => (artist.stats.listeners = value)),
        createNumber("Clips", artist.stats.clips, (value) => (artist.stats.clips = value))
      ]);
      card.appendChild(statsRow);
    }

    const metricsWrap = document.createElement("div");
    metricsWrap.className = "admin-list";
    const metricsTitle = document.createElement("h3");
    metricsTitle.textContent = "Métriques";
    metricsWrap.appendChild(metricsTitle);

    artist.metrics.forEach((metric, metricIndex) => {
      const metricCard = document.createElement("div");
      metricCard.className = "admin-card";
      metricCard.appendChild(createInput("Valeur", metric.value, (value) => (metric.value = value)));
      metricCard.appendChild(createInput("Label", metric.label, (value) => (metric.label = value)));
      metricCard.appendChild(
        createButton("Supprimer", () => {
          artist.metrics.splice(metricIndex, 1);
          renderArtists();
        }, "ghost")
      );
      metricsWrap.appendChild(metricCard);
    });

    metricsWrap.appendChild(
      createButton(
        "Ajouter une métrique",
        () => {
          artist.metrics.push({ value: "", label: "" });
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(metricsWrap);

    card.appendChild(createMediaField("Photo", artist.photo, (value) => (artist.photo = value)));

    artist.themes = artist.themes || [];
    const themesWrap = document.createElement("div");
    themesWrap.className = "admin-list";
    const themesTitle = document.createElement("h3");
    themesTitle.textContent = "Thèmes";
    themesWrap.appendChild(themesTitle);

    artist.themes.forEach((theme, themeIndex) => {
      const themeCard = document.createElement("div");
      themeCard.className = "admin-card";
      themeCard.appendChild(createInput("Theme", theme, (value) => (artist.themes[themeIndex] = value)));
      themeCard.appendChild(
        createButton("Supprimer", () => {
          artist.themes.splice(themeIndex, 1);
          renderArtists();
        }, "ghost")
      );
      themesWrap.appendChild(themeCard);
    });

    themesWrap.appendChild(
      createButton(
        "Ajouter un thème",
        () => {
          artist.themes.push("");
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(themesWrap);

    artist.signature = artist.signature || [];
    const signatureWrap = document.createElement("div");
    signatureWrap.className = "admin-list";
    const signatureTitle = document.createElement("h3");
    signatureTitle.textContent = "Signature";
    signatureWrap.appendChild(signatureTitle);

    artist.signature.forEach((item, itemIndex) => {
      const sigCard = document.createElement("div");
      sigCard.className = "admin-card";
      sigCard.appendChild(createInput("Element", item, (value) => (artist.signature[itemIndex] = value)));
      sigCard.appendChild(
        createButton("Supprimer", () => {
          artist.signature.splice(itemIndex, 1);
          renderArtists();
        }, "ghost")
      );
      signatureWrap.appendChild(sigCard);
    });

    signatureWrap.appendChild(
      createButton(
        "Ajouter une signature",
        () => {
          artist.signature.push("");
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(signatureWrap);

    artist.highlights = artist.highlights || [];
    const highlightsWrap = document.createElement("div");
    highlightsWrap.className = "admin-list";
    const highlightsTitle = document.createElement("h3");
    highlightsTitle.textContent = "Highlights";
    highlightsWrap.appendChild(highlightsTitle);

    artist.highlights.forEach((item, itemIndex) => {
      const highlightCard = document.createElement("div");
      highlightCard.className = "admin-card";
      highlightCard.appendChild(createInput("Titre", item.title, (value) => (item.title = value)));
      highlightCard.appendChild(createTextarea("Texte", item.text, (value) => (item.text = value)));
      highlightCard.appendChild(
        createButton("Supprimer", () => {
          artist.highlights.splice(itemIndex, 1);
          renderArtists();
        }, "ghost")
      );
      highlightsWrap.appendChild(highlightCard);
    });

    highlightsWrap.appendChild(
      createButton(
        "Ajouter un highlight",
        () => {
          artist.highlights.push({ title: "", text: "" });
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(highlightsWrap);

    artist.timeline = artist.timeline || [];
    const timelineWrap = document.createElement("div");
    timelineWrap.className = "admin-list";
    const timelineTitle = document.createElement("h3");
    timelineTitle.textContent = "Timeline";
    timelineWrap.appendChild(timelineTitle);

    artist.timeline.forEach((item, itemIndex) => {
      const timeCard = document.createElement("div");
      timeCard.className = "admin-card";
      timeCard.appendChild(createInput("Année", item.year, (value) => (item.year = value)));
      timeCard.appendChild(createInput("Titre", item.title, (value) => (item.title = value)));
      timeCard.appendChild(createTextarea("Description", item.description, (value) => (item.description = value)));
      timeCard.appendChild(
        createButton("Supprimer", () => {
          artist.timeline.splice(itemIndex, 1);
          renderArtists();
        }, "ghost")
      );
      timelineWrap.appendChild(timeCard);
    });

    timelineWrap.appendChild(
      createButton(
        "Ajouter une étape",
        () => {
          artist.timeline.push({ year: "", title: "", description: "" });
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(timelineWrap);

    artist.press = artist.press || { text: "", kit: "", mail: "" };
    const pressWrap = document.createElement("div");
    pressWrap.className = "admin-list";
    const pressTitle = document.createElement("h3");
    pressTitle.textContent = "Presse";
    pressWrap.appendChild(pressTitle);
    pressWrap.appendChild(createTextarea("Texte", artist.press.text, (value) => (artist.press.text = value)));
    pressWrap.appendChild(createInput("Press kit (URL)", artist.press.kit, (value) => (artist.press.kit = value)));
    pressWrap.appendChild(createInput("Email presse", artist.press.mail, (value) => (artist.press.mail = value)));
    card.appendChild(pressWrap);

    artist.socials = artist.socials || { instagram: "", tiktok: "", youtube: "", spotify: "" };
    const socialsWrap = document.createElement("div");
    socialsWrap.className = "admin-list";
    const socialsTitle = document.createElement("h3");
    socialsTitle.textContent = "Réseaux";
    socialsWrap.appendChild(socialsTitle);
    socialsWrap.appendChild(
      createInput("Instagram", artist.socials.instagram, (value) => (artist.socials.instagram = value))
    );
    socialsWrap.appendChild(
      createInput("TikTok", artist.socials.tiktok, (value) => (artist.socials.tiktok = value))
    );
    socialsWrap.appendChild(
      createInput("YouTube", artist.socials.youtube, (value) => (artist.socials.youtube = value))
    );
    socialsWrap.appendChild(
      createInput("Spotify", artist.socials.spotify, (value) => (artist.socials.spotify = value))
    );
    card.appendChild(socialsWrap);

    const discographyWrap = document.createElement("div");
    discographyWrap.className = "admin-list";
    const discographyTitle = document.createElement("h3");
    discographyTitle.textContent = "Discographie";
    discographyWrap.appendChild(discographyTitle);

    artist.discography = artist.discography || [];
    artist.discography.forEach((release, releaseIndex) => {
      const releaseCard = document.createElement("div");
      releaseCard.className = "admin-card";
      releaseCard.appendChild(createInput("Titre", release.title, (value) => (release.title = value)));
      releaseCard.appendChild(createInput("Type", release.type, (value) => (release.type = value)));
      releaseCard.appendChild(createInput("Année", release.year, (value) => (release.year = value)));
      releaseCard.appendChild(
        createMediaField("Cover", release.cover, (value) => (release.cover = value))
      );
      releaseCard.appendChild(
        createMediaField("Audio", release.audio, (value) => (release.audio = value))
      );
      releaseCard.appendChild(
        createButton("Supprimer", () => {
          artist.discography.splice(releaseIndex, 1);
          renderArtists();
        }, "ghost")
      );
      discographyWrap.appendChild(releaseCard);
    });

    discographyWrap.appendChild(
      createButton(
        "Ajouter un titre",
        () => {
          artist.discography.push({ title: "", type: "", year: "" });
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(discographyWrap);

    const videosWrap = document.createElement("div");
    videosWrap.className = "admin-list";
    const videosTitle = document.createElement("h3");
    videosTitle.textContent = "Clips";
    videosWrap.appendChild(videosTitle);

    artist.videos = artist.videos || [];
    artist.videos.forEach((video, videoIndex) => {
      const videoCard = document.createElement("div");
      videoCard.className = "admin-card";
      videoCard.appendChild(createInput("Titre", video.title, (value) => (video.title = value)));
      videoCard.appendChild(createInput("Année", video.year, (value) => (video.year = value)));
      videoCard.appendChild(
        createMediaField("Thumbnail", video.thumbnail, (value) => (video.thumbnail = value))
      );
      videoCard.appendChild(createInput("Lien", video.link, (value) => (video.link = value)));
      videoCard.appendChild(
        createButton("Supprimer", () => {
          artist.videos.splice(videoIndex, 1);
          renderArtists();
        }, "ghost")
      );
      videosWrap.appendChild(videoCard);
    });

    videosWrap.appendChild(
      createButton(
        "Ajouter un clip",
        () => {
          artist.videos.push({ title: "", year: "" });
          renderArtists();
        },
        "ghost admin-add"
      )
    );

    card.appendChild(videosWrap);

    card.appendChild(
      createButton("Supprimer l'artiste", () => {
        state.artists.splice(index, 1);
        renderArtists();
      }, "ghost")
    );

    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter un artiste",
      () => {
        state.artists.push({
          slug: "",
          name: "",
          flagship: false,
          style: "",
          city: "",
          highlight: "",
          bio: "",
          tagline: "",
          story: "",
          quote: "",
          stats: { streams: "", listeners: "", clips: "" },
          metrics: [],
          themes: [],
          signature: [],
          highlights: [],
          timeline: [],
          press: { text: "", kit: "", mail: "" },
          socials: { instagram: "", tiktok: "", youtube: "", spotify: "" },
          discography: [],
          videos: []
        });
        renderArtists();
      },
      "ghost admin-add"
    )
  );
}

function renderReleases() {
  const wrap = document.querySelector("[data-admin-releases]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.releases.forEach((release, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Titre", release.title, (value) => (release.title = value)));
    card.appendChild(createInput("Artiste", release.artist, (value) => (release.artist = value)));
    card.appendChild(createInput("Type", release.type, (value) => (release.type = value)));
    card.appendChild(createInput("Année", release.year, (value) => (release.year = value)));
    card.appendChild(createMediaField("Cover", release.cover, (value) => (release.cover = value)));
    card.appendChild(createMediaField("Audio", release.audio, (value) => (release.audio = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.releases.splice(index, 1);
        renderReleases();
      }, "ghost")
    );
    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter une sortie",
      () => {
        state.releases.push({ title: "", artist: "", type: "", year: "" });
        renderReleases();
      },
      "ghost admin-add"
    )
  );
}

function renderVideos() {
  const wrap = document.querySelector("[data-admin-videos]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.videos.forEach((video, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Titre", video.title, (value) => (video.title = value)));
    card.appendChild(createInput("Artiste", video.artist, (value) => (video.artist = value)));
    card.appendChild(createInput("Année", video.year, (value) => (video.year = value)));
    card.appendChild(
      createMediaField("Thumbnail", video.thumbnail, (value) => (video.thumbnail = value))
    );
    card.appendChild(createInput("Lien", video.link, (value) => (video.link = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.videos.splice(index, 1);
        renderVideos();
      }, "ghost")
    );
    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter un clip",
      () => {
        state.videos.push({ title: "", artist: "", year: "" });
        renderVideos();
      },
      "ghost admin-add"
    )
  );
}

function renderEvents() {
  const wrap = document.querySelector("[data-admin-events]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.events.forEach((event, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Date", event.date, (value) => (event.date = value)));
    card.appendChild(createInput("Titre", event.title, (value) => (event.title = value)));
    card.appendChild(createTextarea("Description", event.description, (value) => (event.description = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.events.splice(index, 1);
        renderEvents();
      }, "ghost")
    );
    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter un événement",
      () => {
        state.events.push({ date: "", title: "", description: "" });
        renderEvents();
      },
      "ghost admin-add"
    )
  );
}

function renderProof() {
  const wrap = document.querySelector("[data-admin-proof]");
  if (!wrap) return;
  wrap.innerHTML = "";

  wrap.appendChild(createTextarea("Présences médias", state.proof.media, (value) => (state.proof.media = value)));
  wrap.appendChild(createTextarea("Partenariats", state.proof.partners, (value) => (state.proof.partners = value)));
  wrap.appendChild(createTextarea("Communauté", state.proof.community, (value) => (state.proof.community = value)));

  const logosList = document.createElement("div");
  logosList.className = "admin-list";
  state.proof.logos.forEach((logo, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Logo", logo, (value) => (state.proof.logos[index] = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.proof.logos.splice(index, 1);
        renderProof();
      }, "ghost")
    );
    logosList.appendChild(card);
  });
  wrap.appendChild(logosList);
  wrap.appendChild(
    createButton(
      "Ajouter un logo",
      () => {
        state.proof.logos.push("");
        renderProof();
      },
      "ghost admin-add"
    )
  );
}

function renderSocials() {
  const wrap = document.querySelector("[data-admin-socials]");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = document.createElement("div");
  list.className = "admin-list";

  state.socials.forEach((social, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Nom", social.name, (value) => (social.name = value)));
    card.appendChild(createInput("Handle", social.handle, (value) => (social.handle = value)));
    card.appendChild(createInput("URL", social.url, (value) => (social.url = value)));
    card.appendChild(createTextarea("Description", social.description, (value) => (social.description = value)));
    card.appendChild(createInput("Statut (optionnel)", social.status, (value) => (social.status = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.socials.splice(index, 1);
        renderSocials();
      }, "ghost")
    );
    list.appendChild(card);
  });

  wrap.appendChild(list);
  wrap.appendChild(
    createButton(
      "Ajouter un réseau",
      () => {
        state.socials.push({ name: "", handle: "", url: "", description: "", status: "" });
        renderSocials();
      },
      "ghost admin-add"
    )
  );
}

function renderContact() {
  const wrap = document.querySelector("[data-admin-contact]");
  if (!wrap) return;
  wrap.innerHTML = "";

  wrap.appendChild(
    createInput("Management", state.contact.management, (value) => (state.contact.management = value))
  );
  wrap.appendChild(createInput("Booking", state.contact.booking, (value) => (state.contact.booking = value)));
  wrap.appendChild(createInput("Presse", state.contact.press, (value) => (state.contact.press = value)));
  wrap.appendChild(
    createInput(
      "Communication contractuelle",
      state.contact.communication,
      (value) => (state.contact.communication = value)
    )
  );
  wrap.appendChild(
    createInput("Instagram", state.contact.instagram, (value) => (state.contact.instagram = value))
  );
}

function renderLabel() {
  const wrap = document.querySelector("[data-admin-label]");
  if (!wrap) return;
  wrap.innerHTML = "";

  wrap.appendChild(createTextarea("Intro", state.label.intro, (value) => (state.label.intro = value)));
  wrap.appendChild(createInput("Vision", state.label.vision, (value) => (state.label.vision = value)));

  const valuesList = document.createElement("div");
  valuesList.className = "admin-list";
  state.label.values.forEach((valueItem, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Titre", valueItem.title, (value) => (valueItem.title = value)));
    card.appendChild(createTextarea("Texte", valueItem.text, (value) => (valueItem.text = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.label.values.splice(index, 1);
        renderLabel();
      }, "ghost")
    );
    valuesList.appendChild(card);
  });
  wrap.appendChild(valuesList);
  wrap.appendChild(
    createButton(
      "Ajouter une valeur",
      () => {
        state.label.values.push({ title: "", text: "" });
        renderLabel();
      },
      "ghost admin-add"
    )
  );

  const teamList = document.createElement("div");
  teamList.className = "admin-list";
  state.label.team.forEach((member, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Nom", member.name, (value) => (member.name = value)));
    card.appendChild(createInput("Role", member.role, (value) => (member.role = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.label.team.splice(index, 1);
        renderLabel();
      }, "ghost")
    );
    teamList.appendChild(card);
  });
  wrap.appendChild(teamList);
  wrap.appendChild(
    createButton(
      "Ajouter un membre",
      () => {
        state.label.team.push({ name: "", role: "" });
        renderLabel();
      },
      "ghost admin-add"
    )
  );

  const servicesList = document.createElement("div");
  servicesList.className = "admin-list";
  state.label.services.forEach((service, index) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.appendChild(createInput("Titre", service.title, (value) => (service.title = value)));
    card.appendChild(createTextarea("Texte", service.text, (value) => (service.text = value)));
    card.appendChild(
      createButton("Supprimer", () => {
        state.label.services.splice(index, 1);
        renderLabel();
      }, "ghost")
    );
    servicesList.appendChild(card);
  });
  wrap.appendChild(servicesList);
  wrap.appendChild(
    createButton(
      "Ajouter un service",
      () => {
        state.label.services.push({ title: "", text: "" });
        renderLabel();
      },
      "ghost admin-add"
    )
  );
}

function renderAll() {
  renderHero();
  renderStats();
  renderSignature();
  renderFeatured();
  renderArtists();
  renderReleases();
  renderVideos();
  renderEvents();
  renderProof();
  renderSocials();
  renderContact();
  renderLabel();
}

