// ---------------------
// Remplacement automatique des domaines (corrigé)
// ---------------------
const HOST_MAP = {
  "cinetacos.xyz": "cinecake.xyz",
  "cinechicken.xyz": "cinecake.xyz", 
  "cinecake.xyz": "cinecake.xyz",// reste tel quel
  "chicken.xyz": "cinechicken.xyz",     // 🔑 avant → burger.xyz (problème)
// si tu as vraiment besoin de "burger.xyz", ajoute une règle séparée
  "cake.xyz": "cake.xyz"
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

// script.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://wuagahavmbugmnuzsouf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho";
const supabase = createClient(supabaseUrl, supabaseKey);

let userId = null;

// --- Init user ---
async function initUser() {
  const { data: { user } } = await supabase.auth.getUser();
  userId = user?.id || null;
}

// --- Fonction pour initialiser les votes pour un conteneur donné ---
async function initVotes(container) {
  const movieId = container.dataset.movieId;
  const likeBtn = container.querySelector(".like-btn");
  const dislikeBtn = container.querySelector(".dislike-btn");
  const likeCount = container.querySelector(".like-count");
  const dislikeCount = container.querySelector(".dislike-count");

  if (!likeBtn || !dislikeBtn) {
    console.warn("Boutons non trouvés pour ce container :", container);
    return;
  }

  let currentVote = null;

  // --- Charger les votes
  async function loadVotes() {
    const { data, error } = await supabase
      .from("movie_likes")
      .select("user_id, liked")
      .eq("movie_id", movieId);

    if (error) {
      console.error(error);
      return;
    }

    const likes = data.filter(v => v.liked).length;
    const dislikes = data.filter(v => !v.liked).length;
    likeCount.textContent = likes;
    dislikeCount.textContent = dislikes;

    const userVote = data.find(v => v.user_id === userId);
    currentVote = userVote ? (userVote.liked ? "like" : "dislike") : null;
    updateVoteVisual();
  }

  // --- Mise à jour visuelle
  function updateVoteVisual() {
    likeBtn.classList.toggle("active-like", currentVote === "like");
    dislikeBtn.classList.toggle("active-dislike", currentVote === "dislike");
  }

  // --- Action Like
  likeBtn.addEventListener("click", async () => {
    if (!userId) return alert("Connecte-toi pour voter !");

    if (currentVote === "like") {
      await supabase.from("movie_likes").delete().eq("movie_id", movieId).eq("user_id", userId);
      currentVote = null;
    } else {
      await supabase.from("movie_likes").delete().eq("movie_id", movieId).eq("user_id", userId);
      await supabase.from("movie_likes").insert({ movie_id: movieId, user_id: userId, liked: true });
      currentVote = "like";
    }

    updateVoteVisual();
    loadVotes();
  });

  // --- Action Dislike
  dislikeBtn.addEventListener("click", async () => {
    if (!userId) return alert("Connecte-toi pour voter !");

    if (currentVote === "dislike") {
      await supabase.from("movie_likes").delete().eq("movie_id", movieId).eq("user_id", userId);
      currentVote = null;
    } else {
      await supabase.from("movie_likes").delete().eq("movie_id", movieId).eq("user_id", userId);
      await supabase.from("movie_likes").insert({ movie_id: movieId, user_id: userId, liked: false });
      currentVote = "dislike";
    }

    updateVoteVisual();
    loadVotes();
  });

  // --- Realtime updates
  supabase
    .channel("public:movie_likes")
    .on("postgres_changes", { event: "*", schema: "public", table: "movie_likes" }, payload => {
      if (payload.new?.movie_id === movieId || payload.old?.movie_id === movieId) {
        loadVotes();
      }
    })
    .subscribe();

  // Charger les votes dès l'initialisation
  loadVotes();
}

// --- Initialisation sur toutes les pages / conteneurs ---
document.addEventListener("DOMContentLoaded", async () => {
  await initUser();
  document.querySelectorAll(".vote-container").forEach(container => {
    initVotes(container);
  });
});

