# Lab 5 Design Writeup — Networked Battleship

**Name(s):** Jaeyeon Won
**EID(s):** jw57786
**Date submitted:** 13th April 2026

---

## What This Document Is

2–3 pages of honest reflection on the decisions you made and the problems you hit.  Not a summary of the lab spec — we wrote the spec, we know what it says.

Full credit requires:

- Two specific design choices with a stated reason and a named alternative
- A complete message sequence diagram covering one full game
- Three concurrency questions answered with specific references to your code
- Two concrete bugs (symptom → cause → fix → lesson learned)
- A testing section that describes what you actually ran, not what you planned to run

Vague entries ("I synchronized the shared state") earn no credit. Entries like "I made `handleMessage` synchronized because both reader threads call it concurrently and I need turn/readyCount/boards to be updated atomically — a `BlockingQueue` approach would have also worked but requires a fifth thread and complicates the CHAT bypass" earn full credit.

---

## Section 1 — Design Choices (two required, ~100 words each)

For each: what did you choose, what was the alternative, and why?

Candidate topics (pick two; you may substitute your own if more interesting):

- `synchronized` method on `handleMessage` vs. a dedicated `BlockingQueue` consumer thread for game logic — why did you choose one over the other?
- How you handle CHAT without the game-logic lock — what exactly does your code do differently for CHAT vs. FIRE?
- `WriterThread` + `LinkedBlockingQueue` per client vs. making `writeFrame` calls directly from `GameServer` with a per-client lock
- Where you send ASSIGN — why the timing relative to the WebSocket handshake matters and what goes wrong if you get it wrong
- How you signal threads to exit after game over — sentinel in queue, socket close, interrupt, or something else

### 1.A — `synchronized` on `handleMessage` over a dedicated `BlockingQueue` consumer thread

*What I chose:* I used a synchronized block inside handleMessage() in GameServer.java file.
When a message is being processed, the entire handleMessage() method is locked, preventing other threads from entering it until the current message is fully processed.

*What I considered instead:* The alternative was to use a dedicated 'BlockingQueue' consumer thread, where both clientHandler threads would put messages into a BlockingQueue, and one consumer thread dequeues and processes them sequentially.


