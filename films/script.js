// ---------------------
// Remplacement automatique des domaines (corrigé)
// ---------------------
const HOST_MAP = {
  "cinetacos.xyz": "cinefries.xyz",
  "cinechicken.xyz": "cinefries.xyz", 
  "cinecake.xyz": "cinefries.xyz",// reste tel quel
  "chicken.xyz": "cinechicken.xyz",     // 🔑 avant → burger.xyz (problème)
// si tu as vraiment besoin de "burger.xyz", ajoute une règle séparée
  "fries.xyz": "fries.xyz"
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
  } catch (err) {
    // fallback simple
    for (const from in HOST_MAP) {
      const re = new RegExp(from.replace(/\./g, "\\."), "ig");
      if (re.test(raw)) return raw.replace(re, HOST_MAP[from]);
    }
    return raw;
  }
}

// ---------------------
// Appliquer les corrections une fois le DOM chargé
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");

  if (video && video.src) {
    video.src = autoReplaceDomain(video.src);
  }

  if (video) {
    video.querySelectorAll("source").forEach(srcEl => {
      const s = srcEl.getAttribute("src");
      if (s) srcEl.setAttribute("src", autoReplaceDomain(s));
    });
  }

  document.querySelectorAll("[data-video]").forEach(el => {
    if (el.dataset.video) {
      el.dataset.video = autoReplaceDomain(el.dataset.video);
    }
  });

  document.querySelectorAll("[data-src]").forEach(el => {
    if (el.dataset.src) {
      el.dataset.src = autoReplaceDomain(el.dataset.src);
    }
  });

  document.querySelectorAll("a[href]").forEach(a => {
    a.href = autoReplaceDomain(a.href);
  });
});

// ---------------------
// Sécuriser playMovie()
// ---------------------
(function () {
  const oldPlayMovie = window.playMovie;
  window.playMovie = function (src) {
    src = autoReplaceDomain(src);
    if (typeof oldPlayMovie === "function") {
      return oldPlayMovie(src);
    }
    const video = document.getElementById("video");
    if (video) {
      video.src = src;
      video.load();
      video.play().catch(err => console.warn("Erreur lecture vidéo :", err));
    }
  };
})();

