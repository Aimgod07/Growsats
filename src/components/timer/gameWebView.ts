import { registerPlugin, Capacitor, type PluginListenerHandle } from '@capacitor/core';

export interface GameWebViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameWebViewSafeArea {
  top: number;
  bottom: number;
}

export interface GameWebViewMountOptions extends GameWebViewRect {
  url: string;
  title?: string;
}

export interface GameTimerOptions {
  position?: 'top-left' | 'top-right' | 'top-center';

  startSeconds?: number;

  direction?: 'up' | 'down';
}

export interface GameWebViewPlugin {
  getSafeArea(): Promise<GameWebViewSafeArea>;
  mount(options: GameWebViewMountOptions): Promise<void>;
  resize(options: GameWebViewRect): Promise<void>;
  unmount(): Promise<void>;
  lockOrientation(options: { orientation: 'portrait' | 'landscape' }): Promise<void>;
  showTimer(options: GameTimerOptions): Promise<void>;
  hideTimer(): Promise<void>;
  updateControls(options: { canClaim?: boolean; disabled?: boolean; claimLabel?: string; message?: string }): Promise<void>;
  addListener(event: 'game:claim' | 'game:close', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'game:ready', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'game:score', listener: (event: { score: number; runId?: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'game:error', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'timer:tick', listener: (event: { elapsedSeconds: number }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'game:idle', listener: (event: { timeoutSeconds: number }) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const GameWebView = registerPlugin<GameWebViewPlugin>('GameWebView');


export async function launchGameOverlay(
  url: string,
  rect: GameWebViewRect,
  timerOptions: GameTimerOptions = { position: 'top-right', direction: 'up' }
): Promise<PluginListenerHandle | undefined> {
  if (!Capacitor.isNativePlatform()) return;

  let timerStarted = false;
  const readyHandle = await GameWebView.addListener('game:ready', () => {
    if (timerStarted) return;
    timerStarted = true;
    void GameWebView.showTimer(timerOptions);
  });

  GameWebView.addListener('game:error', () => {
    void GameWebView.hideTimer();
  });

  await GameWebView.mount({ url, ...rect });

  return readyHandle;
}

export async function stopGameOverlay(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await GameWebView.hideTimer();
  await GameWebView.removeAllListeners();
  await GameWebView.unmount();
}

export { GameWebView };
