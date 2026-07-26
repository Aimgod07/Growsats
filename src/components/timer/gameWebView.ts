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
}

export interface GameTimerOptions {
  /** Where the timer overlay is anchored on screen */
  position?: 'top-left' | 'top-right' | 'top-center';
  /** Starting value in seconds (default 0) */
  startSeconds?: number;
  /** Count up from startSeconds, or down to 0 */
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
  addListener(event: 'game:ready', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'game:error', listener: () => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const GameWebView = registerPlugin<GameWebViewPlugin>('GameWebView');


export async function launchGameOverlay(
  url: string,
  rect: GameWebViewRect,
  timerOptions: GameTimerOptions = { position: 'top-right', direction: 'up' }
): Promise<PluginListenerHandle | undefined> {
  if (!Capacitor.isNativePlatform()) return;

  await GameWebView.mount({ url, ...rect });

  const readyHandle = await GameWebView.addListener('game:ready', () => {
    void GameWebView.showTimer(timerOptions);
  });

  GameWebView.addListener('game:error', () => {
    void GameWebView.hideTimer();
  });

  return readyHandle;
}

export async function stopGameOverlay(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await GameWebView.hideTimer();
  await GameWebView.removeAllListeners();
  await GameWebView.unmount();
}

export { GameWebView };