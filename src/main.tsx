import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { seedDatabaseIfEmpty } from "@/db/seed";
import { ensureYearsGenerated } from "@/domain/recurrence";
import { initAutoBackup } from "@/domain/autoBackupRunner";
import { today } from "@/domain/jalali";

seedDatabaseIfEmpty()
  .then(() => ensureYearsGenerated([today().year]))
  .then(() => initAutoBackup())
  .catch((error) => {
    console.error("Failed to initialize database", error);
  })
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
