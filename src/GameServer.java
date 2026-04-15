/*
 * GameServer.java
 *
 * Holds all authoritative game state and processes messages from both
 * ClientHandler threads.
 *
 * Thread-safety requirement:
 *   handleMessage() is called from two different threads simultaneously.
 *   You must ensure reads and writes to shared state (boards, fleets, turn,
 *   phase, readyCount) are properly synchronized.
 *
 * I/O rule:
 *   Never hold a lock while calling WebSocketUtil.writeFrame or any blocking
 *   I/O.  Enqueue outbound messages via WriterThread.send() instead — it
 *   returns immediately.
 *
 * Chat rule:
 *   CHAT messages must reach clients without being delayed by ongoing
 *   game-logic processing.  Handle CHAT before acquiring any lock.
 *
 * ASSIGN timing:
 *   sendAssign() is called from ClientHandler immediately after the WebSocket
 *   handshake completes.  It must NOT be called before the handshake, because
 *   WriterThread and ClientHandler share the same OutputStream — writing a
 *   WebSocket frame before the HTTP 101 response is sent corrupts the upgrade
 *   and causes the browser to close the connection.
 */
/**
 * GameServer holds all game states and processes messages from both ClientHandler threads.
 * Since handleMessage() is synchronized to protect shared state, it is thread safe.
 */

import java.net.Socket;
import java.util.concurrent.LinkedBlockingQueue;

public class GameServer {

    private static final int PHASE_WAITING = 0;
    private static final int PHASE_PLAYING = 1;
    private static final int PHASE_DONE    = 2;

    private final Board[]        boards  = new Board[2];
    private final Fleet[]        fleets  = new Fleet[2];
    private final WriterThread[] writers = new WriterThread[2];
    private final String[]       names   = {"Player 1", "Player 2"};
    private final Socket[]       sockets;

    private int phase      = PHASE_WAITING;
    private int turn       = 1;
    private int readyCount = 0;

    /**
     * constructs a GameServer that will be shared with given sockets and writer threads for both players.
     * @param s1 the Socket for player 1
     * @param s2 the Socket for player 2
     * @param w1 the WriterThread for player 1
     * @param w2 the WriterThread for player 2
     */
    public GameServer(Socket s1, Socket s2, WriterThread w1, WriterThread w2) {
        sockets    = new Socket[]{s1, s2};
        writers[0] = w1;
        writers[1] = w2;
    }

    // -----------------------------------------------------------------------
    // Called by ClientHandler immediately after handshake() returns
    // -----------------------------------------------------------------------

    /**
     * Sends ASSIGN (and WAITING for player 1) to the given player.
     * Safe to call without the game-logic lock — only touches per-player
     * outboxes, which are already thread-safe.
     *
     * Must only be called after WebSocketUtil.handshake() has returned for
     * this player's socket.
     */
    public void sendAssign(int playerNum) {
        // TODO: send ASSIGN to this player via their WriterThread
        // TODO: if playerNum == 1, also send WAITING
        //player is either 1 or 2, so we can use playerNum - 1 as the index into the writers array
        writers[playerNum - 1].send(Message.assignJson(playerNum));
        //if playerNum == 1, also send WAITING
        if(playerNum == 1){
            //if the playerNUm is 1, we want to send the waiting message to player 1, which is at index 0 in the writers array
            writers[0].send(Message.waitingJson());
        }

    }

    // -----------------------------------------------------------------------
    // Called by ClientHandler threads
    // -----------------------------------------------------------------------

    /**
     * Processes one message from the given player.
     *
     * Handle CHAT outside any lock — forward it to both clients immediately.
     * For all other types, synchronize on 'this' and dispatch on msg.type:
     *   "READY" → handleReady
     *   "FIRE"  → handleFire
     *   anything else → send ERROR back to the sender
     */
    public void handleMessage(int playerNum, Message msg) {
        // TODO: handle CHAT outside any lock
        // TODO: for all other types, synchronize and dispatch
        //if msg is null, we should ignore it since it is not a valid message
        if(msg == null) return;

        // handle CHAT outside any lock
        if("CHAT".equals(msg.type)){
            //if the message type is CHAT, we want to tell the message to both players immediately without acquiring any lock
            String sender = names[playerNum - 1];
            //if the text message is null, treat it as empty string
            broadcast(Message.chatJson(sender, msg.text == null ? "" : msg.text));
            return;
        }

        //for all other types, synchronize and dispatch
        synchronized(this){
            if("READY".equals(msg.type)){
                //if the message type is READY,call handleReady while holding the lock
                handleReady(playerNum, msg);
            }else if("FIRE".equals(msg.type)) {
                //if the message type is FIRE, call handleFire while holding the lock
                handleFire(playerNum, msg);
            }else{
                //anything else, send ERROR back to the sender
                writers[playerNum - 1].send(Message.errorJson("Error: unknown message type."));
            }
        }

    }

    /**
     * Called when a client disconnects or throws an IOException.
     * Notifies the other player and initiates shutdown.
     * Must be idempotent — safe to call twice if both sockets close at once.
     */
    public void handleDisconnect(int playerNum) {
        // TODO: guard against double-call (check/set phase under lock)
        // TODO: send OPPONENT_DISCONNECTED to the other player
        // TODO: call shutdown()
        synchronized (this){
            //guard against double call (check/set phase under lock)
            if(phase == PHASE_DONE){
                //if phase is already called, we should not do anything since the game is already over
                return;
            }

            //now since we did it, check it as done
            phase = PHASE_DONE;

            //send OPPONENT_DISCONNECTED to the other player
            int otherPlayerNum;
            if(playerNum == 1){
                otherPlayerNum = 2;
            }else {
                otherPlayerNum = 1;
            }

            //send OPPONENT_DISCONNECTED to the other player
            writers[otherPlayerNum - 1].send(Message.opponentDisconnectedJson());

            //call shutdown
            shutdown();
        }
    }

