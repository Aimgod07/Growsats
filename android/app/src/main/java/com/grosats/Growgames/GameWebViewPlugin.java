package com.grosats.Growgames; // ⚠️ CHANGE THIS to match your MainActivity's exact package name/case

import android.annotation.SuppressLint;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.view.DisplayCutout;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GameWebView")
public class GameWebViewPlugin extends Plugin {

    private WebView gameWebView;

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
        if (url == null) {
            call.reject("url is required");
            return;
        }

        double x = call.getDouble("x", 0.0);
        double y = call.getDouble("y", 0.0);
        double width = call.getDouble("width", 0.0);
        double height = call.getDouble("height", 0.0);

        getActivity().runOnUiThread(() -> {
            unmountInternal();

            gameWebView = new WebView(getContext());
            WebSettings settings = gameWebView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            gameWebView.setBackgroundColor(Color.TRANSPARENT);

            gameWebView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String finishedUrl) {
                    notifyListeners("game:ready", new JSObject());
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    JSObject ret = new JSObject();
                    ret.put("message", description);
                    notifyListeners("game:error", ret);
                }
            });
            gameWebView.setWebChromeClient(new WebChromeClient());

            float density = getContext().getResources().getDisplayMetrics().density;
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    (int) (width * density),
                    (int) (height * density)
            );
            params.leftMargin = (int) (x * density);
            params.topMargin = (int) (y * density);
            params.gravity = Gravity.TOP | Gravity.START;

            ViewGroup rootView = getActivity().getWindow().getDecorView().findViewById(android.R.id.content);
            rootView.addView(gameWebView, params);

            gameWebView.loadUrl(url);

            call.resolve();
        });
    }

    @PluginMethod
    public void resize(PluginCall call) {
        if (gameWebView == null) {
            call.reject("GameWebView is not mounted");
            return;
        }

        double x = call.getDouble("x", 0.0);
        double y = call.getDouble("y", 0.0);
        double width = call.getDouble("width", 0.0);
        double height = call.getDouble("height", 0.0);

        getActivity().runOnUiThread(() -> {
            if (gameWebView == null) return;
            float density = getContext().getResources().getDisplayMetrics().density;
            FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) gameWebView.getLayoutParams();
            params.width = (int) (width * density);
            params.height = (int) (height * density);
            params.leftMargin = (int) (x * density);
            params.topMargin = (int) (y * density);
            gameWebView.setLayoutParams(params);
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
        String orientation = call.getString("orientation", "portrait");
        getActivity().runOnUiThread(() -> {
            if ("landscape".equals(orientation)) {
                getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            } else {
                getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            }
            call.resolve();
        });
    }

    private void unmountInternal() {
        if (gameWebView != null) {
            View parent = (View) gameWebView.getParent();
            if (parent instanceof ViewGroup) {
                ((ViewGroup) parent).removeView(gameWebView);
            }
            gameWebView.stopLoading();
            gameWebView.destroy();
            gameWebView = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        unmountInternal();
    }
}