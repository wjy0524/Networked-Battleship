/*
 * ClientHandler.java
 *
 * One instance per connected client.  Runs on its own Thread.
 *
 * Responsibilities (in order):
 *   1. Perform the WebSocket handshake on the raw OutputStream.
 *   2. Once the handshake is complete, call server.sendAssign() — it is only
 *      safe to write WebSocket frames after the 101 response has been sent.
 *   3. Loop reading WebSocket frames, parse each into a Message, and forward
 *      to GameServer.handleMessage().
 *   4. On disconnect or I/O error, notify GameServer.handleDisconnect().
 */

import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;

public class ClientHandler extends Thread {

    private final Socket     socket;
    private final int        playerNum;   // 1 or 2
    private final GameServer server;

    public ClientHandler(Socket socket, int playerNum, GameServer server) {
        this.socket    = socket;
        this.playerNum = playerNum;
        this.server    = server;
        setDaemon(true);
    }

    @Override
    public void run() {
        try {
            InputStream in = socket.getInputStream();

            // TODO: perform the WebSocket handshake
            //       (one call to WebSocketUtil — pass both the InputStream and
            //        the socket's OutputStream)
            //perform the WebSocket handshake
            //pass in and socket.getOutputStream() to the handshake method
            WebSocketUtil.handshake(in, socket.getOutputStream());

            // TODO: after the handshake returns, call server.sendAssign(playerNum)
            //       This is the earliest point at which it is safe to write
            //       WebSocket frames — the HTTP upgrade response is now complete.

            //after the handshake returns, safe to call server.sendAssign(playerNum) (ASSIGN signal)
            server.sendAssign(playerNum);

            // TODO: log that player playerNum has connected
            System.out.println("Player " + playerNum + " has connected to the server.");

            // TODO: read loop
            //   - call WebSocketUtil.readFrame(in)
            //   - if the result is null, break (client disconnected gracefully)
            //   - parse the frame string into a Message
            //   - forward to server.handleMessage(playerNum, msg)
            //keep reading frames until the client disconnects gracefully
            while(true){
                //call WebSocketUtil.readFrame(in)
                String frame = WebSocketUtil.readFrame(in);

                //if the result is null, break (client disconnected gracefully)
                if(frame == null){
                    break;
                }

                //parse the frame string into a Message
                Message msg = Message.parse(frame);

                //forward to server.handleMessage(playerNum, msg)
                server.handleMessage(playerNum, msg);
            }


        } catch (IOException e) {
            // TODO: log the I/O error
            System.err.println("Player " + playerNum + " I/O error: " + e.getMessage());
        } finally {
            // TODO: log that player playerNum has disconnected
            System.out.println("Player " + playerNum + " has disconnected from the server.");
            // TODO: call server.handleDisconnect(playerNum)
            //basically notify the server that this player has gone
            server.handleDisconnect(playerNum);

        }
    }
}
