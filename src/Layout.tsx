import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/editor", label: "JSON Editor", shortLabel: "JSON" },
  { path: "/diff", label: "Diff Viewer", shortLabel: "Diff" },
  { path: "/optimized-diff", label: "Optimized Diff", shortLabel: "Optimized" },
  { path: "/precise-diff", label: "Precise Diff", shortLabel: "Precise" },
  {
    path: "/playground",
    label: "Component Playground",
    shortLabel: "Components",
  },
  { path: "/video-test", label: "Video Test", shortLabel: "Video" },
  { path: "/three-physics", label: "Three Physics", shortLabel: "Physics" },
  {
    path: "/three-teaching-slingshot",
    label: "Teaching Slingshot",
    shortLabel: "Slingshot",
  },
];

const Layout = () => {
  const location = useLocation();

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" to="/" aria-label="React JSON View home">
            <span className="site-brand-mark" aria-hidden="true">
              {"{}"}
            </span>
            <span className="site-brand-copy">
              <strong>React JSON View</strong>
              <span>Local developer tools</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary navigation">
            <div className="site-nav-list">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`site-nav-link${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.label}
                    title={item.label}
                  >
                    {item.shortLabel ?? item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
