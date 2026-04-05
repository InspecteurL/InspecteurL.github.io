// Créer le client Supabase
const supabaseClient = window.supabase.createClient(
  "https://wuagahavmbugmnuzsouf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho"
);

// ID unique joueur
const playerId = Math.random().toString(36).substr(2, 9);

// Points de vie initiaux
let playerHP = 100;

// Créer joueur en DB
async function createPlayer() {
  await supabaseClient.from("players").insert({
    id: playerId,
    x: 0,
    y: 1,
    z: 0,
    hp: playerHP
  });
}

createPlayer();

// BABYLON
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

// Joueur local
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 1;

// Autres joueurs
const otherPlayers = {};

// 🔁 Envoyer position et HP
function updatePlayer() {
  supabaseClient.from("players")
    .update({
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      hp: playerHP
    })
    .eq("id", playerId);
}

// 🎮 Contrôles + attaque
window.addEventListener("keydown", (e) => {
  let moved = false;

  if (e.key === "z") { player.position.z += 0.2; moved = true; }
  if (e.key === "s") { player.position.z -= 0.2; moved = true; }
  if (e.key === "q") { player.position.x -= 0.2; moved = true; }
  if (e.key === "d") { player.position.x += 0.2; moved = true; }

  // Attaque
  if (e.key === " ") { attack(); }

  if (moved) updatePlayer();
});

// ⚔️ Fonction attaque simple
function attack() {
  for (let id in otherPlayers) {
    const enemy = otherPlayers[id];
    const dist = BABYLON.Vector3.Distance(player.position, enemy.mesh.position);

    if (dist < 2) { // si proche
      enemy.hp -= 10;
      console.log(`Tu as frappé ${id}, HP restant: ${enemy.hp}`);
      // met à jour la DB
      supabaseClient.from("players")
        .update({ hp: enemy.hp })
        .eq("id", id);
    }
  }
}

// 📡 Écouter autres joueurs
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
      const mesh = BABYLON.MeshBuilder.CreateBox("enemy", { size: 1 }, scene);
      mesh.position.y = 1;
      otherPlayers[data.id] = { mesh: mesh, hp: data.hp || 100 };
    }

    // Mise à jour position et HP
    otherPlayers[data.id].mesh.position.x = data.x;
    otherPlayers[data.id].mesh.position.y = data.y;
    otherPlayers[data.id].mesh.position.z = data.z;
    otherPlayers[data.id].hp = data.hp;

    // Si HP <= 0, enlever le joueur
    if (otherPlayers[data.id].hp <= 0) {
      scene.removeMesh(otherPlayers[data.id].mesh);
      delete otherPlayers[data.id];
    }
  })
  .subscribe();

// Boucle de rendu
engine.runRenderLoop(() => {
  scene.render();
});
