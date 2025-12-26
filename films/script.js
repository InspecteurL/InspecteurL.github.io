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
  } catch (err) {
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

  if (video && video.querySelectorAll) {
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

  // =====================
  // 🔥 SYSTÈME LIKE / DISLIKE AUTOMATIQUE (FILMS)
  // =====================
  if (!location.pathname.includes("/films/")) return;

  // --- movieId auto depuis l'URL
  const movieId = location.pathname
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(".html", "");

  // --- Injection CSS (une seule fois)
  if (!document.getElementById("vote-css")) {
    const style = document.createElement("style");
    style.id = "vote-css";
    style.textContent = `
      .vote-container {
        display: flex;
        gap: 1rem;
        margin-top: 20px;
      }
      .vote-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: #f4f4f4;
        padding: 10px 18px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .vote-btn:hover {
        background: #e9e9e9;
        transform: translateY(-1px);
      }
      .vote-btn span {
        font-weight: bold;
        font-size: 16px;
      }
      .active-like {
        background-color: #d6ebff !important;
      }
      .active-dislike {
        background-color: #ffe2e2 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Injection HTML
  const voteWrapper = document.createElement("div");
  voteWrapper.innerHTML = `
    <div class="vote-container">
      <button id="likeBtn" class="vote-btn">👍 <span id="likeCount">0</span></button>
      <button id="dislikeBtn" class="vote-btn">👎 <span id="dislikeCount">0</span></button>
    </div>
  `;
  document.body.appendChild(voteWrapper);

  // --- Supabase
  import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) => {
    const supabase = createClient(
      "https://wuagahavmbugmnuzsouf.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho"
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

      if (!data) return;

      likeCount.textContent = data.filter(v => v.liked).length;
      dislikeCount.textContent = data.filter(v => !v.liked).length;

      const uv = data.find(v => v.user_id === userId);
      currentVote = uv ? (uv.liked ? "like" : "dislike") : null;

      likeBtn.classList.toggle("active-like", currentVote === "like");
      dislikeBtn.classList.toggle("active-dislike", currentVote === "dislike");
    }

    async function vote(liked) {
      if (!userId) return alert("Connecte-toi pour voter");

      await supabase.from("movie_likes")
        .delete()
        .eq("movie_id", movieId)
        .eq("user_id", userId);

      if (currentVote === (liked ? "like" : "dislike")) {
        currentVote = null;
      } else {
        await supabase.from("movie_likes").insert({
          movie_id: movieId,
          user_id: userId,
          liked
        });
        currentVote = liked ? "like" : "dislike";
      }

      loadVotes();
    }

    likeBtn.onclick = () => vote(true);
    dislikeBtn.onclick = () => vote(false);

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
