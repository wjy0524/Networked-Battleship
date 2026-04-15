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
  //determine the appropriate background color / content:
  //this CSS layout boilerplate part was helped with CHATGPT
  const cellStyles = (code) => {
      let backgroundColor = "#102027"; //(dark water) got all colors' RGB with the help of gpt
      let cursor = "default";

      if(code === 0){
          backgroundColor = interactive ? "#1976d2" : "#102027";
          cursor = interactive ? "pointer" : "default";
        }else if(code === 1){
            backgroundColor = "#388e3c"; // (green)
        }else if(code === 2){
            backgroundColor = "#d32f2f"; // (red)
        }else if(code === 3){
            backgroundColor = "#9e9e9e"; // (grey)
        }
      return {
          width: "36px", height: "36px",
          border: "1px solid #263238",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor, cursor,
          boxSizing: "border-box",
          fontSize: "16px", userSelect: "none"
      };
  };
//determine the appropriate symbol
  const getCellSymbol = (code) => {
      if(code === 2) return "💥";
      if(code === 3) return "·";
      return "";
  };

  // TODO: render column headers (1–10) across the top
  // TODO: for each row, render a row label (A–J) then 10 cells
  // TODO: attach an onClick handler to each cell that calls onFire(r, c)
  //       only when interactive is true and cells[r][c] === 0

  return (
      <div style={{ display: "inline-block" }}>
        {/* render column headers (1–10) across the top */}
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
                fontWeight: "bold",
                color: "#263238"
              }}
            >
              {col}
            </div>
          ))}
        </div>

        {/* for each row, render a row label (A–J) then 10 cells */}
        {cells.map((row, r) => (
          <div key={ROWS[r]} style={{ display: "flex" }}>
            {/* row label */}
            <div
              style={{
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#263238"
              }}
            >
              {ROWS[r]}
            </div>

            {/* cells */}
            {row.map((code, c) => (
              <div
                key={`${r}-${c}`}
                style={cellStyles(code)}
                onClick={() => {
                    //it only allows click if this board is live and interactive, and the cell is still unknown meaning code == 0
                  if (interactive && code === 0) {
                    onFire(r, c);
                  }
                }}
              >
                {getCellSymbol(code)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
