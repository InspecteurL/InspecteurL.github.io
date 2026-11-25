const HOST_MAP = {
  "cinetacos.xyz": "cinecake.xyz",
  "cinechicken.xyz": "cinecake.xyz",
  "cinecake.xyz": "cinecake.xyz",
  "cinefries.xyz": "cinecake.xyz", // ✅ MANQUANT
  "chicken.xyz": "cinecake.xyz",
  "fries.xyz": "cinecake.xyz",
  "waffle.xyz": "cinecake.xyz",
  "donuts.xyz": "cinecake.xyz"
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
      const mine = userId ? data.find(v => v.user_id === userId) : null;
      currentVote = mine ? (mine.liked ? "like" : "dislike") : null;
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
      // 🔥 SIMULATION DU CLIC FULLSCREEN DU LECTEUR (PC uniquement, le mobile est géré en bas du fichier)
      if (!window.matchMedia("(pointer: coarse)").matches) fullscreenBtn.click();

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
        if (!window.matchMedia("(pointer: coarse)").matches) fullscreenBtn.click();

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

document.addEventListener('keydown', (e) => {
  // ne pas bloquer la saisie dans les champs de texte
  if (e.target.closest?.("input, textarea, [contenteditable]")) return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === 'ArrowRight') video.currentTime += 10;
  if (e.code === 'ArrowLeft') video.currentTime -= 10;
});

