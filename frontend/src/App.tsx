import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Feed } from "./pages/Feed";
import { Briefing } from "./pages/Briefing";
import { LegalBasis } from "./pages/LegalBasis";
import { Audit } from "./pages/Audit";
import { Documentation } from "./pages/Documentation";
import { Forensics } from "./pages/Forensics";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="feed" element={<Feed />} />
        <Route path="briefing" element={<Briefing />} />
        <Route path="forensics" element={<Forensics />} />
        <Route path="legal" element={<LegalBasis />} />
        <Route path="documentation" element={<Documentation />} />
        <Route path="audit" element={<Audit />} />
      </Route>
    </Routes>
  );
}
