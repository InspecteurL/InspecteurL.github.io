// =======================
// 1️⃣ Supabase
// =======================
const supabaseClient = window.supabase.createClient(
  "https://wuagahavmbugmnuzsouf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho"
);

const playerId = Math.random().toString(36).substr(2, 9);
let playerHP = 100;

// Créer joueur dans Supabase
async function createPlayer() {
  const { data, error } = await supabaseClient.from("players").insert({
    id: playerId,
    x: 0,
    y: 0,
    z: 0,
    hp: playerHP
  });
  if (error) console.error("Erreur Supabase insert:", error);
  else console.log("Player créé:", data);
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
// 3️⃣ Joueur local (cube placeholder si pas de GLB)
// =======================
const player = { mesh: null, skeleton: null, hp: playerHP };

// Placeholder cube
const placeholder = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
placeholder.position.y = 0.5;
player.mesh = placeholder;

// Charger GLB si dispo
BABYLON.SceneLoader.ImportMesh(
  "",
  "https://inspecteurl.github.io/jeu/models/", // ton dossier models
  "character.gltf", // remplace par ton GLB
  scene,
  function(meshes, particleSystems, skeletons) {
    // Créer un root pour déplacer tout le personnage
    const root = new BABYLON.TransformNode("playerRoot", scene);
    meshes.forEach(m => m.parent = root);
    root.position = new BABYLON.Vector3(0, 0, 0);
    root.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
    player.mesh = root;

    // Animation idle
    if (skeletons[0]) {
      player.skeleton = skeletons[0];
      scene.beginAnimation(player.skeleton, 0, 30, true, 1.0); // idle frames
    }
  },
  null,
  function(scene, message, exception){
    console.warn("GLB non chargé, cube utilisé à la place.", message);
  }
);

// =======================
// 4️⃣ Autres joueurs
// =======================
const otherPlayers = {};

// Envoyer position + HP
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
// 5️⃣ Contrôles + animation marche
// =======================
const step = 0.2;
let moving = false;

window.addEventListener("keydown", (e) => {
  if (!player.mesh) return;
  moving = false;

  if (e.key === "z") { player.mesh.position.z += step; moving = true; }
  if (e.key === "s") { player.mesh.position.z -= step; moving = true; }
  if (e.key === "q") { player.mesh.position.x -= step; moving = true; }
  if (e.key === "d") { player.mesh.position.x += step; moving = true; }

  if (moving) {
    updatePlayer();
    // lancer animation marche
    if (player.skeleton) scene.beginAnimation(player.skeleton, 31, 60, true, 1.0); // marche frames
  } else {
    // idle
    if (player.skeleton) scene.beginAnimation(player.skeleton, 0, 30, true, 1.0);
  }
});

// =======================
// 6️⃣ Attaque simple
// =======================
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
      if (player.skeleton) scene.beginAnimation(player.skeleton, 101, 150, false, 1.5); // attaque frames
    }
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === " ") attack();
});

// =======================
// 7️⃣ Écouter Supabase
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
      // placeholder cube pour les autres
      const mesh = BABYLON.MeshBuilder.CreateBox("enemy", { size: 1 }, scene);
      mesh.position = new BABYLON.Vector3(data.x, data.y, data.z);
      otherPlayers[data.id] = { mesh: mesh, hp: data.hp || 100 };
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
// 8️⃣ Boucle rendu
// =======================
engine.runRenderLoop(() => {
  scene.render();
});
