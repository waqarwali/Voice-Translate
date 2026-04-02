package com.voicetranslate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager

class CallReceiver : BroadcastReceiver() {

    companion object {
        // WhatsApp's package name
        const val WHATSAPP_PACKAGE = "com.whatsapp"
        const val WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.intent.action.PHONE_STATE") return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)

        when (state) {
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                // Phone call started — check if WhatsApp is in foreground
                if (isWhatsAppRunning(context)) {
                    launchOverlayService(context)
                }
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                // Call ended — stop overlay service
                stopOverlayService(context)
            }
        }
    }

    private fun isWhatsAppRunning(context: Context): Boolean {
        val activityManager = context.getSystemService(
            Context.ACTIVITY_SERVICE
        ) as android.app.ActivityManager

        // Check recent tasks for WhatsApp
        val runningTasks = activityManager.getRunningTasks(10)
        return runningTasks.any { task ->
            val packageName = task.topActivity?.packageName ?: ""
            packageName == WHATSAPP_PACKAGE ||
            packageName == WHATSAPP_BUSINESS_PACKAGE
        }
    }

    private fun launchOverlayService(context: Context) {
        // Check overlay permission first
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(context)) {
                // Launch app to ask for permission
                val permIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    putExtra("REQUEST_OVERLAY_PERMISSION", true)
                }
                context.startActivity(permIntent)
                return
            }
        }

        val serviceIntent = Intent(context, OverlayService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }

    private fun stopOverlayService(context: Context) {
        val serviceIntent = Intent(context, OverlayService::class.java)
        context.stopService(serviceIntent)
    }
}