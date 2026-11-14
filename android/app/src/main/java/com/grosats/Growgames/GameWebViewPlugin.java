package com.grosats.Growgames; // ⚠️ CHANGE THIS to match your MainActivity's exact package name/case

import android.annotation.SuppressLint;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.DisplayCutout;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.CookieManager;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GameWebView")
public class GameWebViewPlugin extends Plugin {

    @PluginMethod
    public void deviceInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("model", Build.MANUFACTURER + " " + Build.MODEL);
        result.put("os", "Android " + Build.VERSION.RELEASE);
        call.resolve(result);
    }

    private WebView gameWebView;
    private String layoutScript;
    private void applyGameLayout(WebView view) {
        android.net.Uri uri = android.net.Uri.parse(view.getUrl() == null ? "" : view.getUrl());
        String host = uri.getHost();
        if (!"https".equals(uri.getScheme()) || host == null) return;
        // Original games already manage their Phaser scale and input bounds.
        if ("playloot.pages.dev".equals(host) && uri.getPath().startsWith("/grogames/")) return;
        try {
            if (layoutScript == null) {
                StringBuilder source = new StringBuilder();
                try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(
                        getContext().getAssets().open("game-layout.js"), java.nio.charset.StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) source.append(line).append('\n');
                }
                layoutScript = source.toString();
            }
            view.evaluateJavascript(layoutScript, null);
        } catch (java.io.IOException ignored) { }
    }
    private FrameLayout gameSurface;
    private LinearLayout gameLoading;
    private LinearLayout controls;
    private TextView clockLabel;
    private TextView claimButton;
    private int previousSystemUi;
    private int previousCutoutMode;
    private float swipeX, swipeY;
    private long swipeStarted, lastSwipe;
    private final Handler controlsHandler = new Handler(Looper.getMainLooper());
    private final Runnable hideControls = () -> {
        if (controls != null) controls.setVisibility(View.GONE);
        if (gameSurface != null) setSystemBars(false);
    };

    private void setSystemBars(boolean visible) {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(), getActivity().getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        if (visible) controller.show(WindowInsetsCompat.Type.systemBars());
        else controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    private void revealControls() {
        if (controls == null) return;
        controls.setVisibility(View.VISIBLE);
        controlsHandler.removeCallbacks(hideControls);
        controlsHandler.postDelayed(hideControls, 6000);
    }

    private int dp(float value) { return Math.round(value * getContext().getResources().getDisplayMetrics().density); }

    private TextView control(String text) {
        TextView view = new TextView(getContext());
        view.setText(text);
        view.setTextColor(Color.rgb(212, 255, 62));
        view.setTextSize(14);
        view.setGravity(Gravity.CENTER_VERTICAL);
        view.setPadding(dp(12), dp(8), dp(12), dp(8));
        view.setMinHeight(dp(48));
        return view;
    }

    @PluginMethod
    public void updateControls(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (claimButton != null && call.getData().has("canClaim")) {
                claimButton.setVisibility(call.getBoolean("canClaim", false) ? View.VISIBLE : View.GONE);
                claimButton.setEnabled(!call.getBoolean("disabled", false));
                claimButton.setText(call.getString("claimLabel", "Claim"));
            }
            String message = call.getString("message", "");
            if (!message.isEmpty()) Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
            call.resolve();
        });
    }
    private static final long INACTIVITY_GRACE_PERIOD_MS = 120_000L;
    private static final long INACTIVITY_TIMEOUT_MS = 15_000L;
    private final Handler timerHandler = new Handler(Looper.getMainLooper());
    private final Handler inactivityHandler = new Handler(Looper.getMainLooper());
    private long timerStartedAtMs;
    private int timerStartSeconds;
    private boolean timerRunning;
    private long inactivityEnforcementStartsAtMs;
    private boolean mainPageReadyNotified;

    private final Runnable inactivityTimeout = () -> {
        if (gameWebView == null) return;
        JSObject ret = new JSObject();
        ret.put("timeoutSeconds", INACTIVITY_TIMEOUT_MS / 1000L);
        notifyListeners("game:idle", ret);
        unmountInternal();
    };

    private final Runnable timerTick = new Runnable() {
        @Override
        public void run() {
            if (!timerRunning) return;
            int elapsed = timerStartSeconds +
                    (int) ((SystemClock.elapsedRealtime() - timerStartedAtMs) / 1000L);
            JSObject ret = new JSObject();
            ret.put("elapsedSeconds", elapsed);
            if (clockLabel != null) clockLabel.setText(String.format(java.util.Locale.US, "%02d:%02d", elapsed / 60, elapsed % 60));
            notifyListeners("timer:tick", ret);
            timerHandler.postDelayed(this, 1000L);
        }
    };

    @PluginMethod
    public void getSafeArea(PluginCall call) {
        int top = 0;
        int bottom = 0;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowInsets insets = getActivity().getWindow().getDecorView().getRootWindowInsets();
            if (insets != null) {
                DisplayCutout cutout = insets.getDisplayCutout();
                if (cutout != null) {
                    top = cutout.getSafeInsetTop();
                    bottom = cutout.getSafeInsetBottom();
                }
                top = Math.max(top, insets.getSystemWindowInsetTop());
                bottom = Math.max(bottom, insets.getSystemWindowInsetBottom());
            }
        }

        float density = getContext().getResources().getDisplayMetrics().density;

        JSObject ret = new JSObject();
        ret.put("top", top / density);
        ret.put("bottom", bottom / density);
        call.resolve(ret);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void mount(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !"https".equals(android.net.Uri.parse(url).getScheme()) || android.net.Uri.parse(url).getUserInfo() != null) {
            call.reject("A secure HTTPS game URL is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            unmountInternal();

            View decor = getActivity().getWindow().getDecorView();
            previousSystemUi = decor.getSystemUiVisibility();
            decor.setSystemUiVisibility(previousSystemUi | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams attrs = getActivity().getWindow().getAttributes();
                previousCutoutMode = attrs.layoutInDisplayCutoutMode;
                attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                getActivity().getWindow().setAttributes(attrs);
            }
            setSystemBars(false);
            gameSurface = new FrameLayout(getContext()) {
                @Override
                public boolean dispatchTouchEvent(MotionEvent event) {
                    // Observe without consuming: game swipes and controls keep their input.
                    if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
                        swipeX = event.getX(); swipeY = event.getY();
                        swipeStarted = SystemClock.elapsedRealtime();
                    } else if (event.getActionMasked() == MotionEvent.ACTION_UP) {
                        long now = SystemClock.elapsedRealtime();
                        if (swipeY < dp(96) && event.getY() - swipeY > dp(48) &&
                                Math.abs(event.getX() - swipeX) < dp(96) && now - swipeStarted < 700) {
                            revealControls();
                            if (lastSwipe > 0 && now - lastSwipe < 1000) { setSystemBars(true); lastSwipe = 0; }
                            else lastSwipe = now;
                        }
                    }
                    return super.dispatchTouchEvent(event);
                }
            };
            gameSurface.setBackgroundColor(Color.BLACK);

            gameWebView = new WebView(getContext());
            mainPageReadyNotified = false;
            inactivityEnforcementStartsAtMs =
                    SystemClock.elapsedRealtime() + INACTIVITY_GRACE_PERIOD_MS;
            WebSettings settings = gameWebView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            settings.setSupportMultipleWindows(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            CookieManager.getInstance().setAcceptCookie(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(gameWebView, true);
            gameWebView.setBackgroundColor(Color.BLACK);
            gameWebView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            gameWebView.setHorizontalScrollBarEnabled(false);
            gameWebView.setVerticalScrollBarEnabled(false);
            gameWebView.setOnTouchListener((view, event) -> {
                if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
                    resetInactivityTimeout();
                }
                return false;
            });

            gameWebView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                    return !"https".equals(request.getUrl().getScheme()) || request.getUrl().getUserInfo() != null;
                }
                @Override
                public void onPageFinished(WebView view, String finishedUrl) {
                    if (view != gameWebView) return;
                    if (gameLoading != null) gameLoading.setVisibility(View.GONE);
                    applyGameLayout(view);
                    // Game providers commonly navigate through an advert, loader,
                    // menu and level document. Those are all part of one play
                    // session, so they must not restart the timer or idle grace.
                    if (!mainPageReadyNotified) {
                        mainPageReadyNotified = true;
                        notifyListeners("game:ready", new JSObject());
                    }
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    if (!request.isForMainFrame()) return;
                    if (gameLoading != null) gameLoading.setVisibility(View.GONE);
                    revealControls();
                    Toast.makeText(getContext(), "Game couldn't load. Use Close to return.", Toast.LENGTH_LONG).show();
                    JSObject ret = new JSObject();
                    ret.put("message", String.valueOf(error.getDescription()));
                    notifyListeners("game:error", ret);
                }

                @Override
                public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                    if (!request.isForMainFrame() || response.getStatusCode() < 400) return;
                    if (gameLoading != null) gameLoading.setVisibility(View.GONE);
                    revealControls();
                    Toast.makeText(getContext(), "Game server couldn't load this page.", Toast.LENGTH_LONG).show();
                    JSObject ret = new JSObject();
                    ret.put("message", "Game server returned " + response.getStatusCode());
                    notifyListeners("game:error", ret);
                }
            });
            gameWebView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage message) {
                    String current = gameWebView == null ? "" : gameWebView.getUrl();
                    android.net.Uri scoreUri = android.net.Uri.parse(current == null ? "" : current);
                    if ("https".equals(scoreUri.getScheme()) && "playloot.pages.dev".equals(scoreUri.getHost())
                            && scoreUri.getPath() != null && scoreUri.getPath().startsWith("/grogames/")
                            && message.message().startsWith("PLAYLOOT_SCORE:")) {
                        try {
                            org.json.JSONObject data = new org.json.JSONObject(message.message().substring(15));
                            double score = data.getDouble("score");
                            if (score >= 0 && score <= 1000000000 && score == Math.floor(score)) {
                                JSObject result = new JSObject();
                                result.put("score", (long) score);
                                notifyListeners("game:score", result);
                            }
                        } catch (Exception ignored) { }
                        return true;
                    }
                    return super.onConsoleMessage(message);
                }
            });

            gameSurface.addView(gameWebView, new FrameLayout.LayoutParams(-1, -1));
            gameLoading = new LinearLayout(getContext());
            gameLoading.setOrientation(LinearLayout.VERTICAL);
            gameLoading.setGravity(Gravity.CENTER);
            gameLoading.setBackgroundColor(Color.rgb(14, 16, 23));
            gameLoading.setClickable(true);
            android.widget.ProgressBar progress = new android.widget.ProgressBar(getContext());
            progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.rgb(76, 215, 246)));
            gameLoading.addView(progress, new LinearLayout.LayoutParams(dp(56), dp(56)));
            TextView loadingTitle = control("Loading your game…");
            loadingTitle.setTextColor(Color.WHITE);
            loadingTitle.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams loadingTextParams = new LinearLayout.LayoutParams(-2, dp(60));
            gameLoading.addView(loadingTitle, loadingTextParams);
            TextView loadingClose = control("Close game");
            loadingClose.setTextColor(Color.rgb(76, 215, 246));
            loadingClose.setOnClickListener(v -> notifyListeners("game:close", new JSObject()));
            gameLoading.addView(loadingClose);
            gameSurface.addView(gameLoading, new FrameLayout.LayoutParams(-1, -1));
            controls = new LinearLayout(getContext());
            controls.setGravity(Gravity.CENTER_VERTICAL);
            controls.setBackgroundColor(0xee10101c);
            TextView title = control(call.getString("title", "Game"));
            title.setSingleLine(true);
            title.setEllipsize(android.text.TextUtils.TruncateAt.END);
            title.setTextColor(Color.WHITE);
            controls.addView(title, new LinearLayout.LayoutParams(0, -1, 1));
            clockLabel = control("00:00");
            controls.addView(clockLabel);
            claimButton = control("Claim");
            claimButton.setVisibility(View.GONE);
            claimButton.setOnClickListener(v -> { revealControls(); notifyListeners("game:claim", new JSObject()); });
            controls.addView(claimButton);
            TextView close = control("✕ Close");
            close.setOnClickListener(v -> notifyListeners("game:close", new JSObject()));
            controls.addView(close);
            gameSurface.addView(controls, new FrameLayout.LayoutParams(-1, dp(56), Gravity.TOP));
            controls.setVisibility(View.GONE);
            gameSurface.setOnApplyWindowInsetsListener((surface, insets) -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && insets.getDisplayCutout() != null) {
                    DisplayCutout cutout = insets.getDisplayCutout();
                    controls.setPadding(cutout.getSafeInsetLeft(), 0, cutout.getSafeInsetRight(), 0);
                }
                return insets;
            });
            ((ViewGroup) decor).addView(gameSurface, new ViewGroup.LayoutParams(-1, -1));
            // Keep the Capacitor WebView active: it owns session heartbeats and
            // reward callbacks. The opaque game surface already covers its pixels.

            gameWebView.loadUrl(url);
            resetInactivityTimeout();

            call.resolve();
        });
    }

    @PluginMethod
    public void resize(PluginCall call) {
        if (gameWebView == null) {
            call.reject("GameWebView is not mounted");
            return;
        }

        getActivity().runOnUiThread(() -> {
            if (gameWebView == null) { call.resolve(); return; }
            // MATCH_PARENT follows the actual display, including rotation and insets.
            gameSurface.requestLayout();
            call.resolve();
        });
    }

    @PluginMethod
    public void unmount(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            unmountInternal();
            call.resolve();
        });
    }

    @PluginMethod
    public void lockOrientation(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            // Enforce portrait even if an older web bundle requests landscape.
            getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            call.resolve();
        });
    }

    @PluginMethod
    public void showTimer(PluginCall call) {
        int startSeconds = call.getInt("startSeconds", 0);
        // onPageFinished can fire more than once while a provider transitions
        // from an advert to its loader and then into the game. Keep the clock
        // monotonic for the lifetime of this mounted WebView.
        if (timerRunning) {
            call.resolve();
            return;
        }
        timerHandler.removeCallbacks(timerTick);
        timerStartSeconds = Math.max(0, startSeconds);
        timerStartedAtMs = SystemClock.elapsedRealtime();
        timerRunning = true;
        timerHandler.post(timerTick);
        call.resolve();
    }

    @PluginMethod
    public void hideTimer(PluginCall call) {
        stopTimer();
        call.resolve();
    }

    private void stopTimer() {
        timerRunning = false;
        timerHandler.removeCallbacks(timerTick);
    }

    private void resetInactivityTimeout() {
        inactivityHandler.removeCallbacks(inactivityTimeout);
        long now = SystemClock.elapsedRealtime();
        long graceRemaining = Math.max(0L, inactivityEnforcementStartsAtMs - now);
        inactivityHandler.postDelayed(
                inactivityTimeout,
                graceRemaining + INACTIVITY_TIMEOUT_MS
        );
    }

    private void stopInactivityTimeout() {
        inactivityHandler.removeCallbacks(inactivityTimeout);
        inactivityEnforcementStartsAtMs = 0L;
    }

    private void unmountInternal() {
        controlsHandler.removeCallbacks(hideControls);
        lastSwipe = 0;
        stopTimer();
        stopInactivityTimeout();
        if (gameWebView != null) {
            View parent = (View) gameWebView.getParent();
            if (parent instanceof ViewGroup) {
                ((ViewGroup) parent).removeView(gameWebView);
            }
            gameWebView.stopLoading();
            gameWebView.destroy();
            gameWebView = null;
        }
        mainPageReadyNotified = false;
        if (gameSurface != null) {
            ((ViewGroup) gameSurface.getParent()).removeView(gameSurface);
            gameSurface = null;
            gameLoading = null;
            controls = null; clockLabel = null; claimButton = null;
            getBridge().getWebView().setVisibility(View.VISIBLE);
            setSystemBars(true);
            getActivity().getWindow().getDecorView().setSystemUiVisibility(previousSystemUi);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams attrs = getActivity().getWindow().getAttributes();
                attrs.layoutInDisplayCutoutMode = previousCutoutMode;
                getActivity().getWindow().setAttributes(attrs);
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopTimer();
        stopInactivityTimeout();
        unmountInternal();
    }
}
