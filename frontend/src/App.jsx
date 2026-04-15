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
  //I learned that with the help of google search and chatgpt, React state is asynchronous, so that to check the status, I need to use statusRef.current
  // to prevent the possible errors.
  const statusRef = useRef("idle");

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
      if(wsRef.current) return;  //if it already has a connection, do nothing
      // Create new WebSocket(SERVER_URL), store in wsRef.current
      const ws = new WebSocket(SERVER_URL);
      //store in wsRef.current
      wsRef.current = ws;
      // set status to "connecting"
      setStatus("connecting");

      //ws.onmessage:
      //   Parse event.data as JSON.  Dispatch on msg.type:
      ws.onmessage = (event) => {
          //parse event data as JSON
          const msg = JSON.parse(event.data);
          //"ASSIGN"    → update playerNumberRef.current AND setPlayerNumber immediately
          //                 (updating the ref first ensures comparisons below are correct even before React re-renders)
          //                 setStatus("waiting")
          //                 send READY with the player's name
          if(msg.type === "ASSIGN"){
              //store player number in ref and state
              playerNumberRef.current = msg.playerNumber;

              // update player number in state nad set status as waiting
              setPlayerNumber(msg.playerNumber);
              setStatus("waiting");

              //send READY with the player's name
              ws.send(JSON.stringify({type: "READY", name: nameInput}));

          }else if(msg.type === "WAITING"){
              // "WAITING"   → setStatus("waiting")
              setStatus("waiting");

          }else if(msg.type === "GAME_START"){
              // "GAME_START"→ populate myBoard from msg.myBoard (2D array of 0s and 1s)}
              setMyBoard(msg.myBoard);

              // reset opponentBoard, fleets, winner
              setOpponentBoard(emptyBoard());
              setMyFleet(initialFleet());
              setOpponentFleet(initialFleet());
              setWinner(null);

              // setMyTurn(msg.turn === playerNumberRef.current)  ← use the ref
              setMyTurn(msg.turn === playerNumberRef.current);

              // setStatus("playing")
              setStatus("playing");

          }else if(msg.type === "SHOT_RESULT"){
              //update the correct board cell and fleet
              //use playerNumberRef.current to decide if you are the shooter
              const shooter = msg.shooter;
              const row = msg.row;
              const col = msg.col;
              const hit = msg.hit;
              const sunkShip = msg.sunkShip;

              //update the correct board cell
              //if i shot, update opponent board, else update my board
              if(shooter === playerNumberRef.current){
                  //i shot, update opponent board
                  setOpponentBoard(prev => {
                      const nxtBoard = prev.map(r => [...r]);
                      nxtBoard[row][col] = hit ? 2 : 3; // 2 for hit, 3 for miss
                      return nxtBoard;
                  });
                  //update opponent fleet if sunk
                  if(sunkShip){
                      setOpponentFleet(prev => prev.map(ship => ship.name === sunkShip ? { ...ship, sunk: true } : ship));
                  }
              }else{
                  //else, opponent shot, update my board
                  setMyBoard(prev => {
                      const nxtBoard = prev.map(r => [...r]);
                      nxtBoard[row][col] = hit ? 2 : 3;
                      return nxtBoard;
                  });
                  //update my fleet if sunk
                  if(sunkShip){
                      setMyFleet(prev => prev.map(ship => ship.name === sunkShip ? { ...ship, sunk: true } : ship));
                  }
              }
          }else if(msg.type === "TURN_CHANGE"){
              // "TURN_CHANGE"→ setMyTurn(msg.turn === playerNumberRef.current)
              setMyTurn(msg.turn === playerNumberRef.current);

          }else if(msg.type === "CHAT"){
              // "CHAT"      → append { from, text, time } to chatLog
              //since from protocol template, CHAT doens't have time
              //so we will use new Date().toLocaleTimeString() as the time when receiving the message I got help from chatGPT to add time to the message
              setChatLog(prev => [...prev, { from: msg.from, text: msg.text, time: new Date().toLocaleTimeString() }]);

          }else if(msg.type === "GAME_OVER"){
              // "GAME_OVER" → setWinner, setStatus("over"), update final board
              statusRef.current = "over";
              setWinner(msg.winner);
              setStatus("over");

              //update final board which is defending player's board(loser board)
              if(msg.winner === playerNumberRef.current){
                  //winner is the shooter, so update opponent board, which is the final board
                  setOpponentBoard(msg.finalBoard);
              }else{
                //winner is opponent, so update my board, which is the final board}
                setMyBoard(msg.finalBoard);
              }

          }else if(msg.type === "OPPONENT_DISCONNECTED"){
              // "OPPONENT_DISCONNECTED" → setErrorMsg, setStatus("over")
              statusRef.current = "over";
              setErrorMsg("Opponent disconnected. You win! The opponent run away like a coward.");
              setStatus("over");

          }else if(msg.type === "ERROR"){
              // "ERROR"     → console.warn
              console.warn("Error from server:", msg.message);
              //when the third person tries to connect
              if(msg.message === "Server is full."){
                  statusRef.current = "idle";  // 추가
                  setErrorMsg(msg.message);
                  setStatus("idle");
              }

          }
      };

    // ws.onclose: clear wsRef, set an error if not already "over"
    ws.onclose = () => {
        wsRef.current = null;
        if(statusRef.current !== "over" && statusRef.current !== "idle"){
            setErrorMsg("Connection closed unexpectedly.");
            setStatus("over");
        }
    };

  // ws.onerror:  set error, reset status to "idle"
    ws.onerror = () => {
        wsRef.current = null;
        setErrorMsg("Connection error. Please try again.");
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
    if(ws && ws.readyState === WebSocket.OPEN){
      ws.send(JSON.stringify({ type: "FIRE", row, col }));
    }
  };

  // -------------------------------------------------------------------------
  // TODO: implement sendChat(text)
  // -------------------------------------------------------------------------
  const sendChat = (text) => {
    const ws = wsRef.current;
    // Check if WebSocket is open before sending i guess it is safer
    //it is unsafe to call ws.send when the connection is not open, which could lead to errors or lost messages.
    if(ws&& ws.readyState === WebSocket.OPEN){
        ws.send(JSON.stringify({ type: "CHAT", text }));
    }
  };

  // -------------------------------------------------------------------------
  // Render — skeleton provided; fill in the playing screen.
  // -------------------------------------------------------------------------
  //this CSS layout boilerplate part was helped with CHATGPT

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
    // TODO: render game-over screen (winner/loser, both boards, reload button)
    return (
        <div className="game-over">
          <h1>{winner === playerNumber ? "Congratulation! You win!" : "Game Over"}</h1>
          {winner && <p>Player {winner} won the game.</p>}
          {errorMsg && <p className="error">{errorMsg}</p>}

          <div style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
            <div>
              <h3>My Board</h3>
              <Board cells={myBoard} interactive={false} onFire={() => {}} />
            </div>

            <div>
              <h3>Opponent's Board</h3>
              <Board cells={opponentBoard} interactive={false} onFire={() => {}} />
            </div>
          </div>

          <button onClick={() => window.location.reload()} style={{ marginTop: "20px" }}>
            Play Again
          </button>
        </div>
    );
  }

  // status === "playing"
  // TODO: render the main game screen:
  //   - header with turn indicator (use myTurn state)
  //   - My Board (interactive={false}) + FleetStatus
  //   - Opponent's Board (interactive={myTurn}, onFire={fire}) + FleetStatus
  //   - Chat panel
  return (
    <div className="game" style={{ padding: "20px" }}>
      <h2>{myTurn ? "Your Turn" : "Opponent's Turn"}</h2>

      <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
        <div>
          <h3>My Fleet</h3>
          <Board cells={myBoard} interactive={false} onFire={() => {}} />
          <div style={{ marginTop: "10px" }}>
            <FleetStatus fleet={myFleet} label="My Ships" />
          </div>
        </div>

        <div>
          <h3>Opponent's Fleet</h3>
          <Board cells={opponentBoard} interactive={myTurn} onFire={fire} />
          <div style={{ marginTop: "10px" }}>
            <FleetStatus fleet={opponentFleet} label="Opponent's Ships" />
          </div>
        </div>

        <div>
          <Chat log={chatLog} onSend={sendChat} />
        </div>
      </div>
    </div>
  );
}
