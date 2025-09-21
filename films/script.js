const replacements = {
  "cinetacos.xyz": "cinechicken.xyz",
  "chicken.xyz": "burger.xyz"
};

function autoReplaceDomain(url) {
  for (const oldDomain in replacements) {
    if (url.includes(oldDomain)) {
      return url.replace(oldDomain, replacements[oldDomain]);
    }
  }
  return url;
}

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  if (video && video.src) {
    video.src = autoReplaceDomain(video.src);
  }
});
