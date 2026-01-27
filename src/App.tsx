import { BrowserRouter, Routes, Route } from "react-router-dom";
import JsonEditor from "./JsonEditor";
import DiffViewerPage from "./pages/DiffViewerPage";
import PreciseDiffViewerPage from "./pages/PreciseDiffViewerPage";
import OptimizedDiffPage from "./pages/OptimizedDiffPage";
import Layout from "./Layout";
import Home from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="editor" element={<JsonEditor />} />
          <Route path="diff" element={<DiffViewerPage />} />
          <Route path="optimized-diff" element={<OptimizedDiffPage />} />
          <Route path="precise-diff" element={<PreciseDiffViewerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
