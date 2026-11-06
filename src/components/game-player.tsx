"use client";

import { useEffect, useRef, useState } from "react";

export function GamePlayer() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    setError(null);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (frameRef.current) {
        await frameRef.current.requestFullscreen();
      }
    } catch {
      setError("Fullscreen mode could not be opened. Check your browser permissions and try again.");
    }
  };

  return (
    <div ref={frameRef} className="game-frame">
      <div className="game-frame-controls">
        <button type="button" className="secondary-button" onClick={toggleFullscreen}>
          {isFullscreen ? "Exit full screen" : "Open full screen"}
        </button>
      </div>
      {error && <p className="form-notice notice-error game-frame-error" role="alert">{error}</p>}
      <iframe title="Neon Requiem learning game" src="/games/neon-requiem.html" />
    </div>
  );
}