document.addEventListener("DOMContentLoaded", () => {
  const oldNavbar = document.getElementById("navbar");
  if (!oldNavbar) return;

  // ---------------------
  // INJECTION CSS (1 seule fois)
  // ---------------------
  if (!document.getElementById("navbar-css")) {
    const style = document.createElement("style");
    style.id = "navbar-css";
    style.textContent = `
  nav {
    display: flex;
    justify-content: center; /* 🔥 centre tout */
    align-items: center;
    gap: 40px; /* + d’espace */
    padding: 20px 40px; /* + grand */
    background: rgba(15,15,15,0.75);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 999;
  }

  nav a {
    color: #bbb;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px; /* 🔥 plus lisible */
    transition: all 0.25s ease;
    position: relative;
  }

  nav a:hover {
    color: white;
  }

  /* LOGO */
  .nav-logo {
    position: absolute;
    left: 40px; /* 🔥 reste à gauche */
    font-weight: bold;
    font-size: 22px; /* 🔥 plus gros */
    color: white;
  }

  /* ACTIVE */
  nav a.active {
    color: white;
  }

  nav a.active::after {
    content: "";
    position: absolute;
    bottom: -6px;
    left: 0;
    width: 100%;
    height: 2px;
    background: #e50914;
    border-radius: 2px;
  }
`;
    document.head.appendChild(style);
  }

  // ---------------------
  // NAVBAR
  // ---------------------
  const nav = document.createElement("nav");

  const NAV_ITEMS = [
    { name: "Accueil", href: "https://inspecteurl.github.io/site/accueil.html" },
    { name: "Catalogue", href: "https://inspecteurl.github.io/site/catalogue.html" },
    { name: "Communauté", href: "https://inspecteurl.github.io/site/communaute.html" },
    { name: "Forum", href: "https://inspecteurl.github.io/site/forum.html" },
    { name: "Profil", href: "https://inspecteurl.github.io/site/profil.html" }
  ];

  nav.innerHTML = `
    <a href="https://inspecteurl.github.io/site/accueil.html" class="nav-logo">HorizonCiné</a>
    ${NAV_ITEMS.map(item => `
      <a href="${item.href}">${item.name}</a>
    `).join("")}
  `;

  // Remplacement
  oldNavbar.replaceWith(nav);

  // ---------------------
  // ACTIVE AUTO
  // ---------------------
  const current = location.pathname.split("/").pop();

  nav.querySelectorAll("a").forEach(link => {
    const href = link.getAttribute("href");

    if (href === current) {
      link.classList.add("active");
    }
  });
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

// ==================================================
// 📱 MOBILE : navbar en menu déroulant + ajustements fiche / lecteur
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector("nav");
  if (!nav || nav.dataset.mobileReady) return;
  nav.dataset.mobileReady = "1";

  // ---------- CSS ----------
  if (!document.getElementById("mobile-fiche-css")) {
    const style = document.createElement("style");
    style.id = "mobile-fiche-css";
    style.textContent = `
      /* PC : le conteneur est "invisible", la navbar reste identique */
      .nav-menu { display: contents; }
      .nav-burger { display: none; }

      @media (max-width: 768px) {

        /* ----- NAVBAR : logo + burger, liens dans un menu déroulant ----- */
        nav {
          justify-content: space-between;
          gap: 0;
          padding: 10px 16px;
        }
        .nav-logo { position: static; font-size: 20px; }

        .nav-burger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 8px;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }

        .nav-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          flex-direction: column;
          background: rgba(10,10,10,.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 16px 30px rgba(0,0,0,.6);
        }
        .nav-menu.open { display: flex; }
        .nav-menu a {
          display: block;
          padding: 15px 20px;
          font-size: 16px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .nav-menu a:last-child { border-bottom: none; }
        .nav-menu a::after { display: none; }
        .nav-menu a.active { color: #fff; border-left: 3px solid #e50914; }

        /* ----- FICHE ----- */
        .container { padding: 14px; }
        .fiche-info p { overflow-wrap: anywhere; }
        .vote-container { justify-content: center; }

        /* ----- LECTEUR : titre recalé pour petit écran ----- */
        .episode-info {
          top: 64px;
          max-width: 88vw;
          white-space: normal;
          text-align: center;
          font-size: 14px;
          padding: 8px 14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- Structure : liens rangés dans un conteneur ----------
  const logo = nav.querySelector(".nav-logo");
  const menu = document.createElement("div");
  menu.className = "nav-menu";
  menu.id = "navMenu";
  [...nav.children].forEach(el => { if (el !== logo) menu.appendChild(el); });
  nav.appendChild(menu);

  // ---------- Bouton burger ----------
  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "nav-burger";
  burger.textContent = "☰";
  burger.setAttribute("aria-label", "Ouvrir le menu");
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-controls", "navMenu");
  nav.appendChild(burger);

  function setOpen(open) {
    menu.classList.toggle("open", open);
    burger.textContent = open ? "✕" : "☰";
    burger.setAttribute("aria-expanded", String(open));
  }

  burger.addEventListener("click", e => {
    e.stopPropagation();
    setOpen(!menu.classList.contains("open"));
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".nav-menu")) setOpen(false);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) setOpen(false);
  });
});

// ==================================================
// 📱 MOBILE : paysage automatique au lancement d'un film / épisode
//             + retour au mode normal avec "Retour à la fiche"
// ==================================================
(function () {
  const estMobile = () =>
    window.matchMedia("(pointer: coarse)").matches &&
    Math.min(screen.width, screen.height) <= 1024;

  let lecteurActif = null;
  let demandeEnCours = false;
  let modePortrait = false;     // true après "Retour à la fiche"
  let retourEnCours = false;

  const elementPleinEcran = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;

  // ---------- CSS (secours iPhone) ----------
  const style = document.createElement("style");
  style.id = "paysage-css";
  style.textContent = `
    .faux-paysage {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      background: #000 !important;
      z-index: 99998 !important;
      transform: none !important;
      animation: none !important;
      filter: none !important;
    }

    /* Téléphone tenu en portrait : on pivote le lecteur */
    @media (orientation: portrait) {
      .faux-paysage {
        top: 50% !important;
        left: 50% !important;
        width: 100vh !important;
        width: 100dvh !important;
        height: 100vw !important;
        transform: translate(-50%, -50%) rotate(90deg) !important;
      }
    }

    .faux-paysage video {
      width: 100% !important;
      height: 100% !important;
      max-height: none !important;
      object-fit: contain !important;
    }

    body.faux-paysage-actif { overflow: hidden !important; }
    body.faux-paysage-actif nav { display: none !important; }

    .fermer-paysage {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: rgba(0,0,0,.65);
      color: #fff;
      font-size: 18px;
      z-index: 100000;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  function trouverLecteur(video) {
    const bloc = video.closest("#videoContainer, .video-container, .player-container");
    if (bloc) return bloc;
    return video.parentElement !== document.body ? video.parentElement : video;
  }

  async function verrouillerPaysage() {
    try {
      await screen.orientation.lock("landscape");
      return true;
    } catch {
      return false;
    }
  }

  function activerFauxPaysage(lecteur) {
    lecteurActif = lecteur;
    lecteur.classList.add("faux-paysage");
    document.body.classList.add("faux-paysage-actif");

    if (lecteur.tagName !== "VIDEO" && !lecteur.querySelector(".fermer-paysage")) {
      const fermer = document.createElement("button");
      fermer.type = "button";
      fermer.className = "fermer-paysage";
      fermer.textContent = "✕";
      fermer.setAttribute("aria-label", "Quitter le plein écran");
      fermer.addEventListener("click", e => {
        e.stopPropagation();
        lecteur.querySelector("video")?.pause();
        quitterPaysage();
      });
      lecteur.appendChild(fermer);
    }
  }

  function quitterPaysage() {
    if (lecteurActif) {
      lecteurActif.classList.remove("faux-paysage");
      lecteurActif.querySelector(".fermer-paysage")?.remove();
      lecteurActif = null;
    }
    document.body.classList.remove("faux-paysage-actif");
    try { screen.orientation.unlock(); } catch {}
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
  }

  async function lancerPaysage(lecteur) {
    if (!estMobile() || !lecteur || demandeEnCours || lecteurActif) return;
    demandeEnCours = true;
    modePortrait = false;

    try {
      const actuel = elementPleinEcran();
      if (actuel && actuel !== document.documentElement) {
        await verrouillerPaysage();
        return;
      }

      const demander = lecteur.requestFullscreen || lecteur.webkitRequestFullscreen;

      // iPhone : pas de plein écran possible sur le conteneur
      if (!demander) {
        activerFauxPaysage(lecteur);
        return;
      }

      try {
        await demander.call(lecteur);
      } catch {
        return; // refusé (ex : lecture lancée sans action de l'utilisateur)
      }

      // Plein écran obtenu mais rotation impossible : on pivote en CSS
      if (!(await verrouillerPaysage())) activerFauxPaysage(lecteur);
    } finally {
      demandeEnCours = false;
    }
  }

  // Clic sur "Lire le film" ou sur la carte d'un épisode
  document.addEventListener("click", e => {
    if (!document.querySelector(".fiche-info")) return;
    if (!e.target.closest("#btnWatch, .btn-watch, .card[data-video]")) return;
    lancerPaysage(document.getElementById("videoContainer"));
  }, true);

  // Lancement de n'importe quelle vidéo d'une fiche
  document.addEventListener("play", e => {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement)) return;
    if (!document.querySelector(".fiche-info")) return;
    if (video.muted) return; // ignore les vidéos de fond
    lancerPaysage(trouverLecteur(video));
  }, true);

  // Évite qu'iPhone ouvre son propre lecteur à la place du tien
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("video").forEach(v => v.setAttribute("playsinline", ""));
  });

  async function sortirPleinEcran() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.webkitFullscreenElement) await document.webkitExitFullscreen();
    } catch {}
  }

  // Force le portrait : la fiche reste en plein écran, sinon le verrouillage est refusé
  async function imposerPortrait() {
    retourEnCours = true;
    modePortrait = true;

    try {
      quitterPaysage();
      await sortirPleinEcran();

      const racine = document.documentElement;
      const demander = racine.requestFullscreen || racine.webkitRequestFullscreen;
      if (demander && !elementPleinEcran()) await demander.call(racine);

      await screen.orientation.lock("portrait");
    } catch {
      // rotation impossible à imposer (ex : iPhone) : on revient à l'affichage normal
      modePortrait = false;
      await sortirPleinEcran();
    } finally {
      retourEnCours = false;
    }
  }

  // Bouton "Retour à la fiche"
  document.addEventListener("click", e => {
    if (!estMobile() || !e.target.closest("#backButton")) return;
    // la fiche quitte le plein écran 900 ms après le clic : on passe après elle
    setTimeout(imposerPortrait, 1100);
  }, true);

  // Sortie du plein écran (geste ou bouton retour du téléphone)
  function surChangementPleinEcran() {
    if (!estMobile() || retourEnCours) return;
    const actuel = elementPleinEcran();

    if (!actuel) {
      modePortrait = false;
      quitterPaysage();
    } else if (actuel !== document.documentElement) {
      verrouillerPaysage();
    } else if (modePortrait) {
      screen.orientation?.lock?.("portrait").catch(() => {});
    }
  }
  document.addEventListener("fullscreenchange", surChangementPleinEcran);
  document.addEventListener("webkitfullscreenchange", surChangementPleinEcran);
})();

