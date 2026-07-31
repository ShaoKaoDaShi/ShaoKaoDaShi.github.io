import { Link } from "react-router-dom";

type Tool = {
  index: string;
  title: string;
  description: string;
  path: string;
  tags: string[];
};

const toolGroups: { title: string; description: string; tools: Tool[] }[] = [
  {
    title: "Data tools",
    description: "Edit structured data and inspect text changes.",
    tools: [
      {
        index: "01",
        title: "JSON Editor",
        description: "Parse, repair, format, and revisit local JSON history.",
        path: "/editor",
        tags: ["JSON", "Monaco"],
      },
      {
        index: "02",
        title: "Diff Viewer",
        description: "Compare two text revisions in split or unified form.",
        path: "/diff",
        tags: ["Text", "Split"],
      },
      {
        index: "03",
        title: "Optimized Diff",
        description: "Inspect modified lines with focused inline highlights.",
        path: "/optimized-diff",
        tags: ["Text", "Inline"],
      },
      {
        index: "04",
        title: "Precise Diff",
        description: "Use Monaco for editable, large-file comparisons.",
        path: "/precise-diff",
        tags: ["Monaco", "Editable"],
      },
    ],
  },
  {
    title: "Labs",
    description: "Focused sandboxes for browser and interaction experiments.",
    tools: [
      {
        index: "05",
        title: "Component Playground",
        description:
          "Stress-test responsive components and constrained layouts.",
        path: "/playground",
        tags: ["React", "Layout"],
      },
      {
        index: "06",
        title: "Video Test",
        description:
          "Verify local files, remote sources, and playback options.",
        path: "/video-test",
        tags: ["Media", "Browser"],
      },
      {
        index: "07",
        title: "Three Physics",
        description: "Explore rigid-body collisions in a Three.js scene.",
        path: "/three-physics",
        tags: ["Three.js", "Rapier"],
      },
      {
        index: "08",
        title: "Teaching Slingshot",
        description: "Inspect a guided, low-energy mechanism model.",
        path: "/three-teaching-slingshot",
        tags: ["Three.js", "Model"],
      },
    ],
  },
];

const Home = () => (
  <div className="home-page">
    <header className="home-hero">
      <div className="home-hero-copy">
        <p className="home-eyebrow">Local development workbench</p>
        <h1>Inspect data. Compare changes. Test in place.</h1>
        <p className="home-lead">
          A compact set of browser tools for JSON, text diffs, media, and
          interactive experiments.
        </p>
      </div>
      <dl className="home-facts" aria-label="Workbench details">
        <div>
          <dt>Tools</dt>
          <dd>08</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>Local</dd>
        </div>
        <div>
          <dt>Stack</dt>
          <dd>React + Vite</dd>
        </div>
      </dl>
    </header>

    <div className="home-workspace">
      {toolGroups.map((group) => (
        <section className="tool-panel" key={group.title}>
          <header className="tool-panel-header">
            <div>
              <h2>{group.title}</h2>
              <p>{group.description}</p>
            </div>
            <span>{String(group.tools.length).padStart(2, "0")} tools</span>
          </header>

          <div className="tool-list">
            {group.tools.map((tool) => (
              <Link className="tool-row" key={tool.path} to={tool.path}>
                <span className="tool-index" aria-hidden="true">
                  {tool.index}
                </span>
                <span className="tool-copy">
                  <strong>{tool.title}</strong>
                  <span>{tool.description}</span>
                </span>
                <span className="tool-tags" aria-label="Technology tags">
                  {tool.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </span>
                <span className="tool-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export default Home;
