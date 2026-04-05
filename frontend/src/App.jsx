// App.jsx — Root component.
//
// Manages the WebSocket connection, all top-level game state, and the
// high-level screen transitions (lobby → waiting → playing → game over).
//
// Key design note — stale closure problem:
//   ws.onmessage is assigned once inside connect() and never reassigned.
//   If it closed over React state variables directly (e.g. playerNumber),
//   it would always see their initial values, not the current ones.
//
//   The fix: store playerNumber in a ref (playerNumberRef) and update the
//   ref immediately whenever it changes.  ws.onmessage reads the ref, which
//   always holds the current value regardless of when onmessage was created.

import { useState, useEffect, useRef } from "react";
import Board from "./components/Board";
import Chat from "./components/Chat";
import FleetStatus from "./components/FleetStatus";

const SERVER_URL = "ws://localhost:8080";
const BOARD_SIZE = 10;

const emptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

const initialFleet = () =>
  ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"].map(
    (name, i) => ({ name, size: [5, 4, 3, 3, 2][i], sunk: false })
  );

export default function App() {

  const [nameInput, setNameInput]         = useState("");
  const [status, setStatus]               = useState("idle");
  // status values: "idle" | "connecting" | "waiting" | "playing" | "over"
  const [playerNumber, setPlayerNumber]   = useState(null);
  const [errorMsg, setErrorMsg]           = useState("");
  const [myBoard, setMyBoard]             = useState(emptyBoard());
  const [opponentBoard, setOpponentBoard] = useState(emptyBoard());
  const [myFleet, setMyFleet]             = useState(initialFleet());
  const [opponentFleet, setOpponentFleet] = useState(initialFleet());
  const [myTurn, setMyTurn]               = useState(false);
  const [winner, setWinner]               = useState(null);
  const [chatLog, setChatLog]             = useState([]);

  const wsRef           = useRef(null);
  const playerNumberRef = useRef(null);  // always-current copy — read this in onmessage

  // Keep the ref in sync with the state value.
  useEffect(() => { playerNumberRef.current = playerNumber; }, [playerNumber]);

  // -------------------------------------------------------------------------
  // TODO: implement connect()
  //
  // - Create new WebSocket(SERVER_URL), store in wsRef.current
  // - Set status to "connecting"
  //
  // ws.onmessage:
  //   Parse event.data as JSON.  Dispatch on msg.type:
  //
  //   "ASSIGN"    → update playerNumberRef.current AND setPlayerNumber immediately
  //                 (updating the ref first ensures comparisons below are correct
  //                  even before React re-renders)
  //                 setStatus("waiting")
  //                 send READY with the player's name
  //
  //   "WAITING"   → setStatus("waiting")
  //
  //   "GAME_START"→ populate myBoard from msg.myBoard (2D array of 0s and 1s)
  //                 reset opponentBoard, fleets, winner
  //                 setMyTurn(msg.turn === playerNumberRef.current)  ← use the ref
  //                 setStatus("playing")
  //
  //   "SHOT_RESULT"→ update the correct board cell and fleet
  //                  use playerNumberRef.current to decide if you are the shooter
  //
  //   "TURN_CHANGE"→ setMyTurn(msg.turn === playerNumberRef.current)
  //
  //   "CHAT"      → append { from, text, time } to chatLog
  //
  //   "GAME_OVER" → setWinner, setStatus("over"), update final board
  //
  //   "OPPONENT_DISCONNECTED" → setErrorMsg, setStatus("over")
  //
  //   "ERROR"     → console.warn
  //
  // ws.onclose: clear wsRef, set an error if not already "over"
  // ws.onerror:  set error, reset status to "idle"
  // -------------------------------------------------------------------------
  const connect = () => {
    const ws = new WebSocket(SERVER_URL);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {

        case "ASSIGN":
          playerNumberRef.current = msg.playerNumber;
          setPlayerNumber(msg.playerNumber);
          setStatus("waiting");

          ws.send(JSON.stringify({
            type: "READY",
            name: nameInput
          }));
          break;

        case "WAITING":
          setStatus("waiting");
          break;

        case "GAME_START":
          setMyBoard(msg.myBoard);
          setOpponentBoard(emptyBoard());
          setMyFleet(initialFleet());
          setOpponentFleet(initialFleet());
          setWinner(null);
          setMyTurn(msg.turn === playerNumberRef.current);
          setStatus("playing");
          break;

        case "SHOT_RESULT": {
          const { shooter, row, col, hit, sunkShip } = msg;

          if (shooter === playerNumberRef.current) {
            // 내가 쏜 경우 → opponentBoard 업데이트
            setOpponentBoard(prev => {
              const copy = prev.map(r => [...r]);
              copy[row][col] = hit ? 2 : 3;
              return copy;
            });

            if (sunkShip) {
              setOpponentFleet(prev =>
                prev.map(s =>
                  s.name === sunkShip ? { ...s, sunk: true } : s
                )
              );
            }

          } else {
            // 상대가 쏜 경우 → myBoard 업데이트
            setMyBoard(prev => {
              const copy = prev.map(r => [...r]);
              copy[row][col] = hit ? 2 : 3;
              return copy;
            });

            if (sunkShip) {
              setMyFleet(prev =>
                prev.map(s =>
                  s.name === sunkShip ? { ...s, sunk: true } : s
                )
              );
            }
          }
          break;
        }

        case "TURN_CHANGE":
          setMyTurn(msg.turn === playerNumberRef.current);
          break;

        case "CHAT":
          setChatLog(prev => [
            ...prev,
            {
              from: msg.from,
              text: msg.text,
              time: new Date().toLocaleTimeString()
            }
          ]);
          break;

        case "GAME_OVER":
          setWinner(msg.winner);
          setStatus("over");
          break;

        case "OPPONENT_DISCONNECTED":
          setErrorMsg("Opponent disconnected.");
          setStatus("over");
          break;

        case "ERROR":
          console.warn(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (status !== "over") {
        setErrorMsg("Connection closed.");
        setStatus("idle");
      }
    };

    ws.onerror = () => {
      setErrorMsg("Connection error.");
      setStatus("idle");
    };
  };

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  // -------------------------------------------------------------------------
  // TODO: implement fire(row, col)
  //
  // Send {"type":"FIRE","row":row,"col":col}.
  // Check wsRef.current.readyState === WebSocket.OPEN before sending.
  // The Board component already gates clicks on interactive={myTurn}, so you
  // do not need to recheck myTurn here — but it doesn't hurt.
  // -------------------------------------------------------------------------
  const fire = (row, col) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "FIRE",
        row,
        col
      }));
    }
  };

  // -------------------------------------------------------------------------
  // TODO: implement sendChat(text)
  // -------------------------------------------------------------------------
  const sendChat = (text) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "CHAT",
        text
      }));
    }
  };

  // -------------------------------------------------------------------------
  // Render — skeleton provided; fill in the playing screen.
  // -------------------------------------------------------------------------

  if (status === "idle" || status === "connecting") {
    return (
      <div className="lobby">
        <h1>⚓ Battleship</h1>
        <p>Enter your name and connect to the server.</p>
        <input
          type="text"
          placeholder="Your name"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && connect()}
          maxLength={20}
        />
        <button onClick={connect} disabled={status === "connecting"}>
          {status === "connecting" ? "Connecting…" : "Connect"}
        </button>
        {errorMsg && <p className="error">{errorMsg}</p>}
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="lobby">
        <h1>⚓ Battleship</h1>
        <p>You are <strong>Player {playerNumber}</strong>.</p>
        <p>Waiting for your opponent to connect…</p>
      </div>
    );
  }

  if (status === "over") {
    return (
      <div className="game-over">
        <h1>{winner === playerNumber ? "You Win! 🎉" : "You Lose 💀"}</h1>
        <p>Player {winner} won the game.</p>
        <div className="boards-row">
          <div>
            <h3>My Board</h3>
            <Board cells={myBoard} interactive={false} onFire={() => {}} />
          </div>
          <div>
            <h3>Opponent's Board</h3>
            <Board cells={opponentBoard} interactive={false} onFire={() => {}} />
          </div>
        </div>
        <button onClick={() => window.location.reload()}>Play Again</button>
      </div>
    );
  }

  // status === "playing"
  return (
    <div className="game">
      <header>
        <h1>⚓ Battleship</h1>
        <div className={`turn-indicator ${myTurn ? "my-turn" : "their-turn"}`}>
          {myTurn ? "Your Turn" : "Opponent's Turn"}
        </div>
      </header>

      <div className="main-layout">
        <div className="boards-section">
          <div className="board-wrapper">
            <h3>My Fleet</h3>
            <Board cells={myBoard} interactive={false} onFire={() => {}} />
            <FleetStatus fleet={myFleet} label="My Ships" />
          </div>
          <div className="board-wrapper">
            <h3>Opponent's Fleet</h3>
            <Board cells={opponentBoard} interactive={myTurn} onFire={fire} />
            <FleetStatus fleet={opponentFleet} label="Opponent's Ships" />
          </div>
        </div>

        <div className="chat-section">
          <Chat log={chatLog} onSend={sendChat} />
        </div>
      </div>
    </div>
  );
}
