# Lab 5 Design Writeup — Networked Battleship

**Name(s):**
**EID(s):**
**Date submitted:**

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

### 1.A — [Name the component or decision]

*What I chose:* [1–2 sentences — be specific about the class and method]

*What I considered instead:* [1 sentence]

*Why:* [2–4 sentences — explain the tradeoff, not just the conclusion]

---

### 1.B — [Name the component or decision]

*What I chose:* [1–2 sentences]

*What I considered instead:* [1 sentence]

*Why:* [2–4 sentences]

---

## Section 2 — Message Protocol

### 2.1 — Full message sequence for one complete game

Write out the complete sequence of messages exchanged between the server and both clients, from the moment each browser tab connects through to GAME_OVER. Include who sends each message and who receives it.  Use the format below.

Do not skip the handshake phase or abbreviate the mid-game turns — show at least three full fire/result/turn-change cycles.

```
[Browser tab 1]  →  [Server]   TCP connect
[Server]         →  [Tab 1]    ASSIGN { playerNumber: 1 }
[Server]         →  [Tab 1]    WAITING
[Browser tab 2]  →  [Server]   TCP connect
[Server]         →  [Tab 2]    ASSIGN { playerNumber: 2 }
[Tab 1]          →  [Server]   READY { name: "Alice" }
[Tab 2]          →  [Server]   READY { name: "Bob" }
[Server]         →  [Tab 1]    GAME_START { myBoard: [[...]], turn: 1 }
[Server]         →  [Tab 2]    GAME_START { myBoard: [[...]], turn: 1 }
... (continue through at least 3 fire cycles and GAME_OVER)
```

### 2.2 — Any message types you added or changed

If you added fields, changed field names, or defined additional message types beyond the ones in the README, document them here with the same format as the protocol table in the README.  If you followed the spec exactly, write "No changes."

---

## Section 3 — Concurrency

Answer each question in 3–6 sentences.  Reference specific class and method names from your own code.

**3.1 — How does your implementation ensure that a CHAT message sent by player 2 is never delayed by a FIRE message being processed for player 1?**

Name the exact location in your code where CHAT diverges from the game-logic path.  Explain what would go wrong if you handled CHAT the same way as FIRE.

*(Your answer here.)*

---

**3.2 — Two `ClientHandler` threads call `handleMessage` concurrently. What shared state could be corrupted without synchronization, and what is the specific failure mode?**

Give a concrete interleaving — e.g., "Thread 1 reads `readyCount` as 1, Thread 2 reads `readyCount` as 1, both increment to 2, both enter `handleReady` and each generates a separate set of boards, with the second overwriting the first."  Don't just say "a race condition could occur."

*(Your answer here.)*

---

**3.3 — How do all five threads exit cleanly when the game ends?**

Walk through exactly what happens after `handleFire` detects that all ships are sunk: what method is called, what does it do to each thread's blocking call (`outbox.take()` or `readFrame()`), and in what order do the threads terminate.

*(Your answer here.)*

---

## Section 4 — Bugs (two required)

If you genuinely only hit one bug, describe a second plausible one — but only one you could actually imagine hitting, not one you invented from thin air. Graders can tell the difference.

### 4.A — [Short descriptive name]

*Symptom:* What you observed — the visible, external behavior.

*Cause:* Quote the wrong line or describe the wrong logic precisely.

*Fix:* What you changed.

*Lesson:* One sentence — the rule or habit that would have prevented this.

---

### 4.B — [Short descriptive name]

*Symptom:*

*Cause:*

*Fix:*

*Lesson:*

---

## Section 5 — Testing

Describe what you actually ran.  "I tested it and it worked" earns no credit.

**5.1 — How did you verify the server before building the frontend?**

Name the tool and the specific JSON messages you sent.  What did you check in the server's output to confirm each step was working?

*(Your answer here.)*

---

**5.2 — How did you verify turn enforcement?**

Describe the exact test: which player sent FIRE out of turn, what JSON did you send, and what did the server return?

*(Your answer here.)*

---

**5.3 — How did you verify that CHAT is not blocked by concurrent FIRE processing?**

This is hard to test with two browser tabs.  Describe the specific setup you used — did you add an artificial delay to FIRE processing, use two `wscat` terminals, or something else?

*(Your answer here.)*

---

**5.4 — How did you test disconnect handling?**

What did you close (the tab, the terminal, the socket), when did you close it (before READY, during play, after game over), and what did the surviving client receive?

*(Your answer here.)*

---

**5.5 — Browser and OS**

List the browser(s) and OS(es) you tested on.

*(Your answer here.)*

---

## Section 6 — Reflection (3–5 sentences, answer at least two)

- What was the hardest ordering constraint to get right, and how did you figure it out?
- What does this lab teach about the difference between correctness and performance in concurrent systems?
- What would you do differently if starting from scratch?
- Was there a moment something clicked about threads or WebSockets? What was it?

*(Your answer here.)*

---

## Section 7 — Time Log

| Date | Hours | What you worked on |
|------|-------|--------------------|
| | | |
| | | |
| | | |
| | | |
| | | |
| | | |
| | | |
| | | |
| | | |
| | | |

**Total hours:** ___

**Approximate split between backend and frontend:** ___% / ___%
