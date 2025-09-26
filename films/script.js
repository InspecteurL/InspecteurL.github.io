// DEBUG = true pour voir tout dans la console
const DEBUG = true;

const HOST_MAP = {
  "cinetacos.xyz": "cinechicken.xyz",
  "chicken.xyz": "burger.xyz"
};

function dbg(...args) { if (DEBUG) console.log("[autoDomain] ", ...args); }

/**
 * Replace hostnames in a URL using the HOST_MAP.
 * Uses the URL constructor for safety and supports relative URLs.
 */
function autoReplaceDomain(raw) {
  if (!raw || typeof raw !== "string") return raw;
  try {
    // Résout les URLs relatives par rapport à la page
    const u = new URL(raw, location.href);
    const host = u.hostname.toLowerCase();
    if (HOST_MAP[host]) {
      const old = u.href;
      u.hostname = HOST_MAP[host];
      dbg("replace host", host, "→", HOST_MAP[host], ":", old, "→", u.href);
      return u.href;
    }
    return raw;
  } catch (err) {
    // fallback si URL() échoue (chaîne bizarre)
    dbg("autoReplaceDomain: URL() failed for", raw);
    for (const from in HOST_MAP) {
      const re = new RegExp(from.replace(/\./g, "\\."), "ig");
      if (re.test(raw)) {
        const replaced = raw.replace(re, HOST_MAP[from]);
        dbg("fallback replace", raw, "→", replaced);
        return replaced;
      }
    }
    return raw;
  }
}

function patchElementSources(root = document) {
  // <video src=...>
  const videos = root.querySelectorAll ? root.querySelectorAll("video") : [];
  videos.forEach(video => {
    try {
      if (video.src) {
        const newSrc = autoReplaceDomain(video.src);
        if (newSrc !== video.src) {
          dbg("video.src patched:", video.src, "→", newSrc);
          video.src = newSrc;
        }
      }
      // <source> children
      video.querySelectorAll && video.querySelectorAll("source").forEach(srcEl => {
        const s = srcEl.getAttribute("src");
        if (s) {
          const newS = autoReplaceDomain(s);
          if (newS !== s) {
            dbg("<source> patched:", s, "→", newS);
            srcEl.setAttribute("src", newS);
          }
        }
      });
    } catch (e) {
      console.warn("patchElementSources error", e);
    }
  });

  // data-video / data-src attributes
  root.querySelectorAll && root.querySelectorAll("[data-video],[data-src]").forEach(el => {
    if (el.dataset) {
      if (el.dataset.video) {
        const n = autoReplaceDomain(el.dataset.video);
        if (n !== el.dataset.video) {
          dbg("data-video patched:", el.dataset.video, "→", n);
          el.dataset.video = n;
        }
      }
      if (el.dataset.src) {
        const n = autoReplaceDomain(el.dataset.src);
        if (n !== el.dataset.src) {
          dbg("data-src patched:", el.dataset.src, "→", n);
          el.dataset.src = n;
        }
      }
    }
  });

  // <a href>
  root.querySelectorAll && root.querySelectorAll("a[href]").forEach(a => {
    try {
      const old = a.getAttribute("href");
      if (old) {
        const n = autoReplaceDomain(old);
        if (n !== old) {
          dbg("<a> href patched:", old, "→", n);
          a.setAttribute("href", n);
        }
      }
    } catch (e) {
      // ignore
    }
  });
}

// Add error logging to the main video (helps comprendre pourquoi ça plante)
function attachVideoErrorLogging() {
  const video = document.getElementById("video");
  if (!video) return;
  if (video._autoDomainErrorAttached) return;
  video._autoDomainErrorAttached = true;

  video.addEventListener("error", (ev) => {
    const code = video.error && video.error.code;
    dbg("VIDEO ERROR event:", { code, message: video.error && video.error.message, currentSrc: video.currentSrc });
  });

  video.addEventListener("stalled", () => dbg("video stalled - check network / CORS"));
}

// Intercepter window.playMovie proprement (capture et conserve la fonction réelle si la page la redéfinit)
(function installPlayMovieInterceptor() {
  let savedFn = window.playMovie;
  try {
    Object.defineProperty(window, "playMovie", {
      configurable: true,
      enumerable: true,
      get() {
        // retourne une fonction wrapper qui utilise la dernière savedFn
        return function(...args) {
          if (args[0]) args[0] = autoReplaceDomain(args[0]);
          if (typeof savedFn === "function") {
            try { return savedFn.apply(this, args); }
            catch (e) { dbg("old playMovie threw, falling back:", e); }
          }
          // fallback direct player control
          const video = document.getElementById("video");
          if (video) {
            video.src = args[0] || video.src;
            try { video.load(); } catch(e){ dbg("video.load() failed", e); }
            return video.play && video.play().catch(err => dbg("video.play() failed:", err));
          }
          dbg("playMovie wrapper called but no video element and no old function.");
        };
      },
      set(fn) {
        // quand la page fait `window.playMovie = fn`, on capture la fonction réelle
        savedFn = fn;
        dbg("playMovie setter: captured new implementation", !!fn);
      }
    });
    dbg("playMovie interceptor installed");
  } catch (e) {
    // fallback si defineProperty impossible
    dbg("defineProperty failed for playMovie:", e);
    window.playMovie = function(...args) {
      if (args[0]) args[0] = autoReplaceDomain(args[0]);
      if (typeof savedFn === "function") return savedFn.apply(this, args);
      const video = document.getElementById("video");
      if (video) {
        video.src = args[0] || video.src;
        try { video.load(); } catch(e){ dbg("video.load() failed", e); }
        return video.play && video.play().catch(err => dbg("video.play() failed:", err));
      }
    };
  }
})();

// DOMContentLoaded initial patch
document.addEventListener("DOMContentLoaded", () => {
  try {
    patchElementSources(document);
    attachVideoErrorLogging();
  } catch (e) { dbg("DOMContentLoaded handler error", e); }
});

// Observer pour éléments ajoutés dynamiquement
const mo = new MutationObserver(muts => {
  muts.forEach(m => {
    if (m.addedNodes && m.addedNodes.length) {
      m.addedNodes.forEach(node => {
        // si le noeud est un element, patcher les sources dedans
        if (node.nodeType === 1) patchElementSources(node);
      });
    }
  });
});
mo.observe(document.documentElement || document, { childList: true, subtree: true });

// patch immédiat au cas où le script est injecté tard
try { patchElementSources(document); attachVideoErrorLogging(); } catch(e){ dbg("initial patch failed", e); }
