// ---------------------
// Remplacement automatique des domaines
// ---------------------
const replacements = {
  "cinetacos.xyz": "cinechicken.xyz",
  "chicken.xyz": "burger.xyz"
};

function autoReplaceDomain(url) {
  if (!url || typeof url !== "string") return url;
  for (const oldDomain in replacements) {
    if (url.includes(oldDomain)) {
      return url.replace(new RegExp(oldDomain, "g"), replacements[oldDomain]);
    }
  }
  return url;
}

// ---------------------
// Appliquer les corrections une fois le DOM chargé
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");

  // Corrige la source directe du <video>
  if (video && video.src) {
    video.src = autoReplaceDomain(video.src);
  }

  // Corrige aussi les <source> enfants
  if (video) {
    video.querySelectorAll("source").forEach(srcEl => {
      const s = srcEl.getAttribute("src");
      if (s) srcEl.setAttribute("src", autoReplaceDomain(s));
    });
  }

  // Corrige toutes les data-video (👉 Arcane est ici)
  document.querySelectorAll("[data-video]").forEach(el => {
    if (el.dataset.video) {
      el.dataset.video = autoReplaceDomain(el.dataset.video);
    }
  });

  // Corrige aussi data-src si jamais tu en utilises
  document.querySelectorAll("[data-src]").forEach(el => {
    if (el.dataset.src) {
      el.dataset.src = autoReplaceDomain(el.dataset.src);
    }
  });

  // Corrige les liens <a href="">
  document.querySelectorAll("a[href]").forEach(a => {
    a.href = autoReplaceDomain(a.href);
  });
});

// script.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.8.0/+esm';

// Vérifie si on est sur la page films
if (window.location.href.startsWith("https://inspecteurl.github.io/films/")) {
  
  // --- Supabase ---
  const supabase = createClient(
    'https://wuagahavmbugmnuzsouf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho'
  );

  let userId = null;
  async function fetchSession() {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Erreur session Supabase:", error);
      return null;
    }
    return sessionData?.session?.user?.id || null;
  }
  (async () => { userId = await fetchSession(); })();

  // --- Mise à jour activité ---
  async function updateCurrentActivity() {
    if (!userId) return;
    const title = document.querySelector(".fiche-info h1")?.textContent || "";
    const poster = document.querySelector(".fiche img")?.src || "";

    const { error } = await supabase
      .from("profiles")
      .update({
        currently_watching: title,
        episode_number: null,
        current_season: null,
        episode_image: poster
      })
      .eq("id", userId);

    if (error) console.error("Erreur update activité:", error);
  }

  // --- Effacer activité ---
  async function clearCurrentActivity() {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        currently_watching: null,
        episode_number: null,
        current_season: null,
        episode_image: null
      })
      .eq("id", userId);

    if (error) console.error("Erreur clear activité:", error);
  }

  // --- Intégration avec le lecteur ---
  const btnWatch = document.getElementById('btnWatch');
  const backButton = document.getElementById('backButton');
  const video = document.getElementById('video');

  if (btnWatch && backButton && video) {
    // Quand on lance le film
    btnWatch.addEventListener("click", () => {
      updateCurrentActivity();
    });

    // Quand on ferme le lecteur
    backButton.addEventListener("click", () => {
      clearCurrentActivity();
    });

    // Quand la vidéo se termine
    video.addEventListener("ended", () => {
      clearCurrentActivity();
    });
  }
}


// ---------------------
// Sécuriser playMovie()
// ---------------------
(function () {
  const oldPlayMovie = window.playMovie;
  window.playMovie = function (src) {
    src = autoReplaceDomain(src); // ✅ on corrige ici aussi
    if (typeof oldPlayMovie === "function") {
      return oldPlayMovie(src);
    }
    const video = document.getElementById("video");
    if (video) {
      video.src = src;
      video.play().catch(err => console.warn("Erreur lecture vidéo :", err));
    }
  };
})();

