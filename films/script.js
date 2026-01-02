// ---------------------
// Remplacement automatique des domaines (corrigé)
// ---------------------
const HOST_MAP = {
  "cinetacos.xyz": "cinefries.xyz",
  "cinechicken.xyz": "cinefries.xyz",
  "cinecake.xyz": "cinefries.xyz",
  "chicken.xyz": "cinefries.xyz",
  "fries.xyz": "cinefries.xyz",
  "waffle.xyz": "cinefries.xyz"
};

function autoReplaceDomain(raw) {
  if (!raw || typeof raw !== "string") return raw;
  try {
    const u = new URL(raw, location.href);
    const host = u.hostname.toLowerCase();
    if (HOST_MAP[host]) {
      u.hostname = HOST_MAP[host];
      return u.href;
    }
    return raw;
  } catch {
    for (const from in HOST_MAP) {
      const re = new RegExp(from.replace(/\./g, "\\."), "ig");
      if (re.test(raw)) return raw.replace(re, HOST_MAP[from]);
    }
    return raw;
  }
}

// ---------------------
// DOM Ready
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");

  if (video?.src) video.src = autoReplaceDomain(video.src);

  video?.querySelectorAll?.("source").forEach(srcEl => {
    const s = srcEl.getAttribute("src");
    if (s) srcEl.setAttribute("src", autoReplaceDomain(s));
  });

  document.querySelectorAll("[data-video]").forEach(el => {
    if (el.dataset.video) el.dataset.video = autoReplaceDomain(el.dataset.video);
  });

  document.querySelectorAll("[data-src]").forEach(el => {
    if (el.dataset.src) el.dataset.src = autoReplaceDomain(el.dataset.src);
  });

  document.querySelectorAll("a[href]").forEach(a => {
    a.href = autoReplaceDomain(a.href);
  });

  // ==================================================
  // ❤️ LIKE / DISLIKE — INSERTION PARFAITE
  // ==================================================
  if (!location.pathname.includes("/films/")) return;
  if (document.querySelector(".vote-container")) return;

  const movieId = location.pathname
    .split("/").filter(Boolean).pop()
    .replace(".html", "");

  // ---------- CSS ----------
  if (!document.getElementById("vote-css")) {
    const style = document.createElement("style");
    style.id = "vote-css";
    style.textContent = `
.vote-container { display: flex; gap: 1rem; margin-top: 20px; }
.vote-btn { display: flex; align-items: center; gap: 8px; border: none; background: #f4f4f4; padding: 10px 18px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.vote-btn:hover { background: #e9e9e9; transform: translateY(-1px); }
.vote-btn svg { transition: fill 0.2s ease; }
.vote-btn span { font-weight: bold; color: #333; font-size: 16px; }
.active-like { background-color: #d6ebff !important; box-shadow: 0 0 8px rgba(0, 128, 255, 0.4); }
.active-like svg { fill: #007bff; }
.active-dislike { background-color: #ffe2e2 !important; box-shadow: 0 0 8px rgba(255, 80, 80, 0.4); }
.active-dislike svg { fill: #ff3333; }`;
    document.head.appendChild(style);
  }

  // ---------- HTML ----------
  const voteWrapper = document.createElement("div");
  voteWrapper.innerHTML = `
<div class="vote-container">
  <button id="likeBtn" class="vote-btn">
    <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#555">
      <path d="M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z"/>
    </svg>
    <span id="likeCount">0</span>
  </button>

  <button id="dislikeBtn" class="vote-btn">
    <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#555">
      <path d="M240-840h440v520L400-40l-50-50q-7-7-11.5-19t4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14Zm360 80H240L120-480v80h360l-54 220 174-174v-406Zm0 406v-406 406Zm80 34v-80h120v-360H680v-80h200v520H680Z"/>
    </svg>
    <span id="dislikeCount">0</span>
  </button>
</div>`;

  const btnWatch = document.querySelector(".btn-watch");
  const ficheInfo = document.querySelector(".fiche-info");
  if (btnWatch) btnWatch.insertAdjacentElement("afterend", voteWrapper);
  else if (ficheInfo) ficheInfo.appendChild(voteWrapper);
  else document.body.appendChild(voteWrapper);

  // ---------- Supabase ----------
  import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) => {
    const supabase = createClient(
      "https://wuagahavmbugmnuzsouf.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho" // <-- Remplacer par ta clé
    );

    const likeBtn = document.getElementById("likeBtn");
    const dislikeBtn = document.getElementById("dislikeBtn");
    const likeCount = document.getElementById("likeCount");
    const dislikeCount = document.getElementById("dislikeCount");

    let userId = null;
    let currentVote = null;

    async function initUser() {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id || null;
    }

    async function loadVotes() {
      const { data } = await supabase
        .from("movie_likes")
        .select("user_id, liked")
        .eq("movie_id", movieId);

      if (!data) {
        likeCount.textContent = 0;
        dislikeCount.textContent = 0;
        return;
      }

      // Affiche le nombre total de votes pour tous les utilisateurs
      likeCount.textContent = data.filter(v => v.liked).length;
      dislikeCount.textContent = data.filter(v => !v.liked).length;

      // Etat du vote de l'utilisateur actuel
      currentVote = userId ? (data.find(v => v.user_id === userId)?.liked ? "like" : "dislike") : null;
      likeBtn.classList.toggle("active-like", currentVote === "like");
      dislikeBtn.classList.toggle("active-dislike", currentVote === "dislike");
    }

    async function vote(liked) {
      if (!userId) {
        alert("Connecte-toi pour voter !");
        return;
      }

      await supabase.from("movie_likes")
        .delete()
        .eq("movie_id", movieId)
        .eq("user_id", userId);

      if (currentVote !== (liked ? "like" : "dislike")) {
        await supabase.from("movie_likes").insert({
          movie_id: movieId,
          user_id: userId,
          liked
        });
        currentVote = liked ? "like" : "dislike";
      } else {
        currentVote = null;
      }

      loadVotes();
    }

    // Gestion des clics
    likeBtn.onclick = () => vote(true);
    dislikeBtn.onclick = () => vote(false);

    // Realtime updates
    supabase
      .channel("movie_likes_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "movie_likes" }, p => {
        if (p.new?.movie_id === movieId || p.old?.movie_id === movieId) {
          loadVotes();
        }
      })
      .subscribe();

    initUser().then(loadVotes);
  });
});

