import { createRoot } from "react-dom/client";
import TagManager from "react-gtm-module";
import App from "./App";
import "./index.css";

// Initialize Google Tag Manager
TagManager.initialize({
  gtmId: "GTM-W2SHCWVZ",
});

createRoot(document.getElementById("root")!).render(<App />);
