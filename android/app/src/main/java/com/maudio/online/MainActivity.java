package com.maudio.online;

import com.getcapacitor.BridgeActivity;
import com.maudio.online.player.MaudioPlayerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MaudioPlayerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
