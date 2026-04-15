/*
 * Board.java
 *
 * Adapted from Lab 4.  The core shot-firing logic is identical; the
 * text-based display methods have been removed because Lab 5 has no
 * terminal UI.  Two JSON serialization methods have been added for the
 * network protocol.
 *
 * You may reuse your Lab 4 Board implementation directly.  You only
 * need to add the two methods marked TODO below.
 */
public class Board {

    private final int size;
    private final char[][] hiddenBoard;  // actual ship positions
    private final char[][] playerView;   // what the opponent can see (hits/misses)

    public Board(char[][] hiddenBoard) {
        this.size        = hiddenBoard.length;
        this.hiddenBoard = hiddenBoard;
        this.playerView  = new char[size][size];
        for (int r = 0; r < size; r++)
            for (int c = 0; c < size; c++)
                playerView[r][c] = GameConfiguration.WATER;
    }

    /**
     * Fires a shot at (row, col).
     * @return true if hit, false if miss
     * @throws IllegalArgumentException if out of bounds
     * @throws IllegalStateException    if already targeted
     */
    public boolean fireShot(int row, int col) {
        if (row < 0 || row >= size || col < 0 || col >= size)
            throw new IllegalArgumentException("Out of bounds: " + row + "," + col);
        if (playerView[row][col] != GameConfiguration.WATER)
            throw new IllegalStateException("Already targeted: " + row + "," + col);

        if (hiddenBoard[row][col] == GameConfiguration.SHIP) {
            playerView[row][col]  = GameConfiguration.HIT;
            hiddenBoard[row][col] = GameConfiguration.HIT;
            return true;
        }
        playerView[row][col] = GameConfiguration.MISS;
        return false;
    }

    /** Returns true if the cell at (row, col) has already been fired upon. */
    public boolean isTargeted(int row, int col) {
        return playerView[row][col] != GameConfiguration.WATER;
    }

    public int  getSize()                     { return size; }
    public char getPlayerViewCell(int r, int c) { return playerView[r][c]; }

    // -----------------------------------------------------------------------
    // JSON serialization — new for Lab 5
    // -----------------------------------------------------------------------

    /**
     * Returns a JSON 2-D array representing where this player's ships are placed.
     * Encoding: 1 = ship cell, 0 = water.
     *
     * Used in the GAME_START message so the client can draw the player's own fleet.
     *
     * Example output for a 3×3 board with a ship at (0,0) and (0,1):
     *   [[1,1,0],[0,0,0],[0,0,0]]
     *
     * Build the string with a StringBuilder; do not use Arrays.deepToString
     * (it adds spaces that are harder to parse on the client side).
     */
    public String shipLayoutToJson() {
        // TODO: iterate over hiddenBoard; emit 1 if the cell is SHIP or HIT, else 0
        //       (HIT cells were ships, so they should still count as ship cells here)
        //basically send the hidden board but with hits converted to ships and everything else converted to water
        //H6.1 — shipLayoutToJson reports the initial layout. A cell is a "ship cell" if it was ever placed as a ship,
        // even after it has been hit. In hiddenBoard, hit cells are stored as GameConfiguration.HIT (not GameConfiguration.SHIP),
        // so your condition should be cell == SHIP || cell == HIT → emit 1.
        // [
        StringBuilder sb = new StringBuilder("[");

        for(int row = 0; row<size; row++){
            //start the row
            //[[
            sb.append("[");
            //now iterate through the columns
            for(int col = 0; col<size; col++){
                //check if teh cell is a ship cell or not
                //if it is a hit cell, it is still a ship cell for the purposes of this method
                //ex [1,1
                if(hiddenBoard[row][col] == GameConfiguration.HIT || hiddenBoard[row][col] == GameConfiguration.SHIP) {
                    sb.append("1"); // indicates a ship cell
                }else{
                    sb.append("0"); // indicates a water cell
                }
                //[1,1,0
                //I should add , between columns but not after the last column
                if(col < size-1){
                    sb.append(",");
                }
            }
            //[[1,1,0] end the row
            sb.append("]");
            //i should add , between rows but not after the last row
            if(row < size-1){
                sb.append(",");
            }

        }

        //outer ] is added after the loop
        //ex) [[1,1,0],[0,0,0],[0,0,0]]
        sb.append("]");

        //return the string layout of the board
        return sb.toString();
    }

    /**
     * Returns a JSON 2-D array encoding the full revealed state of this board.
     * Used in the GAME_OVER message so both players can see the final board.
     *
     * Encoding:
     *   0 = water (never targeted)
     *   1 = ship cell that was never hit (revealed at game end)
     *   2 = hit
     *   3 = miss
     */
    public String fullStateToJson() {
        // TODO: combine hiddenBoard and playerView to determine the correct code
        //       for each cell, then build the JSON array string
        //H6.2 — fullStateToJson needs both arrays. playerView tells you whether a cell was targeted (HIT or MISS),
        // but not whether an untargeted cell has a ship.
        // hiddenBoard tells you where ships are. Consult both to decide the code for each cell.
        // need both for hidden and player view to determine the correct code for each cell.
        // If playerView is WATER, then it's either 0 or 1 depending on hiddenBoard.
        // If playerView is HIT, then it's 2.
        // If playerView is MISS, then it's 3.
        // same start with string builder [
        StringBuilder sb = new StringBuilder("[");

        for(int row =0; row<size; row++) {
            //start the row
            sb.append("[");
            //iterate through the columns
            for (int col = 0; col < size; col++) {
                //encoded num for the cell: 0 or 1 depends on whether it's a ship cell or water, 2 if it's a hit, 3 if it's a miss
                int encodedNum;
                if(playerView[row][col] == GameConfiguration.WATER){
                    //if it's water, it could be 0 or 1 depending on whether it's a ship cell or not
                    if(hiddenBoard[row][col] == GameConfiguration.SHIP){
                        encodedNum = 1; //ship cell that was never hit
                    }else{
                        //water that wasn't targeted before
                        encodedNum = 0;
                    }
                }else if(playerView[row][col] == GameConfiguration.HIT){
                    encodedNum = 2;
                }else{
                    //if the player view is miss
                    encodedNum = 3;
                }
                //append the encoded num to the string builder
                sb.append(encodedNum);

                // add comma between columns but no after the last one
                if (col < size - 1) {
                    sb.append(",");
                }

            }
            // end the row
            sb.append("]");

            // add comma between rows, but not after the last one
            if (row < size - 1) {
                sb.append(",");
            }
        }
        //end the outer array
        sb.append("]");

        //return the string layout of the board of the full state
        return sb.toString();
    }
}
