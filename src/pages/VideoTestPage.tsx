import React, { useEffect, useState } from "react";

const SAMPLE_VIDEO_URL =
  "https://tosv.byted.org/obj/outter-data/CyberOrigin/batch-2026-03-31/de736695-b8ba-4acd-abbe-cb5da9587c8f.mp4";

const VideoTestPage: React.FC = () => {
  const [videoSource, setVideoSource] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const releaseObjectUrl = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
  };

  const handleVideoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    releaseObjectUrl();
    setVideoSource(event.target.value.trim());
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    releaseObjectUrl();

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setVideoSource(nextObjectUrl);
  };

  const handleUseSample = () => {
    releaseObjectUrl();
    setVideoSource(SAMPLE_VIDEO_URL);
  };

  const handleClear = () => {
    releaseObjectUrl();
    setVideoSource("");
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-500">
                Video Playground
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Test video playback in the browser
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Paste a remote video URL, upload a local file, or use a sample
                MP4 to verify playback, mute, loop, and autoplay behavior.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleUseSample}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Use sample video
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Source</h2>
            <div className="mt-4 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Remote URL
                </span>
                <input
                  type="url"
                  value={objectUrl ? "" : videoSource}
                  onChange={handleVideoUrlChange}
                  placeholder="https://example.com/demo.mp4"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Local file
                </span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
              </label>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-900">Options</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isMuted}
                    onChange={(event) => setIsMuted(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Muted
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isLooping}
                    onChange={(event) => setIsLooping(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Loop
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={shouldAutoplay}
                    onChange={(event) =>
                      setShouldAutoplay(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Autoplay
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Current source</p>
              <p className="mt-2 break-all">
                {videoSource || "No video selected yet."}
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
            <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950">
              {videoSource ? (
                <video
                  key={videoSource}
                  className="max-h-[72vh] min-h-[320px] w-full bg-black"
                  src={videoSource}
                  controls
                  muted={isMuted}
                  loop={isLooping}
                  autoPlay={shouldAutoplay}
                  playsInline
                />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-slate-300">
                  Select a local video file or paste a remote URL to start
                  testing playback.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default VideoTestPage;
