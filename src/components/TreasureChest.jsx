import { useEffect, useRef, useState } from 'react';

export default function TreasureChest() {
  const viewer = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let active = true;
    let frame;
    const element = viewer.current;
    const skipCommittedScroll = event => {
      // The viewer tries to cancel touch moves even after the browser commits to scrolling.
      if (!event.cancelable) event.stopPropagation();
    };
    const onError = () => {
      cancelAnimationFrame(frame);
      if (active) {
        setReady(false);
        setFailed(true);
      }
    };
    const onProgress = ({ detail }) => {
      if (Number.isFinite(detail?.totalProgress)) {
        setProgress(Math.max(0, Math.min(99, Math.round(detail.totalProgress * 100))));
      }
    };
    const onLoad = () => {
      frame = requestAnimationFrame(() => {
        if (!active) return;
        element.jumpCameraToGoal();
        setReady(true);
      });
    };
    element?.addEventListener('error', onError);
    element?.addEventListener('load', onLoad);
    element?.addEventListener('progress', onProgress);
    element?.addEventListener('touchmove', skipCommittedScroll, {capture: true, passive: true});
    import('@google/model-viewer').catch(onError);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      element?.removeEventListener('error', onError);
      element?.removeEventListener('load', onLoad);
      element?.removeEventListener('progress', onProgress);
      element?.removeEventListener('touchmove', skipCommittedScroll, true);
    };
  }, []);

  return <div className="events-hero__chest events-chest" data-ready={ready}>
    <img src="/playloot-art/treasure-chest-preview.png" alt="Purple and gold treasure chest with emerald gems" />
    <model-viewer
      ref={viewer}
      inert={!ready}
      src="/playloot-art/treasure-chest.glb"
      loading="eager"
      alt="3D purple and gold treasure chest with emerald gems"
      camera-controls
      disable-zoom
      disable-pan
      interaction-prompt="none"
      touch-action="pan-y"
      camera-orbit="-25deg 75deg 105%"
      min-camera-orbit="auto auto 105%"
      max-camera-orbit="auto auto 105%"
      shadow-intensity="0.8"
      exposure="1.15"
    />
    {!ready && <div className="events-chest__status">
      <span role="status">{failed ? '3D unavailable · showing preview' : 'Loading 3D chest…'}</span>
      {!failed && <progress aria-label="3D chest loading progress" value={progress ?? undefined} max={100} />}
    </div>}
  </div>;
}