*Why:* [2–4 sentences — explain the tradeoff, not just the conclusion
The BlockingQueue approach eliminates locks entirely, which removes any deadlock risk, but I went with a synchronized block inside handleMessage() instead, mainly because of CHAT.
With BlockingQueue, CHAT would get stuck in the queue behind a FIRE message, meaning player 2's chat could be delayed while player 1's shot is being processed.
I'd need a separate fast path for CHAT anyway, which adds complexity and basically a fifth thread for no real gain. 
The synchronized block lets me check for CHAT at the top of handleMessage() before getting the lock, call broadcast() right away, and move on.
---

### 1.B — 'WriterThread` + `LinkedBlockingQueue` per client over direct `writeFrame` calls with a per-client lock from `GameServer`

*What I chose:* For each client, I created a dedicated WriterThread that is the only thread ever calling WebSocketUtil.writeFrame() on that client's OutputStream. 
Other threads that want to send a message put it into the client's LinkedBlockingQueue through WriterThread.send(), and the WriterThread dequeue the queue and sends each message.

*What I considered instead:* I could have called writeFrame() directly from Gameserver with a per-client lock to ensure that only one thread writes to the client's OutputStream at a time.

*Why:* Directly calling writeFrame() with a per-client lock is simpler since it doesn't require any additional threads or queues.
However, if two threads write to the same OutputStream at the same time without a lock, their bytes interleave and the browser receives a corrupted WebSocket frame it cannot parse(ex: thread 1 is sending "Hello" while thread 2 is sending "Jay", the output could end up as "HJealylol", mixing bytes and making it hard to parse). 
A per-client lock would prevent that, but then GameServer would be stuck holding the lock until the network write finishes, which can be slow. 
With WriterThread, send() just puts the message in the queue and returns right away, so GameServer never waits on I/O.

---

## Section 2 — Message Protocol

### 2.1 — Full message sequence for one complete game

Write out the complete sequence of messages exchanged between the server and both clients, from the moment each browser tab connects through to GAME_OVER. Include who sends each message and who receives it.  Use the format below.

Do not skip the handshake phase or abbreviate the mid-game turns — show at least three full fire/result/turn-change cycles.

```
--- Game Start ---
[Browser tab 1]  →  [Server]   TCP connect
[Server]         →  [Tab 1]    ASSIGN { playerNumber: 1 }
[Server]         →  [Tab 1]    WAITING
[Browser tab 2]  →  [Server]   TCP connect
[Server]         →  [Tab 2]    ASSIGN { playerNumber: 2 }
[Tab 1]          →  [Server]   READY { name: "Jay" }
[Tab 2]          →  [Server]   READY { name: "Julia" }
[Server]         →  [Tab 1]    GAME_START { myBoard: [[...]], turn: 1 }
[Server]         →  [Tab 2]    GAME_START { myBoard: [[...]], turn: 1 }
--- Player 1's turn (Turn 1) ---
[Tab 1]          →  [Server]   FIRE { row: 6, col: 2 }
[Server]         →  [Tab 1]    SHOT_RESULT { shooter: 1, row: 6, col: 2, hit: false, sunkShip: null }
[Server]         →  [Tab 2]    SHOT_RESULT { shooter: 1, row: 6, col: 2, hit: false, sunkShip: null }
[Server]         →  [Tab 1]    TURN_CHANGE { turn: 2 }
[Server]         →  [Tab 2]    TURN_CHANGE { turn: 2 }
--- Chat ---
[Tab 2]          →  [Server]   CHAT { text: "Ha Ha! you missed it" }
[Server]         →  [Tab 1]    CHAT { from: "Julia", text: "Ha Ha! you missed it" }
[Server]         →  [Tab 2]    CHAT { from: "Julia", text: "Ha Ha! you missed it" }
--- Player 2's turn (Turn 2) ---
[Tab 2]          →  [Server]   FIRE { row: 1, col: 3 }
[Server]         →  [Tab 1]    SHOT_RESULT { shooter: 2, row: 1, col: 3, hit: true, sunkShip: null }
[Server]         →  [Tab 2]    SHOT_RESULT { shooter: 2, row: 1, col: 3, hit: true, sunkShip: null }
[Server]         →  [Tab 1]    TURN_CHANGE { turn: 1 }
[Server]         →  [Tab 2]    TURN_CHANGE { turn: 1 }
--- Chat ---
[Tab 1]          →  [Server]   CHAT { text: "Wait! How did you know? :(" }
[Server]         →  [Tab 1]    CHAT { from: "Jay", text: "Wait! How did you know? :(" }
[Server]         →  [Tab 2]    CHAT { from: "Jay", text: "Wait! How did you know? :(" }
--- Player 1's turn (Turn 3) ---
[Tab 1]          →  [Server]   FIRE { row: 4, col: 7 }
[Server]         →  [Tab 1]    SHOT_RESULT { shooter: 1, row: 4, col: 7, hit: false, sunkShip: null }
[Server]         →  [Tab 2]    SHOT_RESULT { shooter: 1, row: 4, col: 7, hit: false, sunkShip: null }
[Server]         →  [Tab 1]    TURN_CHANGE { turn: 2 }
[Server]         →  [Tab 2]    TURN_CHANGE { turn: 2 }
--- Final Turn (Player 2 win, destorying player 1's last ship)---
[Tab 2]          →  [Server]   FIRE { row: 9, col: 9 }
[Server]         →  [Tab 1]    SHOT_RESULT { shooter: 2, row: 9, col: 9, hit: true, sunkShip: "Carrier" }
[Server]         →  [Tab 2]    SHOT_RESULT { shooter: 2, row: 9, col: 9, hit: true, sunkShip: "Carrier" }
[Server]         →  [Tab 1]    GAME_OVER { winner: 2, finalBoard: [[...]] }
[Server]         →  [Tab 2]    GAME_OVER { winner: 2, finalBoard: [[...]] }

```

### 2.2 — Any message types you added or changed

If you added fields, changed field names, or defined additional message types beyond the ones in the README, document them here with the same format as the protocol table in the README.  If you followed the spec exactly, write "No changes."
No changes
---

## Section 3 — Concurrency

Answer each question in 3–6 sentences.  Reference specific class and method names from your own code.

**3.1 — How does your implementation ensure that a CHAT message sent by player 2 is never delayed by a FIRE message being processed for player 1?**

Name the exact location in your code where CHAT diverges from the game-logic path.  Explain what would go wrong if you handled CHAT the same way as FIRE.

*The exact location is GameServer.java where, handleMessage() checks for CHAT at the very top before entering the synchronized(this) block.
If the message is CHAT, it calls broadcast() immediately and returns without ever acquiring the lock since broadcast() calls WriterThread.send(), which puts a string into a LinkedBlockingQueue.
If I handled CHAT the same way as FIRE in synchronized block, player 2's CHAT would be blocked while player 1's FIRE is being processed in handleFire() due to the condition that only one thread can hold lock at a time.*

---

**3.2 — Two `ClientHandler` threads call `handleMessage` concurrently. What shared state could be corrupted without synchronization, and what is the specific failure mode?**

Give a concrete interleaving — e.g., "Thread 1 reads `readyCount` as 1, Thread 2 reads `readyCount` as 1, both increment to 2, both enter `handleReady` and each generates a separate set of boards, with the second overwriting the first."  Don't just say "a race condition could occur."

*The shared states that could be corrupted without synchronization are turn, readyCount, phase, boards[], and fleets[] in GameServer.java.
 The specific failure mode would be that Thread 1, player 1's ClientHandler, and Thread 2, player 2's ClientHandler, can both read readyCount as 1 at the same time, 
both increment it to 2, and both enter the game-start logic in handleReady(). This causes ShipPlacementGenerator.generatePlacements() to be called twice, boards[] and fleets[] to be initialized twice, and GAME_START to be sent twice to each client. 
The second overwriting the first can leave the game state inconsistent.*

---

**3.3 — How do all five threads exit cleanly when the game ends?**

Walk through exactly what happens after `handleFire` detects that all ships are sunk: what method is called, what does it do to each thread's blocking call (`outbox.take()` or `readFrame()`), and in what order do the threads terminate.

*After `handleFire` detects that all ships are sunk, it sets phase = PHASE_DONE, broadcasts GAME_OVER to both clients, and calls shutdown(). 
shutdown() method puts a POISON_PILL into each client's LinkedBlockingQueue. 
Each WriterThread picks up the POISON_PILL from outbox.take(), exits the loop, and closes the socket in the finally block. 
When the socket closes, ClientHandler's readFrame() returns null or throws an IOException, causing the read loop to exit and handleDisconnect() to be called. 
Since phase is already PHASE_DONE, handleDisconnect() returns immediately.
The order threads terminate is: writer threads -> ClientHandler -> main thread in BattleShipServer*

---

## Section 4 — Bugs (two required)

If you genuinely only hit one bug, describe a second plausible one — but only one you could actually imagine hitting, not one you invented from thin air. Graders can tell the difference.

### 4.A — "Connection closed unexpectedly" showing after game ends

*Symptom:* When the game was over normally, on the winner's screen, it showed "Connection closed unexpectedly" error message.

*Cause:* When GAME_OVER is received, setStatus("over") is called, but React state updates are asynchronous. 
By the time the server closes the socket and ws.onclose fires, status is still "playing", so the prev !== "over" check passes and the error message is displayed.

*Fix:* Added statusRef and set statusRef.current = "over" immediately when GAME_OVER is received. Changed ws.onclose to check statusRef.current instead of relying on React state.

*Lesson:* One sentence — I learned that React state is asynchronous. So It was good to learn that I have to use Ref when I need to check the current status.

---

### 4.B — "Congratulations! You win!" showing on third client connection

*Symptom:* When a third browser tab tried to connect, it showed "Congratulations! You win!" instead of an error message telling the server is full.

*Cause:* The server sends an ERROR message and closes the socket, but ws.onmessage only called console.warn for ERROR without changing status. 
So when ws.onclose fired, status was still "connecting", which is not "over", so it transitioned to "over". 
Since winner and playerNumber were both null, winner === playerNumber evaluated to null === null which is true, showing the win screen.

*Fix:* Added statusRef.current = "idle" and setStatus("idle") when ERROR is received, 
and changed ws.onclose to skip the error message when statusRef.current is "idle".

*Lesson:* I learned that I should handle all the error messages explicitly.

---

## Section 5 — Testing

Describe what you actually ran.  "I tested it and it worked" earns no credit.

**5.1 — How did you verify the server before building the frontend?**

Name the tool and the specific JSON messages you sent.  What did you check in the server's output to confirm each step was working?

*I used wscat to test the server before building the frontend as described in the instruction. I opened two separate terminals, connecting both players to wscat -c ws://localhost:8080.
The JSON messages that I sent were {"type":"READY","name":"Jay"} in terminal 1 and {"type":"READY","name":"Julia"} in terminal 2. I checked that after both players sent those messages, 
both terminals received GAME_START with valid myBoard data. I also checked the server terminal telling "Player 1 has connected" and "Player 2 has connected".*

---

**5.2 — How did you verify turn enforcement?**

Describe the exact test: which player sent FIRE out of turn, what JSON did you send, and what did the server return?

*After both players sent READY and the game started with player 1 going first, I tried firing from player 2's terminal by sending {"type":"FIRE","row":1,"col":1}. 
The server rejected it and sent back an ERROR saying it wasn't player 2's turn. 
The turn stayed at 1 and nothing changed on either side.*

---

**5.3 — How did you verify that CHAT is not blocked by concurrent FIRE processing?**

This is hard to test with two browser tabs.  Describe the specific setup you used — did you add an artificial delay to FIRE processing, use two `wscat` terminals, or something else?

*I used two wscast terminals. So while the turn was at the player 1, I sent {"type":"CHAT","text":"Hi, Jay!"} from terminal 2, and I could confirm that CHAT Message was shown in both terminals immediately without delay.*

---

**5.4 — How did you test disconnect handling?**

What did you close (the tab, the terminal, the socket), when did you close it (before READY, during play, after game over), and what did the surviving client receive?

*During an game on going, not done yet, I intentionally closed one browser tab. 
The tab, which was not closed, immediately displayed "Opponent disconnected. You win! The opponent run away like a coward.", confirming that OPPONENT_DISCONNECTED was received and handled correctly.*

---

**5.5 — Browser and OS**

List the browser(s) and OS(es) you tested on.

*I tested on Chrome on macOS.*

---

## Section 6 — Reflection (3–5 sentences, answer at least two)

- What was the hardest ordering constraint to get right, and how did you figure it out?
- What does this lab teach about the difference between correctness and performance in concurrent systems?
- What would you do differently if starting from scratch?
- Was there a moment something clicked about threads or WebSockets? What was it?

*If I were starting from scratch, I'd start each player's threads right after accept() instead of waiting for both to connect. 
The way it's set up now, player 1 just sits on "Connecting..." until the player 2 connects to the server, so the WAITING message never actually gets sent. 
Starting threads right away after each accept() would have fixed that from the beginning so that it will make the game look more real like an actual game.
The moment something clicked about threads for me was when I understood why WriterThread is necessary. At first, I thought I could just call writeFrame() directly from GameServer
But when I realized if two threads write to the same outputstream, it can possibly mix up the bytes and lead to corrupt Websocket Frame.
After that, I learned that two client need two dedicated writer threads separately. I could understand concurrent input and ouput.*

---

## Section 7 — Time Log

| Date    | Hours | What you worked on                                                                                      |
|---------|-------|---------------------------------------------------------------------------------------------------------|
| March 29 | 3     | Implemented single TCP connection and WebSocket handshake                                               |
| March 31 | 3     | Designed PROTOCOL.md, implemented Message.parse for READY, FIRE, CHAT and JSON builders                 |
| April 2 | 3     | Implemented BattleshipServer, ClientHandler, WriterThread, sent ASSIGN                                  |
| April 4 | 4     | Implemented GameServer, handleReady, GAME_START handshake, verified with wscat                          |
| April 6 | 4     | Implemented handleFire, turn validation, SHOT_RESULT, TURN_CHANGE, GAME_OVER, CHAT, disconnect handling |
| April 8 | 3     | Finished Board.java and Fleet.java with the codes from Lab 4                                            |
| April 9 | 2     | Debugged and tested server with wscat, fixed bugs                                                       |
| April 10 | 3     | Started React frontend parts, including App, Board, Chat, FleetStatus                                   |
| April 11 | 2     | Finished the frontend parts and wrote Javadocs and UML                                                  |
| April 12 | 2     | I wrote writeup report.                                                                                 |

**Total hours:** _29_

**Approximate split between backend and frontend:** _70_% / _30_%
