const SUPABASE_URL = "https://wuagahavmbugmnuzsouf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRoom = null;
let currentPlayer = null;
let channel = null;

// CREATE ROOM
async function createRoom() {
  const name = document.getElementById("nameInput").value;
  if (!name) return alert("Entre un pseudo");

  const code = Math.random().toString(36).substring(2, 6).toUpperCase();

  const { data: room, error } = await client
    .from("rooms")
    .insert({ code })
    .select()
    .single();

  if (error) return console.error(error);

  const { data: player } = await client
    .from("players")
    .insert({
      name,
      room_id: room.id,
      is_host: true
    })
    .select()
    .single();

  currentRoom = room;
  currentPlayer = player;

  enterLobby();
}

// JOIN ROOM
async function joinRoom() {
  const name = document.getElementById("nameInput").value;
  const code = document.getElementById("roomCodeInput").value;

  if (!name || !code) return alert("Remplis tout");

  const { data: room } = await client
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (!room) return alert("Room introuvable");

  const { data: player } = await client
    .from("players")
    .insert({
      name,
      room_id: room.id
    })
    .select()
    .single();

  currentRoom = room;
  currentPlayer = player;

  enterLobby();
}

// LOBBY
function enterLobby() {
  document.getElementById("home").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");

  document.getElementById("roomCode").innerText = currentRoom.code;

  listenPlayers();
}

// REALTIME
function listenPlayers() {
  if (channel) {
    client.removeChannel(channel);
  }

  channel = client
    .channel("players-" + currentRoom.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `room_id=eq.${currentRoom.id}`
      },
      () => fetchPlayers()
    )
    .subscribe();

  fetchPlayers();
}

// FETCH PLAYERS
async function fetchPlayers() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id)
    .order("created_at");

  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText = p.name + (p.is_host ? " 👑" : "");
    list.appendChild(li);
  });
}

// START GAME
async function startGame() {
  const mode = document.getElementById("modeSelect").value;

  await client
    .from("rooms")
    .update({ status: "playing", mode })
    .eq("id", currentRoom.id);

  await assignRoles();
  enterGame();
}

// ROLES
async function assignRoles() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const words = getRandomWords();

  for (let i = 0; i < shuffled.length; i++) {
    let role = "civilian";
    let word = words.word1;

    if (i === 0) {
      role = "undercover";
      word = words.word2;
    }

    await client
      .from("players")
      .update({
        role,
        word,
        turn_order: i
      })
      .eq("id", shuffled[i].id);
  }
}

// GAME
async function enterGame() {
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  const { data: player } = await client
    .from("players")
    .select("*")
    .eq("id", currentPlayer.id)
    .single();

  document.getElementById("yourWord").innerText =
    "Ton mot: " + (player.word || "???");
}

// TURN
async function sendTurn() {
  const message = document.getElementById("messageInput").value;

  await client.from("turns").insert({
    room_id: currentRoom.id,
    player_id: currentPlayer.id,
    message
  });

  document.getElementById("messageInput").value = "";
}

// WORDS
function getRandomWords() {
  const pairs = [
    { word1: "chien", word2: "loup" },
    { word1: "pizza", word2: "burger" },
    { word1: "soleil", word2: "lune" },
    { word1: "voiture", word2: "moto" }
  ];

  return pairs[Math.floor(Math.random() * pairs.length)];
}