// ---------------------
// BTN WATCH → animation cinéma + clic fullscreen du lecteur
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const btnWatch = document.getElementById("btnWatch");
  const fullscreenBtn = document.getElementById("fullscreen");
  const videoContainer = document.getElementById("videoContainer");

  if (!btnWatch || !fullscreenBtn || !videoContainer) return;

  // ===== CSS CINÉMA =====
  if (!document.getElementById("cinema-css")) {
    const style = document.createElement("style");
    style.id = "cinema-css";
    style.textContent = `
      .cinema-overlay {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at center, #111 0%, #000 70%);
        opacity: 0;
        pointer-events: none;
        z-index: 99999;
        transition: opacity 0.6s ease;
      }

      .cinema-overlay.active {
        opacity: 1;
      }

      .cinema-zoom {
        animation: cinemaZoom 0.8s cubic-bezier(.25,.8,.25,1) forwards;
      }

      @keyframes cinemaZoom {
        from {
          transform: scale(0.92);
          filter: blur(6px);
        }
        to {
          transform: scale(1);
          filter: blur(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ===== Overlay =====
  const overlay = document.createElement("div");
  overlay.className = "cinema-overlay";
  document.body.appendChild(overlay);

  btnWatch.addEventListener("click", () => {
    // fondu cinéma
    overlay.classList.add("active");

    // zoom stylé du lecteur
    videoContainer.classList.add("cinema-zoom");

    // timing synchro
    setTimeout(() => {
      // 🔥 SIMULATION DU CLIC FULLSCREEN DU LECTEUR
      fullscreenBtn.click();

      // retirer l'overlay
      setTimeout(() => {
        overlay.classList.remove("active");
      }, 200);
    }, 600);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".card");
  const videoContainer = document.getElementById("videoContainer"); // lecteur global
  const video = videoContainer?.querySelector("video");            // vidéo existante
  const fullscreenBtn = document.getElementById("fullscreen");     // bouton fullscreen existant

  if (!cards.length || !video || !videoContainer || !fullscreenBtn) return;

  // ===== CSS CINÉMA (une seule fois) =====
  if (!document.getElementById("cinema-css")) {
    const style = document.createElement("style");
    style.id = "cinema-css";
    style.textContent = `
      .cinema-overlay {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at center, #111 0%, #000 70%);
        opacity: 0;
        pointer-events: none;
        z-index: 99999;
        transition: opacity 0.6s ease;
      }

      .cinema-overlay.active {
        opacity: 1;
      }

      .cinema-zoom {
        animation: cinemaZoom 0.8s cubic-bezier(.25,.8,.25,1) forwards;
      }

      @keyframes cinemaZoom {
        from { transform: scale(0.92); filter: blur(6px); }
        to   { transform: scale(1); filter: blur(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ===== Overlay =====
  const overlay = document.createElement("div");
  overlay.className = "cinema-overlay";
  document.body.appendChild(overlay);

  // ===== Click sur chaque carte =====
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const videoSrc = card.dataset.video;
      if (!videoSrc) return;

      // charger la vidéo dans le lecteur global
      video.src = videoSrc;
      video.load();

      // effet cinéma
      overlay.classList.add("active");
      videoContainer.classList.add("cinema-zoom");

      setTimeout(() => {
        video.play();
        fullscreenBtn.click();

        setTimeout(() => {
          overlay.classList.remove("active");
          videoContainer.classList.remove("cinema-zoom");
        }, 200);
      }, 600);
    });
  });
});



