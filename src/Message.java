/*
 * Message.java
 *
 * Represents a single protocol message.  All messages share a "type" field;
 * additional fields are present or absent depending on the type.
 *
 * You must implement:
 *   - parse(String json)          — client-to-server message parsing
 *   - JSON builder methods        — server-to-client message construction
 *
 * No external JSON library is permitted.  Use String methods only.
 */

/**
 * Represents a single protocol message between the server and client.  All messages share a "type" field;
 * additional fields are present or absent depending on the type.
 */
public class Message {

    // -----------------------------------------------------------------------
    // Fields — not every field is present in every message type.
    // Absent numeric fields should default to -1; absent strings to null.
    // -----------------------------------------------------------------------

    public String type;
    public int    row  = -1;
    public int    col  = -1;
    public String text = null;
    public String name = null;

    // -----------------------------------------------------------------------
    // Parsing
    // -----------------------------------------------------------------------

    /**
     * Parses a JSON string received from a client into a Message.
     *
     * At minimum, handle the types a client can send:
     *   READY  — may include a "name" field
     *   FIRE   — includes "row" and "col" (integers)
     *   CHAT   — includes "text"
     *
     * If the string cannot be parsed, return a Message whose type is "UNKNOWN".
     *
     * @param json the raw JSON string from a WebSocket frame
     * @return a populated Message object
     */
    public static Message parse(String json) {
        // TODO: extract "type" from json; set m.type
        // TODO: extract "row", "col", "text", "name" as appropriate for each type
        // Hint: write a private helper that extracts the value for a named key
        //       from a flat JSON object string.
        //create a new message object where a JSON string is parsed
        Message mes = new Message();
        //extract the type of the message such as READY, FIRE, or CHAT
        //depending on the type, extract the other fields such as row, col, text, and name
        //if the type is not recognized, set the type to UNKNOWN
        try{
            //extract the type of the message from JSON string
            String type = extractValue(json, "type");
            //if the type is null, return a Message whose type is unknown
            if(type == null){
                mes.type = "UNKNOWN";
                return mes;
            }
            //set type of the message
            mes.type = type;
            //if type is READY
            if(type.equals("READY")){
                //extract the name field
                mes.name = extractValue(json, "name");
            //if type is  FIRE
            }else if(type.equals("FIRE")){
                //extract the row and col fields and parse them as integers
                String row = extractValue(json, "row");
                String col = extractValue(json, "col");
                if(row != null){
                    // if the row is not null, parse it as an integer
                    mes.row = Integer.parseInt(row);
                }
                if(col != null){
                    //if col is not null, parse it as an integer
                    mes.col = Integer.parseInt(col);
                }
            //if type is CHAT
            }else if(type.equals("CHAT")){
                //extract the text field
                mes.text = extractValue(json, "text");
            }else{
                //If type is none of the above, set the type to UNKNOWN
                mes.type = "UNKNOWN";
            }

        }catch (Exception e){
            //If the string cannot be parsed, return a Message whose type is "UNKNOWN".
            mes.type = "UNKNOWN";
        }
        //return the message object
        return mes;

    }
    // Hint: write a private helper that extracts the value for a named key
    //       from a flat JSON object string.
    private static String extractValue(String json, String key){
        //find the index of the key in the JSON string
        int idxOfKey = json.indexOf("\"" + key + "\"");
        //if there's no key, return null
        //absent numeric fields default to -1
        if(idxOfKey == -1){
            return null;
        }
        //find the index of the colon // "type":"FIRE"
        //indexOf("a", b) meaning find the index of "a" starting from index b
        int idxOfColon = json.indexOf(":", idxOfKey);

        //if there's no colon, return null
        if(idxOfColon == -1){
            return null;
        }

        //idxOfValue is the index of teh first char of the value
        int idxOfValue = idxOfColon + 1;

        //since there could be spaces between the colon and the value, we need to skip them
        //I learned the method Character.isWhitespace() to check if a char is a whitespace character from Google Search
        //so until it reaches the first non whitespace char, keep incrementing the index
        while(idxOfValue<json.length() && Character.isWhitespace(json.charAt(idxOfValue))){
            //increments the index until it reaches the first non whitespace char
            idxOfValue++;
        }

        // Distinguish quoted strings from unquoted values. from HINTS.md
        //quoted string as value
        if(json.charAt(idxOfValue) == '"'){
            idxOfValue++;
            //use the stringbuilder to build the value string, and handle escaped chars from HINTs.md
            StringBuilder sb = new StringBuilder();
            //boolean to keep track of whether the previous char was a backslash, which indicates an escape sequence
            boolean escapeFlag = false;

            //iterate through the characters s until we reach the closing quote
            for(int i = idxOfValue; i<json.length(); i++){
                char c = json.charAt(i);
                //if the escape is true, meaning the previous char was a backslash, we need to handle the escape sequence
                if(escapeFlag){
                    sb.append(c);
                    escapeFlag = false;
                }else if(c == '\\') {
                    //if the current char is a backslash, skip it and set flag as true
                    escapeFlag = true;
                }else if(c == '"') {
                    //if the current char is a closing quote, it means that it's the end of the value so done return sb.toString()
                    return sb.toString();
                }else{
                    // if it's a normal char, then just append it
                    sb.append(c);
                }

            }
            //it there is no closing quote, then return null
            return null;
        }
        //now for unquoted val, we should find the end of the value, which is either a comma or a closing brace.
        //Then since we know the start and end index of the value
        //we can extract the value using substring
        int idxOfEnd = idxOfValue;
        while(idxOfEnd<json.length() && json.charAt(idxOfEnd) != ',' && json.charAt(idxOfEnd) != '}' && !Character.isWhitespace(json.charAt(idxOfEnd))){
            //increments the index until it reaches the end of the value
            idxOfEnd++;
        }
        //now we have the start and end index of the value and use trim to delete the whitespace around the value
        String val = json.substring(idxOfValue, idxOfEnd).trim();
        // if the value is null, then it should return null
        if(val.equals("null")){
            return null;
        }else{
            return val;
        }


    }

