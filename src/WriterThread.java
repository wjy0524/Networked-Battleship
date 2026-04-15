/*
 * WriterThread.java
 *
 * One instance per connected client.  Its only job is to drain a
 * LinkedBlockingQueue<String> and write each entry to the client's
 * OutputStream as a WebSocket frame.
 *
 * Having a single dedicated writer thread per client guarantees that
 * WebSocketUtil.writeFrame is never called concurrently on the same
 * OutputStream, which would corrupt the frame stream.
 *
 * Any other thread that wants to send a message to this client calls
 * send(String json), which enqueues the message without blocking.
 *
 * Shutdown is signalled by placing POISON_PILL in the queue.
 */
/**
 * Dedicated writer thread for a single client connection.
 * Drains a LinkedBlockingQueue<String> and writes each entry to the client's
 * OutputStream as a WebSocket frame.
 */

import java.io.IOException;
import java.io.OutputStream;
import java.net.Socket;
import java.util.concurrent.LinkedBlockingQueue;

public class WriterThread extends Thread {

    /** Sentinel that tells this thread to close the socket and exit. */
    public static final String POISON_PILL = "\u0000SHUTDOWN\u0000";

    private final LinkedBlockingQueue<String> outbox;
    private final OutputStream out;
    private final Socket socket;

    /**
     * @param outbox the queue this thread drains
     * @param out    the raw OutputStream belonging to the client's Socket
     * @param socket the Socket — closed when this thread exits
     */
    public WriterThread(LinkedBlockingQueue<String> outbox,
                        OutputStream out, Socket socket) {
        this.outbox = outbox;
        this.out    = out;
        this.socket = socket;
        setDaemon(true);
    }

    /**
     * take messages from outbox and write them to the client as WebSocket frames until we get the POISON_PILL,
     * then close the socket and exit.
     */
    @Override
    public void run() {
        // TODO: loop, taking messages from outbox with outbox.take()
        // TODO: exit the loop when the message is POISON_PILL
        //       (use reference equality: msg == POISON_PILL)
        // TODO: for each non-sentinel message, call WebSocketUtil.writeFrame(out, msg)
        //       catch IOException and break the loop if the client disconnected mid-write
        // TODO: in a finally block, close the socket
        // TODO: catch InterruptedException, restore the interrupt flag, and exit
        try{
            //keep taking messages from the outbox until we get the POISON_PILL
            while(true){
                //take a message from the outbox
                String message = outbox.take();
                //exit the loop when the message is POISON_PILL
                //(use reference equality: msg == POISON_PILL)
                if(message == POISON_PILL){
                    break;
                }

                try{
                    //call WebSocketUtil.writeFrame(out, msg)
                    WebSocketUtil.writeFrame(out, message);
                }catch(IOException e){
                    //catch IOException and break the loop if the client disconnected mid-write
                    //since if the writing fails, clinet likely disconnected, so we should stop trying to write to it
                    break;
                }

            }
        }catch (InterruptedException e){
            //catch InterruptedException, restore the interrupt flag, and exit
            //if the thread is interruptedm while waiting for a message, we should stop waiting and exit the thread
            Thread.currentThread().interrupt();

        }finally{ //in a finally block, close the socket
            try{
                //clsoe the socket when the threads end so that other thread waiting on the socket can detect that the client has disconnected
                //and try conneccting
                socket.close();
            }catch (IOException e){

            }
        }
    }

    /**
     * Enqueues a JSON string for delivery to this client.
     * Safe to call from any thread at any time.
     */
    public void send(String json) {
        // TODO: add json to outbox (use offer — the queue is unbounded)
        //use offer
        outbox.offer(json);
    }

    /**
     * Signals this thread to stop after delivering any already-queued messages.
     * Returns immediately without waiting for the thread to exit.
     */
    public void shutdown() {
        // TODO: enqueue POISON_PILL
        //enqueue using offer since the queue is unbounded, so it will never block
        //enqueue POISON_PILL to signal the thread to stop
        outbox.offer(POISON_PILL);
    }
}
