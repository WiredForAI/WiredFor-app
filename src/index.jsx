import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CareerMatch from "./CareerMatch.jsx";
import EmployerDashboard from "./EmployerDashboard.jsx";
import AdminPage from "./AdminPage.jsx";
import LandingPage from "./LandingPage.jsx";
import PreviewMode from "./PreviewMode.jsx";
import JobsPage from "./JobsPage.jsx";
import ClaimProfile from "./ClaimProfile.jsx";
import ResetPassword from "./ResetPassword.jsx";

const path = window.location.pathname;

const App = path.startsWith("/admin")          ? AdminPage
  : path.startsWith("/reset-password")         ? ResetPassword
  : path.startsWith("/employer")               ? EmployerDashboard
  : path.startsWith("/preview")                ? PreviewMode
  : path.startsWith("/claim")                  ? ClaimProfile
  : path.startsWith("/jobs")                   ? JobsPage
  : path.startsWith("/assessment")             ? CareerMatch
  : path === "/"                               ? LandingPage
  : LandingPage;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
