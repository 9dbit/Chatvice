import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Hide loading screen after React hydration
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 500);
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Call after React has rendered
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideLoadingScreen();
  });
});
