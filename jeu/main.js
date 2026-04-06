// =======================
// 1️⃣ Supabase
// =======================
const supabaseClient = window.supabase.createClient(
  "https://wuagahavmbugmnuzsouf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho"
);

const playerId = Math.random().toString(36).substr(2, 9);
let playerHP = 100;

async function createPlayer() {
  const { error } = await supabaseClient.from("players").insert({
    id: playerId,
    x: 0,
    y: 0,
    z: 0,
    hp: playerHP
  });

  if (error) console.error("Erreur Supabase:", error);
}
createPlayer();

// =======================
// 2️⃣ Babylon.js
// =======================
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Caméra (CORRIGÉ)
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, false); // ⚠️ important

// Lumière
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Sol
BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

// =======================
// 3️⃣ Joueur local
// =======================
const player = { mesh: null, skeleton: null, hp: playerHP };

// cube temporaire
const placeholder = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
placeholder.position.y = 0.5;
player.mesh = placeholder;

// charger modèle GLTF
BABYLON.SceneLoader.ImportMesh(
  "",
  "https://inspecteurl.github.io/jeu/models/",
  "character.gltf",
  scene,
  function (meshes, particleSystems, skeletons) {

    const root = new BABYLON.TransformNode("playerRoot", scene);

    meshes.forEach(m => {
      m.parent = root;
    });

    root.position = new BABYLON.Vector3(0, 0, 0);
    root.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);

    player.mesh = root;

    if (skeletons[0]) {
      player.skeleton = skeletons[0];
      scene.beginAnimation(player.skeleton, 0, 30, true, 1.0); // idle
    }

    console.log("✅ Modèle chargé !");
  },
  null,
  function (scene, message) {
    console.warn("❌ GLTF non chargé → cube utilisé", message);
  }
);

// =======================
// 4️⃣ Autres joueurs
// =======================
const otherPlayers = {};

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
// 5️⃣ Contrôles
// =======================
const step = 0.2;

window.addEventListener("keydown", (e) => {
  if (!player.mesh) return;

  let moved = false;

  if (e.key === "z") { player.mesh.position.z += step; moved = true; }
  if (e.key === "s") { player.mesh.position.z -= step; moved = true; }
  if (e.key === "q") { player.mesh.position.x -= step; moved = true; }
  if (e.key === "d") { player.mesh.position.x += step; moved = true; }

  if (e.key === " ") attack();

  if (moved) {
    updatePlayer();

    // marche
    if (player.skeleton) {
      scene.beginAnimation(player.skeleton, 31, 60, true, 1.0);
    }
  } else {
    // idle
    if (player.skeleton) {
      scene.beginAnimation(player.skeleton, 0, 30, true, 1.0);
    }
  }
});

// =======================
// 6️⃣ Attaque
// =======================
function attack() {
  for (let id in otherPlayers) {
    const enemy = otherPlayers[id];

    const dist = BABYLON.Vector3.Distance(
      player.mesh.position,
      enemy.mesh.position
    );

    if (dist < 2) {
      enemy.hp -= 10;

      supabaseClient.from("players")
        .update({ hp: enemy.hp })
        .eq("id", id);

      if (player.skeleton) {
        scene.beginAnimation(player.skeleton, 61, 100, false, 1.5);
      }
    }
  }
}

// =======================
// 7️⃣ Sync joueurs
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
      const mesh = BABYLON.MeshBuilder.CreateBox("enemy", { size: 1 }, scene);
      mesh.position = new BABYLON.Vector3(data.x, data.y, data.z);

      otherPlayers[data.id] = {
        mesh: mesh,
        hp: data.hp || 100
      };

    } else {
      const enemy = otherPlayers[data.id];

      enemy.mesh.position.set(data.x, data.y, data.z);
      enemy.hp = data.hp;

      if (enemy.hp <= 0) {
        scene.removeMesh(enemy.mesh);
        delete otherPlayers[data.id];
      }
    }
  })
  .subscribe();

// =======================
// 8️⃣ Render loop
// =======================
engine.runRenderLoop(() => {
  scene.render();
});
