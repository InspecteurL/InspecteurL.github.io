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

// Caméra
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, false);

// Lumière
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Sol
BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

// =======================
// 3️⃣ Joueur local + animations
// =======================
const player = { mesh: null, hp: playerHP };
let animations = {};
let currentAnim = "";

// cube temporaire
const placeholder = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
placeholder.position.y = 0.5;
player.mesh = placeholder;

// 🎬 fonction animation
function playAnimation(name, loop = true) {
  if (currentAnim === name) return;

  for (let key in animations) {
    animations[key].stop();
  }

  if (animations[name]) {
    animations[name].start(loop);
    currentAnim = name;
  }
}

// charger modèle
BABYLON.SceneLoader.ImportMesh(
  "",
  "https://inspecteurl.github.io/jeu/models/",
  "character.gltf",
  scene,
  function (meshes, ps, sk, animationGroups) {

    const root = new BABYLON.TransformNode("playerRoot", scene);
    meshes.forEach(m => m.parent = root);

    root.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
    root.position = new BABYLON.Vector3(0, 0, 0);

    player.mesh = root;

    // récupérer animations
    animationGroups.forEach(anim => {
      animations[anim.name.toLowerCase()] = anim;
      console.log("Anim:", anim.name);
    });

    playAnimation("idle"); // animation par défaut

    console.log("✅ Modèle + animations chargés !");
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
// 5️⃣ Input fluide
// =======================
const keys = {};
const speed = 0.1;

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === " ") attack();
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// =======================
// 6️⃣ Attaque
// =======================
function attack() {
  playAnimation("attack", false);

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

  if (player.mesh) {

    let moving = false;

    if (keys["z"]) { player.mesh.position.z += speed; moving = true; }
    if (keys["s"]) { player.mesh.position.z -= speed; moving = true; }
    if (keys["q"]) { player.mesh.position.x -= speed; moving = true; }
    if (keys["d"]) { player.mesh.position.x += speed; moving = true; }

    // 🎬 animations
    if (moving) {
      playAnimation("walk"); // ⚠️ adapte si besoin (walking/run)
    } else {
      playAnimation("idle");
    }

    if (moving) updatePlayer();

    // 🎥 caméra follow
    camera.position.x = player.mesh.position.x;
    camera.position.z = player.mesh.position.z - 10;
    camera.position.y = player.mesh.position.y + 5;

    camera.setTarget(player.mesh.position);
  }

  scene.render();
});