    // -----------------------------------------------------------------------
    // JSON builders  (server → client)
    //
    // Each method returns a JSON string ready to hand to WriterThread.send().
    // Field names must exactly match the protocol table in the README.
    // -----------------------------------------------------------------------

    /** {"type":"ASSIGN","playerNumber": [n]} */
    public static String assignJson(int playerNumber) {
        return "{\"type\":\"ASSIGN\",\"playerNumber\":" + playerNumber + "}";
    }

    /** {"type":"WAITING"} */
    public static String waitingJson() {
        return "{\"type\":\"WAITING\"}";
    }

    /**
     * {"type":"GAME_START","myBoard":[2d array],"turn":[n]}
     *
     * @param myBoardJson the JSON array string returned by Board.shipLayoutToJson()
     * @param turn        1 or 2 — which player moves first
     */
    public static String gameStartJson(String myBoardJson, int turn) {
        return "{\"type\":\"GAME_START\",\"myBoard\":" + myBoardJson + ",\"turn\":" + turn + "}";
    }

    /**
     * {"type":"SHOT_RESULT","shooter":[n],"row":[r],"col":[c],
     *  "hit":[bool],"sunkShip":[name or null]}
     */
    public static String shotResultJson(int shooter, int row, int col,  boolean hit, String sunkShip) {
        String sunkShipJson;

        if(sunkShip == null){
            //if the sunk Ship is null, then the sunkShipJson should be null
            sunkShipJson = "null";
        }else{
            sunkShipJson = "\"" + escapeJson(sunkShip) + "\"";
        }
        return "{\"type\":\"SHOT_RESULT\",\"shooter\":" + shooter  + ",\"row\":" + row + ",\"col\":" + col + ",\"hit\":" + hit + ",\"sunkShip\":" + sunkShipJson + "}";

    }

    /** {"type":"TURN_CHANGE","turn":[n]} */
    public static String turnChangeJson(int turn) {
        return "{\"type\":\"TURN_CHANGE\",\"turn\":" + turn + "}";
    }

    /** {"type":"CHAT","from":"[from]","text":"[text]"} */
    public static String chatJson(String from, String text) {
        return "{\"type\":\"CHAT\",\"from\":\"" + escapeJson(from) + "\",\"text\":\"" + escapeJson(text) + "\"}";
    }

    /**
     * {"type":"GAME_OVER","winner":[n],"finalBoard":[2d array]}
     *
     * @param finalBoardJson the JSON array string returned by Board.fullStateToJson()
     */
    public static String gameOverJson(int winner, String finalBoardJson) {
        return "{\"type\":\"GAME_OVER\",\"winner\":" + winner + ",\"finalBoard\":" + finalBoardJson + "}";
    }

    /** {"type":"OPPONENT_DISCONNECTED"} */
    public static String opponentDisconnectedJson() {
        return "{\"type\":\"OPPONENT_DISCONNECTED\"}";
    }

    /** {"type":"ERROR","message":"[msg]"} */
    public static String errorJson(String msg) {
        return "{\"type\":\"ERROR\",\"message\":\"" + escapeJson(msg) + "\"}";
    }
    //I learned and understood JSON string escaping, and implemented a helper method escapeJSON
    // example: if the input string is He said "Hello", then the output should be He said \"Hello\". If the input string is C:\Users\John, then the output should be C:\\Users\\John
    private static String escapeJson(String s){
        if(s == null){
            return "";
        }
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

}