// ==================================================
// BACK BUTTON → RETOUR CINÉMA PREMIUM (animation inverse)
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.getElementById("backButton");
  const videoContainer = document.getElementById("videoContainer");

  if (!backButton || !videoContainer) return;

  // ---------------------
  // Injection CSS (1 seule fois)
  // ---------------------
  if (!document.getElementById("cinema-back-css")) {
    const style = document.createElement("style");
    style.id = "cinema-back-css";
    style.textContent = `
      /* Overlay fondu */
      .cinema-back-overlay {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at center, #111 0%, #000 75%);
        opacity: 0;
        pointer-events: none;
        z-index: 99990;
        transition: opacity 0.7s ease;
      }
      .cinema-back-overlay.active {
        opacity: 1;
      }

      /* Barres cinéma */
      .cinema-back-bars::before,
      .cinema-back-bars::after {
        content: "";
        position: fixed;
        left: 0;
        width: 100%;
        height: 0;
        background: black;
        z-index: 99991;
        transition: height 0.6s cubic-bezier(.77,0,.18,1);
      }
      .cinema-back-bars::before { top: 0; }
      .cinema-back-bars::after { bottom: 0; }

      .cinema-back-bars.active::before,
      .cinema-back-bars.active::after {
        height: 12vh;
      }

      /* Animation sortie */
      @keyframes cinemaBackExit {
        0% {
          transform: scale(1) perspective(1200px);
          filter: blur(0) brightness(1);
        }
        60% {
          filter: blur(6px) brightness(0.85);
        }
        100% {
          transform: scale(0.88) perspective(1200px) rotateX(4deg);
          filter: blur(10px) brightness(0.65);
        }
      }

      .cinema-back-exit {
        animation: cinemaBackExit 0.9s cubic-bezier(.4,0,.2,1) forwards;
      }

      /* Grain cinéma */
      .cinema-back-grain {
        position: fixed;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
        pointer-events: none;
        z-index: 99992;
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      .cinema-back-grain.active {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // ---------------------
  // Création des éléments
  // ---------------------
  const overlay = document.createElement("div");
  overlay.className = "cinema-back-overlay";
  document.body.appendChild(overlay);

  const bars = document.createElement("div");
  bars.className = "cinema-back-bars";
  document.body.appendChild(bars);

  const grain = document.createElement("div");
  grain.className = "cinema-back-grain";
  document.body.appendChild(grain);

  // ---------------------
  // Click bouton retour
  // ---------------------
  backButton.addEventListener("click", () => {
    overlay.classList.add("active");
    bars.classList.add("active");
    grain.classList.add("active");

    videoContainer.classList.add("cinema-back-exit");

    setTimeout(() => {
      overlay.classList.remove("active");
      bars.classList.remove("active");
      grain.classList.remove("active");

      videoContainer.classList.remove("cinema-back-exit");
    }, 900);
  });
});


// ---------------------
// CSS pour Next Episode / Skip Intro / Options (version améliorée)
// ---------------------
(function injectPlayerCSS() {
  if (document.getElementById("player-css")) return;

  const style = document.createElement("style");
  style.id = "player-css";
  style.textContent = `
    /* Bouton Episode Suivant */
    .overlay-btn {
      position: absolute;
      right: 40px;
      bottom: 90px;
      background: rgba(0,0,0,.85);
      color: white;
      padding: 14px 18px;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,.5);
      z-index: 99999;
      opacity: 0;
      transform: translateY(15px);
      pointer-events: none;
      transition: all .35s cubic-bezier(.25,.8,.25,1);
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 200px;
      font-family: sans-serif;
    }
    .overlay-btn.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .overlay-btn button { border: none; border-radius: 10px; padding: 8px; cursor: pointer; font-weight: bold; }
    .overlay-btn .primary-btn { background: white; color: black; }
    .overlay-btn .secondary-btn { background: transparent; color: #ccc; font-size: 13px; }
    .overlay-btn .countdown { font-size: 13px; opacity: .8; }

    /* Skip Intro */
    .skip-intro {
      position: absolute;
      right: 40px;
      bottom: 150px; /* légèrement au-dessus du bouton Episode Suivant */
      background: rgba(0,0,0,.7);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity .3s ease;
      z-index: 99999;
      font-size: 14px;
      font-weight: bold;
    }
    .skip-intro.visible { opacity: 1; pointer-events: auto; }

    /* Options utilisateur */
    .player-settings {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,.6);
      color: white;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      transition: opacity .3s ease;
      z-index: 99999;
      width: 180px;
      font-family: sans-serif;
    }
    .player-settings.hidden { opacity: 0; pointer-events: none; }
    .player-settings label { display: block; margin-bottom: 6px; cursor: pointer; }
    .player-settings input { margin-right: 6px; }
  `;
  document.head.appendChild(style);
})();

// ---------------------
// Script Player
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const container = document.getElementById("videoContainer");
  if (!video || !container) return;

  // ---------- Paramètres utilisateur ----------
  const SETTINGS_KEY = "playerSettings";
  const defaultSettings = { autoplayNext: true, skipIntro: true };
  let settings = { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

  // ---------- UI ----------
  const nextOverlay = document.createElement("div");
  nextOverlay.className = "overlay-btn";
  nextOverlay.innerHTML = `
    <strong>Épisode suivant</strong>
    <span class="countdown">Lecture auto dans <b id="count">10</b>s</span>
    <button class="primary-btn">▶ Lancer maintenant</button>
    <button class="secondary-btn">Annuler</button>
  `;
  container.appendChild(nextOverlay);

  const skipIntro = document.createElement("div");
  skipIntro.className = "skip-intro";
  skipIntro.textContent = "Passer l’intro ▶▶";
  container.appendChild(skipIntro);

  const settingsUI = document.createElement("div");
  settingsUI.className = "player-settings";
  settingsUI.innerHTML = `
    <label><input type="checkbox" id="autoplayToggle"> Autoplay épisode suivant</label>
    <label><input type="checkbox" id="skipIntroToggle"> Bouton passer l’intro</label>
  `;
  container.appendChild(settingsUI);

  // ---------- Inputs ----------
  const autoplayToggle = settingsUI.querySelector("#autoplayToggle");
  const skipIntroToggle = settingsUI.querySelector("#skipIntroToggle");
  autoplayToggle.checked = settings.autoplayNext;
  skipIntroToggle.checked = settings.skipIntro;
  autoplayToggle.onchange = () => { settings.autoplayNext = autoplayToggle.checked; saveSettings(); };
  skipIntroToggle.onchange = () => { settings.skipIntro = skipIntroToggle.checked; skipIntro.classList.remove("visible"); saveSettings(); };

  const nextBtn = nextOverlay.querySelector(".primary-btn");
  const cancelBtn = nextOverlay.querySelector(".secondary-btn");
  const countEl = nextOverlay.querySelector("#count");

  let countdown = null, seconds = 17, lastTime = 0, shownNext = false, cancelledNext = false;

  const cards = () => [...document.querySelectorAll(".card")];
  const nextSrc = () => cards()[cards().findIndex(c => c.dataset.video === video.currentSrc) + 1]?.dataset.video;

  // ---------- Skip intro ----------
  video.addEventListener("timeupdate", () => {
    if (!settings.skipIntro) { skipIntro.classList.remove("visible"); return; }
    if (video.currentTime > 5 && video.currentTime < 80) skipIntro.classList.add("visible");
    else skipIntro.classList.remove("visible");
  });
  skipIntro.onclick = () => { video.currentTime = 85; skipIntro.classList.remove("visible"); };

  // ---------- Autoplay Next ----------
  function startCountdown() {
    if (!settings.autoplayNext || countdown) return;
    countdown = setInterval(() => {
      seconds--;
      countEl.textContent = seconds;
      if (seconds <= 0) playNext();
    }, 1000);
  }

  function resetNextUI(full = false) {
    nextOverlay.classList.remove("visible");
    clearInterval(countdown);
    countdown = null;
    seconds = 17;
    countEl.textContent = seconds;
    shownNext = false;
    if (full) cancelledNext = false;
  }

  function playNext() {
    const src = nextSrc();
    if (!src) return;
    video.src = src;
    video.load();
    video.play().catch(() => {});
    resetNextUI(true);
  }

  video.addEventListener("timeupdate", () => {
    if (!video.duration || shownNext || cancelledNext) return;
    if (video.currentTime < lastTime - 1) return;
    lastTime = video.currentTime;

    if (video.duration - video.currentTime <= 20 && nextSrc()) {
      shownNext = true;
      nextOverlay.classList.add("visible");
      startCountdown();
    }
  });

  nextBtn.onclick = playNext;
  cancelBtn.onclick = () => { cancelledNext = true; resetNextUI(false); };

  // ---------- Options auto-hide ----------
  const options = [settingsUI];
  let hideTimer;
  function showOptions() { options.forEach(c => c.classList.remove("hidden")); resetHideTimer(); }
  function hideOptions() { options.forEach(c => c.classList.add("hidden")); }
  function resetHideTimer() { clearTimeout(hideTimer); hideTimer = setTimeout(hideOptions, 3500); }
  document.addEventListener("mousemove", showOptions);
  resetHideTimer();

  // ---------- Reset sur nouvel épisode ----------
  video.addEventListener("loadedmetadata", () => { resetNextUI(true); lastTime = 0; });
});

// ------------AFFICHER LE TITRE ET LE NUMERO D EPISODE DANS LE LECTEUR //
(function injectEpisodeInfoCSS() {
  if (document.getElementById("episode-info-css")) return;

  const style = document.createElement("style");
  style.id = "episode-info-css";
  style.textContent = `
    .episode-info {
      position: absolute;
      top: 78px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(
        to bottom,
        rgba(0,0,0,.75),
        rgba(0,0,0,.55)
      );
      color: white;
      padding: 12px 24px;
      border-radius: 16px;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: .3px;
      z-index: 99999;
      opacity: 0;
      transition: opacity .25s ease, transform .25s ease;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 10px 30px rgba(0,0,0,.45);
    }

    .episode-info.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
})();


