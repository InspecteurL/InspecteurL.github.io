window.onerror = console.error;

const SUPABASE_URL = "https://wuagahavmbugmnuzsouf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1YWdhaGF2bWJ1Z21udXpzb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDM2NTksImV4cCI6MjA2ODE3OTY1OX0.mjf9cUleV_oq8TsWeKvPVOJSGPc98AyGyfJeA-Tpvho";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRoom = null;
let currentPlayer = null;
let channel = null;

// ---------------- CREATE ROOM ----------------
async function createRoom() {
  const name = document.getElementById("nameInput").value;
  if (!name) return alert("Entre un pseudo");

  const code = Math.random().toString(36).substring(2, 6).toUpperCase();

  const { data: room, error: roomError } = await client
    .from("rooms")
    .insert({ code })
    .select()
    .single();

  if (roomError) return alert("Erreur room");

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

// ---------------- JOIN ROOM ----------------
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

  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", room.id);

  if (players.length >= 8) return alert("Salle pleine");

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

// ---------------- LOBBY ----------------
function enterLobby() {
  document.getElementById("home").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");

  document.getElementById("roomCode").innerText = currentRoom.code;

  // 🔥 seul le host voit le bouton
  if (!currentPlayer.is_host) {
    document.getElementById("startBtn").style.display = "none";
  }

  listenPlayers();
  listenRoom();
}

// ---------------- PLAYERS REALTIME ----------------
function listenPlayers() {
  if (channel) client.removeChannel(channel);

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
      fetchPlayers
    )
    .subscribe();

  fetchPlayers();
}

// ---------------- FETCH PLAYERS ----------------
async function fetchPlayers() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id)
    .order("turn_order", { ascending: true });

  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText =
      p.name +
      (p.is_host ? " 👑" : "") +
      (p.turn_order === 0 ? " 🎯" : "");
    list.appendChild(li);
  });
}

// ---------------- START GAME ----------------
async function startGame() {
  if (!currentPlayer.is_host) {
    alert("Seul l'hôte peut lancer");
    return;
  }

  const mode = document.getElementById("modeSelect").value;

  await assignRoles();

  await client
    .from("rooms")
    .update({
      status: "playing",
      mode,
      current_turn: 0
    })
    .eq("id", currentRoom.id);
}

// ---------------- ROLES ----------------
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

// ---------------- GAME ----------------
async function enterGame() {
  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  const { data: player } = await client
    .from("players")
    .select("*")
    .eq("id", currentPlayer.id)
    .single();

  currentPlayer = player;

  document.getElementById("yourWord").innerText =
    "Ton mot: " + (player.word || "???");

  updateTurnUI();
}

// ---------------- CHECK TURN ----------------
async function isMyTurn() {
  const { data: room } = await client
    .from("rooms")
    .select("current_turn")
    .eq("id", currentRoom.id)
    .single();

  return currentPlayer.turn_order === room.current_turn;
}

// ---------------- SEND TURN ----------------
async function sendTurn() {
  const message = document.getElementById("messageInput").value;
  if (!message) return;

  const myTurn = await isMyTurn();

  if (!myTurn) {
    alert("Ce n'est pas ton tour !");
    return;
  }

  await client.from("turns").insert({
    room_id: currentRoom.id,
    player_id: currentPlayer.id,
    message
  });

  await nextTurn();

  document.getElementById("messageInput").value = "";
}

// ---------------- NEXT TURN ----------------
async function nextTurn() {
  const { data: players } = await client
    .from("players")
    .select("turn_order")
    .eq("room_id", currentRoom.id);

  const { data: room } = await client
    .from("rooms")
    .select("current_turn")
    .eq("id", currentRoom.id)
    .single();

  let next = room.current_turn + 1;

  if (next >= players.length) next = 0;

  await client
    .from("rooms")
    .update({ current_turn: next })
    .eq("id", currentRoom.id);
}

// ---------------- TURN UI ----------------
async function updateTurnUI() {
  const { data: room } = await client
    .from("rooms")
    .select("current_turn")
    .eq("id", currentRoom.id)
    .single();

  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const current = players.find(
    p => p.turn_order === room.current_turn
  );

  const isMyTurnNow = currentPlayer.turn_order === room.current_turn;

  document.getElementById("turnInfo").innerText =
    isMyTurnNow
      ? "🔥 À toi de jouer !"
      : "Tour de : " + current.name;

  document.getElementById("messageInput").disabled = !isMyTurnNow;
}

// ---------------- WORDS ----------------
function getRandomWords() {
  const themes = {
    animaux: [
      ["chien", "loup"],
      ["chat", "tigre"],
      ["lion", "panthère"]
    ],
    objets: [
      ["chaise", "tabouret"],
      ["stylo", "crayon"],
      ["lampe", "ampoule"]
    ],
    nourriture: [
      ["pizza", "burger"],
      ["pomme", "poire"],
      ["riz", "pâtes"]
    ]
  };

  const themeKeys = Object.keys(themes);
  const randomTheme =
    themeKeys[Math.floor(Math.random() * themeKeys.length)];

  const pairList = themes[randomTheme];
  const pair =
    pairList[Math.floor(Math.random() * pairList.length)];

  return {
    theme: randomTheme,
    word1: pair[0],
    word2: pair[1]
  };
}

// ---------------- ROOM REALTIME ----------------
function listenRoom() {
  client
    .channel("room-" + currentRoom.id)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${currentRoom.id}`
      },
      payload => {
        if (payload.new.status === "playing") {
          enterGame();
        }

        updateTurnUI();
      }
    )
    .subscribe();
}
