// FleetStatus.jsx — Displays the status of each ship in a fleet.
//
// Props:
//   fleet  — array of { name, size, sunk } objects
//   label  — string heading (e.g. "My Ships" or "Opponent's Ships")

export default function FleetStatus({ fleet, label }) {
  if (!fleet) return null;

  // TODO: render the label as a heading
  // TODO: for each ship, render:
  //   - a row of "pip" squares (one per ship cell) colored to indicate sunk vs intact
  //   - the ship name and size
  //   - a "SUNK" badge when ship.sunk is true
  //   - a strikethrough style on the name when sunk
    //this CSS layout boilerplate part was helped with CHATGPT
  return (
      <div
        style={{
          border: "1px solid #cfd8dc",
          borderRadius: "6px",
          padding: "10px",
          marginTop: "10px",
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: "10px" }}>{label}</h4>

        {fleet.map((ship) => (
          <div key={ship.name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            {/* generate pip squares based on ship size*/}
            {/* create an array of length ship.size and map over it to render pip squares. I learned this pattern with the help of CHATGPT*/ }
            {Array.from({ length: ship.size }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: ship.sunk ? "#d32f2f" : "#388e3c",
                  border: "1px solid #455a64"
                }}
              />
            ))}
            <span style={{ textDecoration: ship.sunk ? "line-through" : "none", color: ship.sunk ? "#757575" : "#263238" }}>
              {ship.name} ({ship.size})
            </span>
            {ship.sunk && <span style={{ color: "#d32f2f", fontWeight: "bold" }}>SUNK</span>}
          </div>
        ))}
      </div>
    );
  }