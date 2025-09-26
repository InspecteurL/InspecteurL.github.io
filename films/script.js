// ---------------------
// Remplacement automatique des domaines
// ---------------------
function autoReplaceDomain(url) {
  if (!url || typeof url !== "string") return url;

  // toujours forcer vers cinechicken et burger
  url = url.replace(/cinetacos\.xyz/g, "cinechicken.xyz");
  url = url.replace(/cinechicken\.xyz/g, "cinechicken.xyz"); // 🔒 sécurise si déjà bon
  url = url.replace(/chicken\.xyz/g, "burger.xyz");
  url = url.replace(/burger\.xyz/g, "burger.xyz"); // 🔒 idem

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

  // Corrige toutes les data-video
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
    src = autoReplaceDomain(src); // ✅ correction systématique
    if (typeof oldPlayMovie === "function") {
      return oldPlayMovie(src);
    }
    const video = document.getElementById("video");
    if (video) {
      video.src = src;
      video.load(); // 🔑 recharge bien la nouvelle source
      video.play().catch(err => console.warn("Erreur lecture vidéo :", err));
    }
  };
})();
