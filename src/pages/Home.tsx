import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  const features = [
    {
      title: "JSON Editor",
      description:
        "A powerful JSON editor with parsing, formatting, and history support.",
      path: "/editor",
      color: "bg-blue-500",
    },
    {
      title: "Diff Viewer",
      description: "Compare two text files and visualize the differences.",
      path: "/diff",
      color: "bg-green-500",
    },
    {
      title: "Precise Diff Viewer",
      description:
        "Advanced character-level difference visualization for code.",
      path: "/precise-diff",
      color: "bg-purple-500",
    },
    {
      title: "Playground",
      description:
        "Component playground for testing and previewing UI components.",
      path: "/playground",
      color: "bg-yellow-500",
    },
    {
      title: "Video Test",
      description:
        "A simple page for testing local and remote video playback in the browser.",
      path: "/video-test",
      color: "bg-rose-500",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Welcome to React Json View
        </h1>
        <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
          Explore the features of this project.
        </p>
      </div>

      <div className="mt-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.path}
              to={feature.path}
              className="block group hover:no-underline"
            >
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <div className={`h-2 ${feature.color}`} />
                <div className="px-4 py-5 sm:p-6 flex-1">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>{feature.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
