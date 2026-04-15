// Chat.jsx — In-game chat panel.
//
// Props:
//   log            — array of { from, text, time } objects (newest last)
//   onSend(text)   — called when the user submits a message

import { useState, useRef, useEffect } from "react";

export default function Chat({ log, onSend }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // TODO: use a useEffect to auto-scroll to bottomRef whenever log changes
  useEffect(() => {bottomRef.current?.scrollIntoView({ behavior: "smooth" });}, [log]);

  const submit = () => {
    // TODO: call onSend with the trimmed input, then clear the input field
    //       do nothing if the trimmed string is empty
    //remove whitespace from both ends of the input
    const trimmedInput = input.trim();
    //do nothing if the trimmed string is empty
    if(trimmedInput.length === 0) return;
    //call onSend with the trimmed input
    onSend(trimmedInput);
    //clear the input field
    setInput("");
  };

  // TODO: render:
  //   - a scrollable list of messages (from, time, text)
  //   - a text input that calls submit() on Enter key
  //   - a Send button that calls submit() on click
  //this CSS layout boilerplate part was helped with CHATGPT
  return (
      <div
        style={{
          width: "260px",
          border: "1px solid #cfd8dc",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          height: "400px"
        }}
      >
        <h3 style={{ margin: "8px" }}>💬 Chat</h3>

        {/* message list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
            fontSize: "12px"
          }}
        >
          {log.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: "6px" }}>
              <div style={{ color: "#546e7a" }}>
                {msg.from} • {msg.time}
              </div>
              <div>{msg.text}</div>
            </div>
          ))}

          {/* scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* input + button */}
        <div style={{ display: "flex", borderTop: "1px solid #cfd8dc" }}>
          <input
            style={{
              flex: 1,
              border: "none",
              padding: "6px",
              outline: "none"
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Type message..."
          />

          <button
            onClick={submit}
            style={{
              border: "none",
              background: "#1976d2",
              color: "white",
              padding: "6px 10px",
              cursor: "pointer"
            }}
          >
            Send
          </button>
        </div>
      </div>
    );
  }
