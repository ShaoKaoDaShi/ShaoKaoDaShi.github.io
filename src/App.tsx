import { HashRouter, Routes, Route } from "react-router-dom";
import JsonEditor from "./JsonEditor";
import DiffViewerPage from "./pages/DiffViewerPage";
import PreciseDiffViewerPage from "./pages/PreciseDiffViewerPage";
import OptimizedDiffPage from "./pages/OptimizedDiffPage";
import PlaygroundPage from "./pages/PlaygroundPage";
import VideoTestPage from "./pages/VideoTestPage";
import ThreePhysicsDemoPage from "./pages/ThreePhysicsDemoPage";
import ThreeTeachingSlingshotPage from "./pages/ThreeTeachingSlingshotPage";
import Layout from "./Layout";
import Home from "./pages/Home";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="editor" element={<JsonEditor />} />
          <Route path="diff" element={<DiffViewerPage />} />
          <Route path="optimized-diff" element={<OptimizedDiffPage />} />
          <Route path="precise-diff" element={<PreciseDiffViewerPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="video-test" element={<VideoTestPage />} />
          <Route path="three-physics" element={<ThreePhysicsDemoPage />} />
          <Route
            path="three-teaching-slingshot"
            element={<ThreeTeachingSlingshotPage />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
