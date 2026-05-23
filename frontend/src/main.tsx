import React from "react";
import { createRoot } from "react-dom/client";
import { FittingPage } from "./pages/FittingPage";
import "./style.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><FittingPage /></React.StrictMode>);