    // -----------------------------------------------------------------------
    // Private message handlers — call only while holding synchronized(this)
    // -----------------------------------------------------------------------

    private void handleReady(int playerNum, Message msg) {
        // TODO: store display name if msg.name is non-blank
        if(msg.name != null && !msg.name.isBlank()){
            //if the message name is non blank(or null), we should store it
            names[playerNum - 1] = msg.name;
        }
        // TODO: increment readyCount; return early if readyCount < 2
        readyCount++;
        //return early if readyCount <2
        if(readyCount < 2){
            return;
        }
        // TODO: when both ready: set phase/turn, generate placements for both
        //       players, construct Board and Fleet for each, send GAME_START
        //       to each player with their own board layout and the starting turn
        //when both ready
        //set phase/turn
        phase = PHASE_PLAYING;
        turn = 1;

        //generate placements for both players
        ShipPlacementGenerator.ShipPlacements fPlacement = ShipPlacementGenerator.getInstance().generatePlacements(null, false);
        ShipPlacementGenerator.ShipPlacements sPlacement = ShipPlacementGenerator.getInstance().generatePlacements(null, false);

        //construct Board and Fleet for each
        //board and fleet for 1st placement
        boards[0] = new Board(fPlacement.board);
        fleets[0] = new Fleet(fPlacement.shipRows, fPlacement.shipCols);
        //board and fleet for 2nd placement
        boards[1] = new Board(sPlacement.board);
        fleets[1] = new Fleet(sPlacement.shipRows, sPlacement.shipCols);

        //send GAME_START to each player with their own board layout and the starting turn
        //send GAME_START to player 1
        writers[0].send(Message.gameStartJson(boards[0].shipLayoutToJson(), turn));
        //send GAME_START to player 2
        writers[1].send(Message.gameStartJson(boards[1].shipLayoutToJson(), turn));

    }

    private void handleFire(int playerNum, Message msg) {
        // TODO: reject if phase != PHASE_PLAYING (send ERROR)
        if(phase != PHASE_PLAYING){
            //send error
            writers[playerNum - 1].send(Message.errorJson("Error: game is not in playing phase."));
            return;
        }

        // TODO: reject if playerNum != turn (send ERROR — do not advance turn)
        if(playerNum != turn){
            //send error
            writers[playerNum - 1].send(Message.errorJson("Error: it is not your turn."));
            return;
        }

        // TODO: validate row and col are in [0, BOARD_SIZE)
        int row = msg.row;
        int col = msg.col;

        if(row < 0 || row >= GameConfiguration.BOARD_SIZE || col < 0 || col >= GameConfiguration.BOARD_SIZE){
            //send error
            writers[playerNum - 1].send(Message.errorJson("Error: invalid row or column."));
            return;
        }

        // TODO: reject if the target cell is already targeted (send ERROR)
        // the defender is the other player
        int defenderNum;
        if(playerNum == 1){
            defenderNum = 2;
        }else{
            defenderNum = 1;
        }
        //defender's board and fleet
        Board defendBoard = boards[defenderNum - 1];

        //reject if the target cell is already targeted (send ERROR)
        if(defendBoard.isTargeted(row, col)){
            //send error
            writers[playerNum - 1].send(Message.errorJson("Error: cell is already targeted."));
            return;
        }
        // TODO: fire the shot on the defender's board
        Fleet defendFleet = fleets[defenderNum - 1];
        // TODO: if hit, register the hit on the defender's fleet
        boolean isHit = defendBoard.fireShot(row, col);
        String sunkShipName = null;
        if(isHit){
            //if hit, register the hit on the defender's fleet
            sunkShipName = defendFleet.registerHit(row, col);
        }
        // TODO: broadcast SHOT_RESULT to both players
        broadcast(Message.shotResultJson(playerNum, row, col, isHit, sunkShipName));
        // TODO: if all defender ships sunk: set phase = PHASE_DONE,
        //       broadcast GAME_OVER with the defender's final board, call shutdown()
        if(defendFleet.allSunk()){
            //phase is done meaning over
            phase = PHASE_DONE;

            //broadcast GAME_OVER with the defender's final board
            broadcast(Message.gameOverJson(playerNum, defendBoard.fullStateToJson()));

            //call shutdown
            shutdown();
            return;
        }
        // TODO: advance turn and broadcast TURN_CHANGE
        //advance turn
        turn = defenderNum;
        // broadcast TURN_CHANGE
        broadcast(Message.turnChangeJson(turn));

    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Enqueues json in both clients' outboxes. */
    private void broadcast(String json) {
        // TODO
        //enqueue json in both clients' outboxes
        writers[0].send(json);
        writers[1].send(json);
    }

    /** Signals both WriterThreads to flush and exit. */
    private void shutdown() {
        // TODO
        writers[0].shutdown();
        writers[1].shutdown();
        //since in the writer threads, we close the socket when the thread ends,
        //so we don't have to worry about closing the socket here,
        //since the other thread waiting on the socket will detect that the client has disconnected and try connecting
    }
}
