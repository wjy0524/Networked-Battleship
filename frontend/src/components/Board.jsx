// Board.jsx — Renders a 10×10 Battleship grid.
//
// Props:
//   cells        — 2D array (10×10) of cell codes (see App.jsx for the encoding)
//   interactive  — boolean; if true, unknown cells are clickable
//   onFire(r, c) — called when the user clicks an unknown cell

const COLS = ["1","2","3","4","5","6","7","8","9","10"];
const ROWS  = ["A","B","C","D","E","F","G","H","I","J"];

export default function Board({ cells, interactive, onFire }) {
  if (!cells || cells.length === 0) return null;

  // TODO: for each cell, determine the appropriate background color / content:
  //   code 0 + interactive → clickable (blue)
  //   code 0 + not interactive → empty water (dark)
  //   code 1 → ship cell (green)
  //   code 2 → hit (red, show "💥" or similar)
  //   code 3 → miss (grey, show "·" or similar)
  // decide how each cell should look based on its code
    const getCellStyle = (code) => {
      let backgroundColor = "#102027";
      let color = "white";
      let cursor = "default";

      if (code === 0) {
        backgroundColor = interactive ? "#1976d2" : "#102027";
        cursor = interactive ? "pointer" : "default";
      } else if (code === 1) {
        backgroundColor = "#2e7d32";
      } else if (code === 2) {
        backgroundColor = "#c62828";
      } else if (code === 3) {
        backgroundColor = "#757575";
      }

      return {
        width: "36px",
        height: "36px",
        border: "1px solid #263238",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        color,
        cursor,
        fontSize: "16px",
        userSelect: "none",
        boxSizing: "border-box"
      };
    };

    // decide what text/icon should appear in the cell
    const getCellContent = (code) => {
      if (code === 2) return "💥";
      if (code === 3) return "·";
      return "";
    };


  // TODO: render column headers (1–10) across the top
  // TODO: for each row, render a row label (A–J) then 10 cells
  // TODO: attach an onClick handler to each cell that calls onFire(r, c)
  //       only when interactive is true and cells[r][c] === 0

  return (
    <div style={{ display: "inline-block" }}>
      {/* column headers */}
            <div style={{ display: "flex", marginLeft: "36px" }}>
              {COLS.map((col) => (
                <div
                  key={col}
                  style={{
                    width: "36px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#263238",
                    fontWeight: "bold"
                  }}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* board rows */}
            {cells.map((row, r) => (
              <div key={r} style={{ display: "flex" }}>
                {/* row label */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#263238",
                    fontWeight: "bold"
                  }}
                >
                  {ROWS[r]}
                </div>

                {/* cells */}
                {row.map((code, c) => (
                  <div
                    key={`${r}-${c}`}
                    style={getCellStyle(code)}
                    onClick={() => {
                      if (interactive && cells[r][c] === 0) {
                        onFire(r, c);
                      }
                    }}
                  >
                    {getCellContent(code)}
                  </div>
                ))}
              </div>
            ))}
    </div>
  );
}
