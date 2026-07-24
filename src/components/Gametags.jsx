import React from "react";

// ---- Data -------------------------------------------------------------
// Each tag has a label, an emoji icon, and the URL it should link to.
// Update the `url` fields to point wherever you want each tag to navigate.
const GAME_TAGS = [
  { label: "Number Games", icon: "🔢", url: "/games/number" },
  { label: "Shooting Games", icon: "🔫", url: "/games/shooting" },
  { label: "Tower Defense Games", icon: "🏰", url: "/games/tower-defense" },
  { label: "Casual Games", icon: "😎", url: "/games/casual" },
  { label: "3D Games", icon: "🧊", url: "/games/3d" },
  { label: "Logic Games", icon: "🧠", url: "/games/logic" },
  { label: "Racing Games", icon: "🏎️", url: "/games/racing" },
  { label: "Puzzle Games", icon: "🧩", url: "/games/puzzle" },
  { label: "Sports Games", icon: "🏀", url: "/games/sports" },
  { label: "Crazy Games", icon: "🤪", url: "/games/crazy" },
  { label: "Board Games", icon: "🎲", url: "/games/board" },
  { label: "Action Games", icon: "⚔️", url: "/games/action" },
  { label: "Arcade Games", icon: "🕹️", url: "/games/arcade" },
  { label: "Adventure Games", icon: "⚓", url: "/games/adventure" },
  { label: "Strategy Games", icon: "♟️", url: "/games/strategy" },
  { label: "Girl Games", icon: "💄", url: "/games/girl" },
  { label: "Fruit Games", icon: "🍇", url: "/games/fruit" },
  { label: "IQ Games", icon: "💡", url: "/games/iq" },
  { label: "Life Simulation Games", icon: "🌱", url: "/games/life-simulation" },
];

const VIEW_ALL_URL = "/games/tags";

// ---- Styles -------------------------------------------------------------
const styles = {
  container: {
    backgroundColor: "#000000",
    padding: "16px 12px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    width: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerIcon: {
    width: "22px",
    height: "22px",
    borderRadius: "5px",
    background: "linear-gradient(135deg, #4facfe 0%, #2b6fe0 100%)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: "2px",
    padding: "3px",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  headerIconDot: {
    backgroundColor: "#ffffff",
    borderRadius: "1.5px",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: 700,
    margin: 0,
    whiteSpace: "nowrap",
  },
  viewAll: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    color: "#3b9cff",
    fontSize: "14px",
    fontWeight: 500,
    background: "none",
    border: "none",
    padding: "4px",
    cursor: "pointer",
    flexShrink: 0,
  },
  scrollRow: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "6px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitOverflowScrolling: "touch",
  },
  // Wrapping grid used for a non-scrolling, multi-row mobile layout
  wrapRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  tag: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#1c1c1e",
    border: "1px solid #2c2c2e",
    borderRadius: "999px",
    padding: "10px 16px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transition: "background-color 0.15s ease, transform 0.1s ease",
  },
  tagIcon: {
    fontSize: "16px",
    lineHeight: 1,
  },
};

// Hide the webkit scrollbar for the horizontal-scroll rows
const scrollbarHideCSS = `
  .game-tags-scroll-row::-webkit-scrollbar { display: none; }
  .game-tag-pill:active { transform: scale(0.96); background-color: #2a2a2c; }
`;

export default function GameTags({
  tags = GAME_TAGS,
  viewAllUrl = VIEW_ALL_URL,
  layout = "wrap", // "wrap" (multi-row, no scrolling) or "scroll" (rows scroll horizontally)
  onNavigate, // optional custom handler: (url) => void
}) {
  const handleClick = (url) => {
    if (onNavigate) {
      onNavigate(url);
    } else if (typeof window !== "undefined") {
      window.location.assign(url);
    }
  };

  const handleKeyDown = (e, url) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(url);
    }
  };

  // Split tags into rows of ~6 when using the horizontal-scroll layout,
  // matching the reference design's 3 rows.
  const chunk = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };
  const rows = layout === "scroll" ? chunk(tags, 6) : [tags];

  return (
    <div style={styles.container}>
      <style>{scrollbarHideCSS}</style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <div style={styles.headerIconDot} />
            <div style={styles.headerIconDot} />
            <div style={styles.headerIconDot} />
            <div style={styles.headerIconDot} />
          </div>
          <h2 style={styles.headerTitle}>Game Tags</h2>
        </div>

        <button
          type="button"
          style={styles.viewAll}
          onClick={() => handleClick(viewAllUrl)}
        >
          View All <span aria-hidden="true">›</span>
        </button>
      </div>

      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={layout === "scroll" ? "game-tags-scroll-row" : undefined}
          style={{
            ...(layout === "scroll" ? styles.scrollRow : styles.wrapRow),
            marginBottom:
              layout === "scroll" && rowIndex !== rows.length - 1 ? "10px" : 0,
          }}
        >
          {row.map((tag) => (
            <div
              key={tag.label}
              className="game-tag-pill"
              style={styles.tag}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(tag.url)}
              onKeyDown={(e) => handleKeyDown(e, tag.url)}
            >
              <span style={styles.tagIcon}>{tag.icon}</span>
              <span>{tag.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}