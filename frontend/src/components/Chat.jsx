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
  // auto-scroll to the newest message whenever log changes
   useEffect(() => {
       if (bottomRef.current) {
           bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
   }, [log]);

  const submit = () => {
    // TODO: call onSend with the trimmed input, then clear the input field
    //       do nothing if the trimmed string is empty
    const trimmed = input.trim();

        // do nothing if the message is empty after trimming
        if (!trimmed) return;

        // send the message to the parent component
        onSend(trimmed);

        // clear the input box
        setInput("");
  };

  // TODO: render:
  //   - a scrollable list of messages (from, time, text)
  //   - a text input that calls submit() on Enter key
  //   - a Send button that calls submit() on click

  //return (
    //<div>
      //<h3>💬 Chat</h3>
      //{/* TODO */}
      //<p style={{ color: "#546e7a", fontSize: 13 }}>Chat not yet implemented</p>
    //</div>
    return (
        <div
          style={{
            width: "320px",
            border: "1px solid #cfd8dc",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "#fafafa"
          }}
        >
          <h3 style={{ marginTop: 0 }}>💬 Chat</h3>

          {/* scrollable chat log */}
          <div
            style={{
              height: "260px",
              overflowY: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              padding: "8px",
              backgroundColor: "white",
              marginBottom: "10px"
            }}
          >
            {log && log.length > 0 ? (
              log.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: "10px",
                    paddingBottom: "6px",
                    borderBottom: "1px solid #f0f0f0"
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#546e7a", marginBottom: "2px" }}>
                    <strong>{msg.from}</strong>
                    {msg.time ? ` • ${msg.time}` : ""}
                  </div>
                  <div style={{ fontSize: "14px", color: "#263238" }}>
                    {msg.text}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#546e7a", fontSize: 13 }}>No messages yet.</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* input row */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={input}
              placeholder="Type a message..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submit();
                }
              }}
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #b0bec5",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            />

            <button
              onClick={submit}
              style={{
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#1976d2",
                color: "white",
                cursor: "pointer"
              }}
            >
              Send
            </button>
          </div>
        </div>
      );
    }

