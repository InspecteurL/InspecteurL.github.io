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

