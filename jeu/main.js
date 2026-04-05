const supabase = window.supabase.createClient(
  "YOUR_URL",
  "YOUR_KEY"
);

// ID unique joueur
const playerId = Math.random().toString(36).substr(2, 9);


// Créer joueur en DB
async function createPlayer() {
  await supabase.from("players").insert({
    id: playerId,
    x: 0,
    y: 1,
    z: 0
  });
}

createPlayer();

// BABYLON
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const scene = new BABYLON.Scene(engine);

// caméra
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);

// lumière
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// sol
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);

// joueur local
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 1;

// autres joueurs
const otherPlayers = {};

// 🔁 envoyer position
function updatePosition() {
  supabase.from("players")
    .update({
      x: player.position.x,
      y: player.position.y,
      z: player.position.z
    })
    .eq("id", playerId);
}

// 🎮 contrôles
window.addEventListener("keydown", (e) => {
  if (e.key === "z") player.position.z += 0.2;
  if (e.key === "s") player.position.z -= 0.2;
  if (e.key === "q") player.position.x -= 0.2;
  if (e.key === "d") player.position.x += 0.2;

  updatePosition();
});

// 📡 écouter autres joueurs
supabase
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
      otherPlayers[data.id] = mesh;
    }

    otherPlayers[data.id].position.x = data.x;
    otherPlayers[data.id].position.y = data.y;
    otherPlayers[data.id].position.z = data.z;
  })
  .subscribe();

// boucle rendu
engine.runRenderLoop(() => {
  scene.render();
});
