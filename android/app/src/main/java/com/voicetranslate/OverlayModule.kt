package com.voicetranslate

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class OverlayModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "OverlayModule"

    // ─── Check if overlay permission is granted ──────────────────────────────
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } else {
            promise.resolve(true)
        }
    }

    // ─── Open settings so user can grant overlay permission ──────────────────
    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    // ─── Start overlay service from JS ───────────────────────────────────────
    @ReactMethod
    fun startOverlay(promise: Promise) {
        try {
            val intent = Intent(reactContext, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve("Overlay started")
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message)
        }
    }

    // ─── Stop overlay service from JS ────────────────────────────────────────
    @ReactMethod
    fun stopOverlay(promise: Promise) {
        try {
            val intent = Intent(reactContext, OverlayService::class.java)
            reactContext.stopService(intent)
            promise.resolve("Overlay stopped")
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e.message)
        }
    }

    // ─── Update transcript shown on overlay ──────────────────────────────────
    @ReactMethod
    fun updateOverlayTranscript(original: String, translated: String) {
        val intent = Intent(reactContext, OverlayService::class.java).apply {
            action = "UPDATE_TRANSCRIPT"
            putExtra("original", original)
            putExtra("translated", translated)
        }
        reactContext.startService(intent)
    }
}