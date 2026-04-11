
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

  const { data: room } = await client
    .from("rooms")
    .insert({ code })
    .select()
    .single();

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

  if (!currentPlayer.is_host) {
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("modeSelect").disabled = true;
  }

  listenPlayers();
  listenRoom();
}

// ---------------- PLAYERS ----------------
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

async function fetchPlayers() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(p => {
    const li = document.createElement("li");
    li.innerText = p.name + (p.is_host ? " 👑" : "");
    list.appendChild(li);
  });
}

// ---------------- START GAME ----------------
async function startGame() {
  if (!currentPlayer.is_host) return alert("Seul le host");

  const mode = document.getElementById("modeSelect").value;

  await assignRoles();

  await client
    .from("rooms")
    .update({
      status: "playing",
      mode,
      phase: "playing",
      round: 1,
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
        turn_order: i,
        votes: 0
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
    "Ton mot: " + player.word;

  listenTurns();
  updateTurnUI();
}

// ---------------- TURN CHECK ----------------
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
  if (!myTurn) return alert("Pas ton tour");

  const { data: room } = await client
    .from("rooms")
    .select("*")
    .eq("id", currentRoom.id)
    .single();

  await client.from("turns").insert({
    room_id: currentRoom.id,
    player_id: currentPlayer.id,
    message,
    round: room.round
  });

  document.getElementById("messageInput").value = "";

  await nextTurnLogic(room);
}

// ---------------- NEXT TURN ----------------
async function nextTurnLogic(room) {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  let next = room.current_turn + 1;

  if (next >= players.length) {
    next = 0;

    if (room.round === 1) {
      await client
        .from("rooms")
        .update({ round: 2, current_turn: 0 })
        .eq("id", currentRoom.id);
      return;
    }

    if (room.round === 2) {
      await client
        .from("rooms")
        .update({ phase: "voting" })
        .eq("id", currentRoom.id);
      return;
    }
  }

  await client
    .from("rooms")
    .update({ current_turn: next })
    .eq("id", currentRoom.id);
}

// ---------------- TURN DISPLAY FIX ----------------
async function fetchTurns() {
  const { data: turns } = await client
    .from("turns")
    .select("*")
    .eq("room_id", currentRoom.id)
    .order("created_at", { ascending: true });

  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const list = document.getElementById("playersList");
  list.innerHTML = "";

  players.forEach(player => {
    const playerTurns = turns.filter(t => t.player_id === player.id);

    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${player.name}${player.is_host ? " 👑" : ""}</strong><br/>
      ${playerTurns.map(t => "🗣️ " + t.message).join("<br/>")}
    `;

    list.appendChild(li);
  });
}

// ---------------- TURN UI ----------------
async function updateTurnUI() {
  const { data: room } = await client
    .from("rooms")
    .select("*")
    .eq("id", currentRoom.id)
    .single();

  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const current = players.find(p => p.turn_order === room.current_turn);

  const isMyTurnNow = currentPlayer.turn_order === room.current_turn;

  document.getElementById("turnInfo").innerText =
    room.phase === "voting"
      ? "🗳️ Phase de vote"
      : isMyTurnNow
      ? "🔥 À toi de jouer !"
      : "Tour de : " + current.name;

  document.getElementById("messageInput").disabled =
    !isMyTurnNow || room.phase !== "playing";

  if (room.phase === "voting") showVoting();
}

// ---------------- VOTING ----------------
async function showVoting() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const voteArea = document.getElementById("turnInfo");
  voteArea.innerHTML = "<h3>Vote :</h3>";

  players.forEach(p => {
    const btn = document.createElement("button");
    btn.innerText = p.name;
    btn.onclick = () => vote(p.id);
    voteArea.appendChild(btn);
  });
}

// ---------------- VOTE ----------------
async function vote(playerId) {
  await client.rpc("increment_vote", {
    player_id_input: playerId
  });

  await checkEndVoting();
}

// ---------------- END VOTE ----------------
async function checkEndVoting() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const { data: votes } = await client
    .from("players")
    .select("votes")
    .eq("room_id", currentRoom.id);

  const totalVotes = votes.reduce((a, p) => a + (p.votes || 0), 0);

  if (totalVotes >= players.length) {
    await revealResult();
  }
}

// ---------------- RESULT ----------------
async function revealResult() {
  const { data: players } = await client
    .from("players")
    .select("*")
    .eq("room_id", currentRoom.id);

  const undercover = players.find(p => p.role === "undercover");

  const sorted = [...players].sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const eliminated = sorted[0];

  let result =
    eliminated.id === undercover.id
      ? "🎉 Civils gagnent !"
      : "💀 Undercover gagne !";

  alert(`${result}

Undercover : ${undercover.name}
Éliminé : ${eliminated.name}`);
}

// ---------------- WORDS ----------------
function getRandomWords() {
  const themes = {
    animaux: [["chien", "loup"], ["chat", "tigre"]],
    objets: [["chaise", "tabouret"], ["stylo", "crayon"]],
    nourriture: [["pizza", "burger"], ["pomme", "poire"]]
  };

  const keys = Object.keys(themes);
  const theme = keys[Math.floor(Math.random() * keys.length)];
  const pair = themes[theme][Math.floor(Math.random() * 2)];

  return { word1: pair[0], word2: pair[1] };
}

function listenTurns() {
  // 🔥 éviter duplication
  if (window.turnChannel) {
    client.removeChannel(window.turnChannel);
  }

  window.turnChannel = client
    .channel("turns-" + currentRoom.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "turns",
        filter: `room_id=eq.${currentRoom.id}`
      },
      () => {
        fetchTurns();
      }
    )
    .subscribe();

  fetchTurns();
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
        if (payload.new.status === "playing") enterGame();

        updateTurnUI();
      }
    )
    .subscribe();
}
