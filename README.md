# Networked Battleship

A two-player, real-time Battleship game: a multi-threaded **Java** server built on raw `java.net.ServerSocket`, and a **React** browser client that talks to it over WebSocket. Includes live in-game chat that is never blocked by game logic.

Built for ECE 422C (Software Design & Implementation II) at UT Austin, Spring 2026.

![UML diagram](Lab%205%20UML%20Diagram.png)

---

## Features

- **Two-player online play.** Each player opens the game in a browser tab, gets a randomly placed fleet, and takes turns firing at the opponent's board.
- **Server-authoritative rules.** The server validates every shot (turn order, bounds, repeat shots) and keeps both clients in sync.
- **Concurrent chat.** Players can chat at any time, and chat messages bypass the game-logic lock so a shot being processed never delays them.
- **Clean lifecycle handling.** A third connection gets a `"Server is full."` error. If a player disconnects mid-game, the other is notified. After game over, every thread shuts down cleanly.
- **No frameworks on the backend.** Just `ServerSocket`, `java.io` streams, `Thread`, `synchronized`, and `LinkedBlockingQueue`. No Maven/Gradle.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Java 17+, `java.net.ServerSocket`, `java.util.concurrent` |
| Transport | WebSocket over raw TCP, JSON messages |
| Frontend | React 18, Vite 5 |

---

## Architecture

The server runs five threads:

```
                        ┌──────────────────────┐
  Browser 1 ──frames──▶ │ ClientHandler (P1)   │──┐
                        └──────────────────────┘  │   handleMessage()
                                                  ├──▶ ┌────────────┐
                        ┌──────────────────────┐  │    │ GameServer │  (shared state:
  Browser 2 ──frames──▶ │ ClientHandler (P2)   │──┘    └─────┬──────┘   boards, fleets,
                        └──────────────────────┘             │          turn, phase)
                                                     send()  │
                     ┌───────────────────────────────────────┴──────┐
                     ▼                                              ▼
           LinkedBlockingQueue (P1)                       LinkedBlockingQueue (P2)
                     │                                              │
           ┌─────────▼─────────┐                          ┌─────────▼─────────┐
           │ WriterThread (P1) │──frames──▶ Browser 1     │ WriterThread (P2) │──frames──▶ Browser 2
           └───────────────────┘                          └───────────────────┘

  main thread (BattleshipServer): accepts 2 sockets, starts the threads, join()s,
  plus a daemon thread that rejects any extra connections.
```

| Class | Role |
|---|---|
| `BattleshipServer` | Entry point. Accepts exactly two players, wires up every object, starts the threads, and waits for the game to end. |
| `ClientHandler` | One per player. Does the WebSocket handshake, sends `ASSIGN`, then reads frames and forwards parsed messages to `GameServer`. |
| `GameServer` | Holds all game state and handles `READY` / `FIRE` / `CHAT` / disconnects. |
| `WriterThread` | One per player. The **only** thread that writes to that player's socket, draining a `LinkedBlockingQueue` outbox. |
| `Message` | Parses incoming JSON and builds outgoing JSON. |
| `Board`, `Fleet` | Grid and ship-tracking logic, adapted from the single-player Lab 4 version. |
| `WebSocketUtil`, `ShipPlacementGenerator`, `GameConfiguration` | Provided by the course: the WebSocket handshake/framing, random fleet placement, and constants. |

### Key design decisions

- **`synchronized` game logic, lock-free chat.** `GameServer.handleMessage()` checks for `CHAT` *before* entering its `synchronized` block and broadcasts it immediately. `READY` and `FIRE` run inside the lock, so `readyCount`, `turn`, `boards`, and `fleets` update atomically. For example, both players' `READY` can't race and start two games.
- **One writer thread per client.** Instead of calling `writeFrame` directly from `GameServer` under a per-client lock, messages are put on a queue. This keeps concurrent writes from interleaving bytes into corrupt WebSocket frames, and `GameServer` never blocks on network I/O.
- **`ASSIGN` only after the handshake.** Writing a WebSocket frame before the HTTP `101 Switching Protocols` response finishes corrupts the connection, so `ClientHandler` sends `ASSIGN` right after `handshake()` returns.
- **Poison-pill shutdown.** On game over, `GameServer.shutdown()` puts a `POISON_PILL` on each outbox. Each `WriterThread` exits and closes its socket. That unblocks `ClientHandler.readFrame()`, those threads exit, and `main`'s `join()` returns.

---

## Message Protocol

All messages are JSON objects with a `type` field.

| Type | Direction | Fields |
|---|---|---|
| `ASSIGN` | Server → Client | `playerNumber` |
| `WAITING` | Server → Player 1 | — |
| `READY` | Client → Server | `name` (optional) |
| `GAME_START` | Server → Both | `myBoard` (int[][]), `turn` |
| `FIRE` | Client → Server | `row`, `col` |
| `SHOT_RESULT` | Server → Both | `shooter`, `row`, `col`, `hit`, `sunkShip` (nullable) |
| `TURN_CHANGE` | Server → Both | `turn` |
| `CHAT` | Client → Server | `text` |
| `CHAT` | Server → Both | `from`, `text` |
| `GAME_OVER` | Server → Both | `winner`, `finalBoard` |
| `OPPONENT_DISCONNECTED` | Server → Client | — |
| `ERROR` | Server → Client | `message` |

Full spec (when each message is sent, how the receiver reacts): [`Documents/PROTOCOL_template.md`](Documents/PROTOCOL_template.md)

---

## Getting Started

### Prerequisites

- Java JDK 17+
- Node.js 20+ and npm 9+

### 1. Run the server

```bash
cd src
javac *.java
java BattleshipServer          # port 8080 (default)
# java BattleshipServer 9090   # custom port
```

### 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install     # first time only
npm run dev
```

### 3. Play

Open **http://localhost:5173** in two browser tabs. Enter a name in each and click **Connect**. The game starts once both players are ready. Click cells on the opponent's board on your turn, and use the chat box at any time.

> The server hosts a single game, then shuts down after `GAME_OVER`. Restart `java BattleshipServer` to play again.

### Testing without a browser

```bash
npm install -g wscat
wscat -c ws://localhost:8080      # run in two terminals
> {"type":"READY","name":"Alice"}
> {"type":"FIRE","row":0,"col":0}
```

---

## Project Structure

```
├── src/              Java backend (flat, no packages)
├── frontend/         React + Vite client
│   └── src/
│       ├── App.jsx           WebSocket connection + game state
│       └── components/       Board, Chat, FleetStatus
├── docs/             Generated JavaDoc (open docs/index.html)
└── Documents/        Lab spec, build guide, protocol spec, design write-up
```

## Documentation

- [`Documents/WRITEUP_template.md`](Documents/WRITEUP_template.md): design write-up covering design choices, a full message sequence, concurrency analysis, and bugs found
- [`Documents/BUILD.md`](Documents/BUILD.md): detailed build and run reference
- `docs/index.html`: JavaDoc (regenerate with `cd src && javadoc -d ../docs *.java`)

## Author

**Jaeyeon Won**, UT Austin ECE
