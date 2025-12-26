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
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(".html", "");

  // ---------- CSS ----------
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
.vote-btn svg {
  transition: fill 0.2s ease;
}
.vote-btn span {
  font-weight: bold;
  color: #333;
  font-size: 16px;
}
.active-like {
  background-color: #d6ebff !important;
  box-shadow: 0 0 8px rgba(0, 128, 255, 0.4);
}
.active-like svg {
  fill: #007bff;
}
.active-dislike {
  background-color: #ffe2e2 !important;
  box-shadow: 0 0 8px rgba(255, 80, 80, 0.4);
}
.active-dislike svg {
  fill: #ff3333;
}`;
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

  if (btnWatch) {
    btnWatch.insertAdjacentElement("afterend", voteWrapper);
  } else if (ficheInfo) {
    ficheInfo.appendChild(voteWrapper);
  } else {
    document.body.appendChild(voteWrapper);
  }

  // ---------- Supabase ----------
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
      // Récupérer tous les votes pour le film
      const { data } = await supabase
        .from("movie_likes")
        .select("user_id, liked")
        .eq("movie_id", movieId);

      if (!data) return;

      likeCount.textContent = data.filter(v => v.liked).length;
      dislikeCount.textContent = data.filter(v => !v.liked).length;

      // Etat du vote de l'utilisateur
      const uv = userId ? data.find(v => v.user_id === userId) : null;
      currentVote = uv ? (uv.liked ? "like" : "dislike") : null;

      likeBtn.classList.toggle("active-like", currentVote === "like");
      dislikeBtn.classList.toggle("active-dislike", currentVote === "dislike");
    }

    async function vote(liked) {
      if (!userId) return alert("Connecte-toi pour voter !");
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
    if (typeof oldPlayMovie === "function") return oldPlayMovie(src);
    const video = document.getElementById("video");
    if (video) {
      video.src = src;
      video.load();
      video.play().catch(() => {});
    }
  };
})();