document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const container = document.getElementById("videoContainer");
  const titleEl = document.querySelector(".fiche-info h1");

  if (!video || !container || !titleEl) {
    console.warn("Episode info: éléments manquants", {
      video: !!video,
      container: !!container,
      title: !!titleEl
    });
    return;
  }

  const info = document.createElement("div");
  info.className = "episode-info";
  container.appendChild(info);

  function getFilename(url) {
    return url?.split("/").pop()?.split("?")[0];
  }

  function getCurrentCard() {
    const videoFile = getFilename(video.currentSrc);
    return [...document.querySelectorAll(".card")].find(card =>
      getFilename(card.dataset.video) === videoFile
    );
  }

  function isMovie() {
    return document.querySelectorAll(".card").length === 0;
  }

  function updateEpisodeInfo() {
    const title = titleEl.textContent.trim();

    if (isMovie()) {
      info.textContent = title;
      showInfo(true);
      return;
    }

    const card = getCurrentCard();
    if (!card) {
      console.warn("Episode info: carte non trouvée");
      return;
    }

    const season = card.dataset.season || "";
    const episodeText = card.querySelector("h3")?.textContent || "";
    const epNumber = episodeText.replace(/\D/g, "");

    const s = season ? `S${String(season).padStart(2, "0")}` : "";
    const e = epNumber ? `E${String(epNumber).padStart(2, "0")}` : "";

    info.textContent = `${s} • ${e} — ${title}`;
    showInfo(true);
  }

  let hideTimer;
  function showInfo(force = false) {
    info.classList.add("visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      info.classList.remove("visible");
    }, force ? 4000 : 3000);
  }

  // 🎬 événements fiables
  video.addEventListener("loadedmetadata", updateEpisodeInfo);
  video.addEventListener("play", updateEpisodeInfo);
  container.addEventListener("mousemove", () => showInfo(false));

  // sécurité si la vidéo est déjà chargée
  setTimeout(updateEpisodeInfo, 500);
});


// ---------------------
// Sécuriser playMovie()
// ---------------------
(function () {
  const oldPlayMovie = window.playMovie;
  window.playMovie = function (src) {
    src = autoReplaceDomain(src);
    if (typeof oldPlayMovie === "function") return oldPlayMovie(src);
    const video = document.getElementById("video");
    if (video) {
      video.src = src;
      video.load();
      video.play().catch(() => {});
    }
  };
})();













