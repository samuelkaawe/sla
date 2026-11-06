#!/usr/bin/env bash
# Ajusta o projeto Android gerado pelo Capacitor: paisagem, vibração, tela cheia e cleartext (ws://)
set -e
M=android/app/src/main/AndroidManifest.xml
grep -q screenOrientation "$M" || sed -i 's|<activity|<activity android:screenOrientation="sensorLandscape"|' "$M"
grep -q usesCleartextTraffic "$M" || sed -i 's|<application|<application android:usesCleartextTraffic="true"|' "$M"
grep -q VIBRATE "$M" || sed -i 's|</manifest>|    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>|' "$M"
cat > android/app/src/main/java/com/remotepad/app/MainActivity.java <<'JAVA'
package com.remotepad.app;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  private volatile boolean capture = false;
  @Override public void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getBridge().getWebView().addJavascriptInterface(new Object() {
      @JavascriptInterface public void capture(boolean on) { capture = on; }
      @JavascriptInterface public void vibrate(int l, int s) {
        Vibrator v = (Vibrator) MainActivity.this.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null) return;
        int a = Math.max(0, Math.min(255, Math.max(l, s)));
        if (a == 0) { v.cancel(); return; }
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(1500, a));
        else v.vibrate(1500);
      }
    }, "PPNative");
    hide();
  }
  @Override public boolean dispatchKeyEvent(KeyEvent e) {
    int k = e.getKeyCode();
    if (capture && (k == KeyEvent.KEYCODE_VOLUME_UP || k == KeyEvent.KEYCODE_VOLUME_DOWN)) {
      if (e.getRepeatCount() == 0) {
        boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
        final String js = "window.__vk&&window.__vk('" + (k == KeyEvent.KEYCODE_VOLUME_UP ? "up" : "down") + "'," + down + ")";
        runOnUiThread(() -> getBridge().getWebView().evaluateJavascript(js, null));
      }
      return true;
    }
    return super.dispatchKeyEvent(e);
  }
  @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hide(); }
  private void hide() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  }
}
JAVA
