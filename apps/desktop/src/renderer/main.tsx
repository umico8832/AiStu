import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { VisualizationWindowApp } from "./VisualizationWindowApp";
import "./styles.css";

const isVisualizationWindow =
  new URLSearchParams(window.location.search).get("view") ===
  "visualization";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isVisualizationWindow ? <VisualizationWindowApp /> : <App />}
  </React.StrictMode>,
);
