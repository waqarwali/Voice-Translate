package com.voicetranslate

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat

class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var overlayView: View
    private lateinit var statusText: TextView
    private lateinit var transcriptText: TextView
    private lateinit var translationText: TextView
    private lateinit var toggleButton: Button
    private lateinit var stopButton: Button

    private var isTranslating = false
    private val CHANNEL_ID = "VoiceTranslateChannel"
    private val NOTIF_ID = 1

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        setupOverlay()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "UPDATE_TRANSCRIPT" -> {
                val original = intent.getStringExtra("original") ?: ""
                val translated = intent.getStringExtra("translated") ?: ""
                updateTranscript(original, translated)
            }
            "STOP" -> stopSelf()
        }
        return START_STICKY
    }

    private fun setupOverlay() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Create overlay layout programmatically
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            setBackgroundColor(Color.parseColor("#CC000000")) // semi-transparent black
        }

        // Status indicator
        statusText = TextView(this).apply {
            text = "● Translating"
            setTextColor(Color.parseColor("#00FF88"))
            textSize = 12f
        }

        // Original transcript
        transcriptText = TextView(this).apply {
            text = "Listening..."
            setTextColor(Color.WHITE)
            textSize = 13f
            setPadding(0, 8, 0, 4)
        }

        // Translated text
        translationText = TextView(this).apply {
            text = ""
            setTextColor(Color.parseColor("#FFD700"))
            textSize = 14f
            setPadding(0, 4, 0, 8)
        }

        // Buttons row
        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }

        toggleButton = Button(this).apply {
            text = "Pause"
            textSize = 11f
            setOnClickListener { toggleTranslation() }
        }

        stopButton = Button(this).apply {
            text = "Stop"
            textSize = 11f
            setOnClickListener {
                // Tell RN the service is stopping
                val stopIntent = Intent("com.voicetranslate.OVERLAY_STOPPED")
                sendBroadcast(stopIntent)
                stopSelf()
            }
        }

        btnRow.addView(toggleButton)
        btnRow.addView(stopButton)

        layout.addView(statusText)
        layout.addView(transcriptText)
        layout.addView(translationText)
        layout.addView(btnRow)

        // Window layout params
        val params = WindowManager.LayoutParams(
            600,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 100
        }

        overlayView = layout
        windowManager.addView(overlayView, params)

        // Make overlay draggable
        makeDraggable(overlayView, params)
    }

    private fun makeDraggable(view: View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX - initialTouchX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(view, params)
                    true
                }
                else -> false
            }
        }
    }

    fun updateTranscript(original: String, translated: String) {
        overlayView.post {
            transcriptText.text = original
            translationText.text = translated
        }
    }

    private fun toggleTranslation() {
        isTranslating = !isTranslating
        toggleButton.text = if (isTranslating) "Pause" else "Resume"
        statusText.text = if (isTranslating) "● Translating" else "⏸ Paused"

        val intent = Intent("com.voicetranslate.TOGGLE_TRANSLATION")
        intent.putExtra("isActive", isTranslating)
        sendBroadcast(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Voice Translate",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Real-time call translation"
                setSound(null, null)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("VoiceTranslate Active")
            .setContentText("Translating your call in real-time")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::overlayView.isInitialized) {
            windowManager.removeView(overlayView)
        }
    }
}