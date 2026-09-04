/**
 * Script pour insérer automatiquement la durée de chaque film/série
 * directement dans les cartes de catalogue.html.
 *
 * UTILISATION :
 * 1. Place ce fichier ET durees_finales.json dans le même dossier que catalogue.html
 *    (à la racine de ton dépôt, là où se trouve catalogue.html)
 * 2. Lance : node injecter_durees.js
 * 3. Le script modifie catalogue.html directement (une sauvegarde catalogue.backup.html
 *    est créée avant, au cas où).
 * 4. Vérifie le résultat dans ton navigateur, puis push sur GitHub.
 *
 * Ce que ça fait concrètement :
 * Pour chaque carte du type :
 *   <div class="movieimg" data-type="Film" data-title="Interstellar" data-genre="Science-Fiction">
 *     <a href="https://inspecteurl.github.io/films/interstellar.html">
 *       <img src="..." alt="Interstellar">
 *     </a>
 *     <h2>Interstellar</h2>
 *     <span>Film - Science-Fiction</span>
 *   </div>
 *
 * ...ça ajoute une ligne juste après le <span> existant :
 *     <span class="duree">2h49</span>
 *   </div>
 *
 * Une classe CSS ".duree" est aussi ajoutée automatiquement dans le <style>
 * du fichier (texte discret, assorti au design existant) si elle n'y est pas déjà.
 */

const fs = require("fs");
const path = require("path");

const CATALOGUE_PATH = path.join(__dirname, "catalogue.html");
const DUREES_PATH = path.join(__dirname, "durees_finales.json");

if (!fs.existsSync(CATALOGUE_PATH)) {
  console.error("❌ catalogue.html introuvable dans ce dossier. Place ce script à côté de catalogue.html.");
  process.exit(1);
}
if (!fs.existsSync(DUREES_PATH)) {
  console.error("❌ durees_finales.json introuvable dans ce dossier.");
  process.exit(1);
}

const durees = JSON.parse(fs.readFileSync(DUREES_PATH, "utf-8"));
let html = fs.readFileSync(CATALOGUE_PATH, "utf-8");

// Sauvegarde de sécurité avant modification
fs.writeFileSync(path.join(__dirname, "catalogue.backup.html"), html, "utf-8");

// Ajoute le style de la durée s'il n'existe pas déjà
if (!html.includes(".movieimg .duree")) {
  html = html.replace(
    "</style>",
    `
.movieimg .duree {
  display: inline-block;
  margin-top: -0.4rem;
  margin-bottom: 0.6rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  opacity: 0.85;
}
</style>`
  );
}

// Regex qui capture chaque carte : lien (avec le nom de fichier), titre, span existant
const cardRegex =
  /(<div class="movieimg"[^>]*>\s*<a href="https:\/\/inspecteurl\.github\.io\/[^\/"]+\/([^"]+?)\.html">[\s\S]*?<\/a>\s*<h2>[\s\S]*?<\/h2>\s*<span>[\s\S]*?<\/span>)(\s*<\/div>)/g;

let count = 0;
let missing = [];

html = html.replace(cardRegex, (match, before, filename, closing) => {
  // Si une durée a déjà été insérée précédemment, ne pas dupliquer
  if (before.includes('class="duree"')) return match;

  const duree = durees[filename];
  if (!duree) {
    missing.push(filename);
    return match; // on laisse la carte telle quelle si pas de durée connue
  }

  count++;
  return `${before}\n      <span class="duree">${duree}</span>${closing}`;
});

fs.writeFileSync(CATALOGUE_PATH, html, "utf-8");

console.log(`✅ ${count} cartes mises à jour avec leur durée.`);
if (missing.length) {
  console.log(`⚠️  ${missing.length} fiche(s) sans durée trouvée dans durees_finales.json :`);
  console.log(missing.join(", "));
}
console.log("\nUne sauvegarde de l'ancien fichier a été créée : catalogue.backup.html");