// ==================================================
// 📱 MOBILE : lecteur de secours touchable + bouton retour qui se masque
// ==================================================
(function () {
  const style = document.createElement("style");
  style.id = "fallback-tactile-css";
  style.textContent = `
    @media (pointer: coarse) {
      /* petite zone en haut à gauche : la toucher réaffiche le bouton retour */
      #fallbackHoverZone {
        width: 170px !important;
        height: 56px !important;
        touch-action: manipulation;
      }

      #backButton { top: 8px; left: 8px; padding: 8px 12px; font-size: 13px; }

      /* boutons du bas : zones tactiles plus grandes et éloignées du bord */
      #controls { bottom: 14px; }
      #controls .controls-right { gap: 4px; margin-right: 16px; }
      #controls .controls-right .material-symbols-outlined { padding: 8px; touch-action: manipulation; }
      #progressWrapper { bottom: 96px; }
      #settingsMenu, #sourceMenu, #subtitleMenu {
        bottom: 90px;
        max-height: calc(100% - 100px);
        overflow-y: auto;
        z-index: 1100;
      }

      @media (max-width: 600px) {
        #controls .controls-right { margin-right: 0; }
        #progressWrapper { bottom: 150px; }
      }

      /* le gros bouton lecture ne doit pas recouvrir le lecteur de secours */
      #videoContainer:has(#fallbackFrame[style*="display: block"]) #centerPlay {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", () => {
    const zone = document.getElementById("fallbackHoverZone");
    const bouton = document.getElementById("backButton");
    if (!zone || !bouton) return;

    let minuteur;
    zone.addEventListener("touchend", e => {
      // évite que ce même toucher active aussitôt le bouton retour
      e.preventDefault();
      bouton.classList.remove("hide");
      clearTimeout(minuteur);
      clearTimeout(window.fallbackBtnHideTimeout);
      minuteur = setTimeout(() => {
        if (getComputedStyle(zone).display !== "none") bouton.classList.add("hide");
      }, 3000);
    }, { passive: false });
  });
})();
