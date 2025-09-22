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
      return url.replace(oldDomain, replacements[oldDomain]);
    }
  }
  return url;
}

// ---------------------
// Appliquer les corrections une fois le DOM chargé
// ---------------------
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const cards = document.querySelectorAll(".card");

  // 1) Corrige la source directe du <video>
  if (video) {
    if (video.src) {
      video.src = autoReplaceDomain(video.src);
    }

    // Corrige aussi les <source> enfants s’il y en a
    video.querySelectorAll("source").forEach(srcEl => {
      const s = srcEl.getAttribute("src");
      if (s) {
        srcEl.setAttribute("src", autoReplaceDomain(s));
      }
    });
  }

  // 2) Corrige toutes les data-video des cartes
  cards.forEach(card => {
    if (card.dataset.video) {
      card.dataset.video = autoReplaceDomain(card.dataset.video);
    }
  });
});

// ---------------------
// Sécuriser playMovie()
// ---------------------
// Si tu as déjà une fonction playMovie définie ailleurs,
// on la "wrappe" pour injecter autoReplaceDomain
(function () {
  const oldPlayMovie = window.playMovie;
  window.playMovie = function (src) {
    src = autoReplaceDomain(src);
    if (typeof oldPlayMovie === "function") {
      return oldPlayMovie(src);
    }
    // fallback si playMovie n'existe pas encore
    const video = document.getElementById("video");
    if (video) {
      video.src = src;
      video.play().catch(err => console.warn("Erreur lecture vidéo :", err));
    }
  };
})();
