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

    return (
        <div
          style={{
            border: "1px solid #cfd8dc",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "#fafafa",
            minWidth: "240px"
          }}
        >
          {/* heading label */}
          <h4 style={{ marginTop: 0, marginBottom: "12px" }}>{label}</h4>

          {/* render each ship */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {fleet.map((ship, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  backgroundColor: "white"
                }}
              >
                {/* top row: name/size + sunk badge */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px"
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      textDecoration: ship.sunk ? "line-through" : "none",
                      color: ship.sunk ? "#757575" : "#263238"
                    }}
                  >
                    {ship.name} ({ship.size})
                  </span>

                  {ship.sunk && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "white",
                        backgroundColor: "#c62828",
                        borderRadius: "12px",
                        padding: "2px 8px"
                      }}
                    >
                      SUNK
                    </span>
                  )}
                </div>

                {/* pip squares */}
                <div style={{ display: "flex", gap: "4px" }}>
                  {Array.from({ length: ship.size }).map((_, pipIdx) => (
                    <div
                      key={pipIdx}
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "3px",
                        backgroundColor: ship.sunk ? "#c62828" : "#2e7d32",
                        border: "1px solid #455a64"
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  //return (
    //<div>
      //<h4>{label}</h4>
      //{/* TODO */}
      //<p style={{ color: "#546e7a", fontSize: 12 }}>Fleet status not yet implemented</p>
    //</div>
  //);
//}
