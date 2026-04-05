# PROTOCOL.md — Message Protocol

**Name(s):** Jaeyeon Won
**EID(s):** jw57786

---

For each message type below, fill in all four fields:
- **Direction** — who sends it and who receives it
- **Fields** — every JSON field, its Java type, and whether it can be null/absent
- **When sent** — the exact condition that triggers this message
- **Receiver action** — what the recipient does upon receiving it

Add rows or sections for any message types you defined beyond the ones listed.

---

## ASSIGN

**Direction:** Server → Client

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"ASSIGN"`) | No |
| `playerNumber` | int | No |

**When sent:**
Sent by the server to a client right after that clients connects successfully. 
Each client receives its own player number (1 or 2).

**Receiver action:**
The client stores its assigned player number locally for the rest of the session. 
If the client is player 1, it then waits for a WAITING message.
If the client is player 2, it waits for GAME_START message.

---

## WAITING

**Direction:** Server → Client (player 1 only)

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"WAITING"`) | No |

**When sent:**
Sent by the server to player 1 right after they connect, while player 2 has not joined yet
, or the game is not ready yet to start.

**Receiver action:**
Player 1 displays a waiting screen like "Waiting for player 2 to connect..." and does not allow any gameplay actions until the game begins.

---

## READY

**Direction:** Client → Server

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"READY"`) | No |
| `name` | String | Yes |

**When sent:**
Sent by the client after receiving ASSIGN from players.
The name field is optional and carries the player's display name if provided.

**Receiver action:**
The server marks that player as ready. 
Once both players have sent READY, the server initializes both boards and sends GAME_START to each client.
---

## GAME_START

**Direction:** Server → Client

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"GAME_START"`) | No |
| `myBoard` | int\[\]\[\] | No |
| `turn` | int | No |

**When sent:**
Sent to player 1 and 2 right after both have sent READY.
Each client receives its own board layout in myBoard.

**Receiver action:**
The client saves myBoard locally and renders the game screen.
The client checks the turn field to determine who goes first. 
The client enables firing controls only if turn matches its own player number.

---

## FIRE

**Direction:** Client → Server

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"FIRE"`) | No |
| `row` | int | No |
| `col` | int | No |

**When sent:**
Sent by the client when the player clicks a cell on the opponent's board during their turn.
It contains the coordinates of the shot being fired.

**Receiver action:**
The server validates the shot, updates defender's board and fleet state, and sends SHOT_RESULT to both clients.
If game isn't over, the server also sends TURN_CHANGE to switch turns to both clients.

---

## SHOT_RESULT

**Direction:** Server → Client (both clients)

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"SHOT_RESULT"`) | No |
| `shooter` | int | No |
| `row` | int | No |
| `col` | int | No |
| `hit` | boolean | No |
| `sunkShip` | String | Yes |

**When sent:**
Sent by the server right after processing a valid FIRE message.
Sent to both clients to maintain them in sync.

**Receiver action:**
Both clients update the boards based on the shot result.
While the shoooter updates the opponent's board, the defender updates their own board.
If sunkShip is not null, the client also updates the fleet status display.

---

## TURN_CHANGE

**Direction:** Server → Client (both clients)

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"TURN_CHANGE"`) | No |
| `turn` | int | No |

**When sent:**
Sent by the server right after SHOT_RESULT if the game is not over.
Sent to both clients to indicate the next player's turn.

**Receiver action:**
The client updates the turn indicator and enables firing controls only if turn matches its own player number.

---

## CHAT (client → server)

**Direction:** Client → Server

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"CHAT"`) | No |
| `text` | String | No |

**When sent:**
Sent by the client when the player sends the chat message. 
Can be sent at any time.

**Receiver action:**
The server immediately forwards the message to both clients as a server-to-client CHAT message.
---

## CHAT (server → client)

**Direction:** Server → Client (both clients)

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"CHAT"`) | No |
| `from` | String | No |
| `text` | String | No |

**When sent:**
Sent by the server right after receiving a client-to-server CHAT message.
Sent to both clients.

**Receiver action:**
he client appends the message to the chat log, 
displaying the sender's name and the message text.

---

## GAME_OVER

**Direction:** Server → Client (both clients)

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"GAME_OVER"`) | No |
| `winner` | int | No |
| `finalBoard` | int\[\]\[\] | No |

**When sent:**
Sent by the server as soon as one player sinks all of the opponent's ships.

**Receiver action:**
The client disables all firing controls and displays a game over screen indicating the winner.
The final board state in finalBoard is revealed to both players.

---

## OPPONENT_DISCONNECTED

**Direction:** Server → Client

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"OPPONENT_DISCONNECTED"`) | No |

**When sent:**
Sent by the server to the remaining client
when the other player disconnects in the middle of the game.


**Receiver action:**
The client displays a disconnect notice, disables all gameplay actions, and treats the session as ove

---

## ERROR

**Direction:** Server → Client

**Fields:**

| Field | Java type | Nullable? |
|---|---|---|
| `type` | String (`"ERROR"`) | No |
| `message` | String | No |

**When sent:**
Sent by the server whenever it receives an invalid message from a client.

**Receiver action:**
The client displays the error message to the user.
Game state is not updated unless a subsequent valid message is received.

---

## Additional message types (if any)

*If you defined message types beyond the ones above, document them here using the same four-field format.*
