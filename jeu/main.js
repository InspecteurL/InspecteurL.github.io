// =======================
// 1️⃣ Supabase
// =======================
const supabaseClient = window.supabase.createClient(
  "https://wuagahavmbugmnuzsouf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho"
);

// ID unique joueur
const playerId = Math.random().toString(36).substr(2, 9);

// Points de vie
let playerHP = 100;

// Créer joueur dans Supabase
async function createPlayer() {
  await supabaseClient.from("players").insert({
    id: playerId,
    x: 0,
    y: 0,
    z: 0,
    hp: playerHP
  });
}
createPlayer();

// =======================
// 2️⃣ Babylon.js
// =======================
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Caméra
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

// Lumière
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Sol
BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

// =======================
// 3️⃣ Joueur local
// =======================
const player = { mesh: null, skeleton: null, hp: playerHP };

// Charger modèle anime
BABYLON.SceneLoader.ImportMesh(
  "",
  "https://inspecteurl.github.io/jeu/models/",
  "anime_character.glb",
  scene,
  function (meshes, particleSystems, skeletons) {
    const mesh = meshes[0];
    mesh.position = new BABYLON.Vector3(0, 0, 0);
    mesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5); // Ajuster taille
    const skel = skeletons[0];
    if (skel) scene.beginAnimation(skel, 0, 100, true, 1.0);
    player.mesh = mesh;
    player.skeleton = skel;
  }
);

// =======================
// 4️⃣ Autres joueurs
// =======================
const otherPlayers = {};

// 🔁 Envoyer position + HP
function updatePlayer() {
  if (!player.mesh) return;
  supabaseClient.from("players")
    .update({
      x: player.mesh.position.x,
      y: player.mesh.position.y,
      z: player.mesh.position.z,
      hp: player.hp
    })
    .eq("id", playerId);
}

// =======================
// 5️⃣ Contrôles + attaque
// =======================
window.addEventListener("keydown", (e) => {
  if (!player.mesh) return;
  let moved = false;

  if (e.key === "z") { player.mesh.position.z += 0.2; moved = true; }
  if (e.key === "s") { player.mesh.position.z -= 0.2; moved = true; }
  if (e.key === "q") { player.mesh.position.x -= 0.2; moved = true; }
  if (e.key === "d") { player.mesh.position.x += 0.2; moved = true; }

  if (e.key === " ") { attack(); }

  if (moved) updatePlayer();
});

// ⚔️ Attaque simple
function attack() {
  for (let id in otherPlayers) {
    const enemy = otherPlayers[id];
    if (!enemy.mesh) continue;
    const dist = BABYLON.Vector3.Distance(player.mesh.position, enemy.mesh.position);
    if (dist < 2) {
      enemy.hp -= 10;
      supabaseClient.from("players")
        .update({ hp: enemy.hp })
        .eq("id", id);
      if (player.skeleton) scene.beginAnimation(player.skeleton, 101, 150, false, 1.5);
    }
  }
}

// =======================
// 6️⃣ Écouter Supabase
// =======================
supabaseClient
  .channel("game")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "players"
  }, payload => {
    const data = payload.new;
    if (data.id === playerId) return;

    if (!otherPlayers[data.id]) {
      BABYLON.SceneLoader.ImportMesh(
        "",
        "models/",
        "anime_character.glb",
        scene,
        function (meshes, particleSystems, skeletons) {
          const mesh = meshes[0];
          mesh.position = new BABYLON.Vector3(data.x, data.y, data.z);
          mesh.scaling = new BABYLON.Vector3(0.5,0.5,0.5);
          const skel = skeletons[0];
          if (skel) scene.beginAnimation(skel, 0, 100, true, 1.0);
          otherPlayers[data.id] = { mesh: mesh, skeleton: skel, hp: data.hp || 100 };
        }
      );
    } else {
      const enemy = otherPlayers[data.id];
      enemy.mesh.position.x = data.x;
      enemy.mesh.position.y = data.y;
      enemy.mesh.position.z = data.z;
      enemy.hp = data.hp;
      if (enemy.hp <= 0) {
        scene.removeMesh(enemy.mesh);
        delete otherPlayers[data.id];
      }
    }
  })
  .subscribe();

// =======================
// 7️⃣ Boucle rendu
// =======================
engine.runRenderLoop(() => {
  scene.render();
});
