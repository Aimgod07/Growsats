import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <p style={styles.title}>Something went wrong</p>
          <p style={styles.message}>{this.state.error?.message || "An unexpected error occurred."}</p>
          <button style={styles.retryBtn} onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#10101c",
    color: "#ffffff",
    padding: "24px",
    textAlign: "center",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  message: {
    fontSize: "14px",
    color: "#9494b0",
    marginBottom: "20px",
  },
  retryBtn: {
    backgroundColor: "#d4ff3e",
    color: "#10101c",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
