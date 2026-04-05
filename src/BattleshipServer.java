/*
 * BattleshipServer.java
 *
 * Entry point.  Accepts exactly two client connections, wires up all
 * objects, starts all threads, and waits for the game to finish.
 *
 * Usage:
 *   java BattleshipServer          (default port 8080)
 *   java BattleshipServer 9090     (custom port)
 *
 * Important — do NOT pre-queue ASSIGN messages here.
 * ASSIGN is sent from inside ClientHandler, immediately after the WebSocket
 * handshake completes.  Sending it earlier risks writing a WebSocket frame
 * before the HTTP 101 upgrade response is finished, which corrupts the
 * connection and causes the browser to disconnect immediately.
 */

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.LinkedBlockingQueue;

public class BattleshipServer {

    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) throws IOException {
        // TODO: parse port from args[0] if present, fall back to DEFAULT_PORT
        int port = DEFAULT_PORT;
        //if theere is at least one argument, try to parse it as an integer and use it as the port
        if (args.length >= 1) {
            port = Integer.parseInt(args[0]);
        }

        // TODO: create a ServerSocket on the chosen port (try-with-resources)
        try (ServerSocket servSocket = new ServerSocket(port)) {
            // TODO: print a startup message
            System.out.println("BattleshipServer] starting on port " + port + ". Waiting for players to connect...");

            // TODO: call serverSocket.accept() to get player 1's Socket
            // TODO: call serverSocket.accept() again to get player 2's Socket
            Socket player1Socket = servSocket.accept();
            Socket player2Socket = servSocket.accept();

            // TODO: create a LinkedBlockingQueue<String> for each player's outbox
            LinkedBlockingQueue<String> player1Outbox = new LinkedBlockingQueue<>();
            LinkedBlockingQueue<String> player2Outbox = new LinkedBlockingQueue<>();

            // TODO: create a WriterThread for each player
            WriterThread player1Writer = new WriterThread(player1Outbox, player1Socket.getOutputStream(), player1Socket);
            WriterThread player2Writer = new WriterThread(player2Outbox, player2Socket.getOutputStream(), player2Socket);

            // TODO: create the shared GameServer
            GameServer gameServer = new GameServer(player1Socket, player2Socket, player1Writer, player2Writer);

            // TODO: create a ClientHandler for each player
            ClientHandler player1Handler = new ClientHandler(player1Socket, 1, gameServer);
            ClientHandler player2Handler = new ClientHandler(player2Socket, 2, gameServer);

            // TODO: start both WriterThreads first (so they are ready to drain
            //       outboxes as soon as ClientHandlers start enqueuing post-handshake)
            player1Writer.start();
            player2Writer.start();
            // TODO: then start both ClientHandlers
            player1Handler.start();
            player2Handler.start();

            // TODO: join both ClientHandler threads so main() waits for the game to end
            player1Handler.join();
            player2Handler.join();

            // TODO: print a shutdown message
            System.out.println("BattleshipServer] game has ended. Shutting down.");

        } catch (InterruptedException e) {
            // catch InterruptedException from the join() calls
            //afeter restoring the interrupt flag, exit the main method to allow the server to shut down
            Thread.currentThread().interrupt();
        }
    }
}
