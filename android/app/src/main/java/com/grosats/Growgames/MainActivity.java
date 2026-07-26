package com.grosats.Growgames;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.grosats.Growgames.GameWebViewPlugin; // adjust to your package

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GameWebViewPlugin.class);
        super.onCreate(savedInstanceState);
    }
}