package com.voicetranslate

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.*
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream

class AudioCaptureModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    ActivityEventListener {

    companion object {
        const val NAME = "AudioCaptureModule"
        const val MEDIA_PROJECTION_REQUEST = 1001
        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private var mediaProjection: MediaProjection? = null
    private var audioRecord: AudioRecord? = null
    private var isCapturing = false
    private var captureThread: Thread? = null
    private var pendingPromise: Promise? = null
    private lateinit var projectionManager: MediaProjectionManager

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName() = NAME

    // ─── Called from JS to request MediaProjection permission ───────────────
    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity found")
            return
        }

        projectionManager = activity
            .getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        pendingPromise = promise
        activity.startActivityForResult(
            projectionManager.createScreenCaptureIntent(),
            MEDIA_PROJECTION_REQUEST
        )
    }

    // ─── Start capturing system audio ───────────────────────────────────────
    @ReactMethod
    @RequiresApi(Build.VERSION_CODES.Q)
    fun startCapture(promise: Promise) {
        if (mediaProjection == null) {
            promise.reject("NO_PROJECTION", "Call requestPermission first")
            return
        }

        if (isCapturing) {
            promise.resolve("Already capturing")
            return
        }

        val minBuffer = AudioRecord.getMinBufferSize(
            SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT
        )

        // AudioPlaybackCaptureConfig lets us capture WhatsApp audio output
        val config = AudioPlaybackCaptureConfiguration.Builder(mediaProjection!!)
            .addMatchingUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .addMatchingUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
            .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
            .build()

        audioRecord = AudioRecord.Builder()
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AUDIO_FORMAT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(CHANNEL_CONFIG)
                    .build()
            )
            .setBufferSizeInBytes(minBuffer * 4)
            .setAudioPlaybackCaptureConfig(config)
            .build()

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            promise.reject("INIT_FAILED", "AudioRecord failed to initialize")
            return
        }

        isCapturing = true
        audioRecord?.startRecording()

        // Start capture loop on background thread
        captureThread = Thread {
            streamAudioToJS(minBuffer)
        }.apply {
            isDaemon = true
            start()
        }

        promise.resolve("Capture started")
    }

    // ─── Stop capturing ──────────────────────────────────────────────────────
    @ReactMethod
    fun stopCapture(promise: Promise) {
        isCapturing = false
        captureThread?.interrupt()
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        mediaProjection?.stop()
        mediaProjection = null
        promise.resolve("Capture stopped")
    }

    // ─── Stream audio chunks to JS via events ───────────────────────────────
    private fun streamAudioToJS(minBuffer: Int) {
        val buffer = ShortArray(minBuffer * 2)
        val chunkBuffer = ByteArrayOutputStream()
        var chunkSampleCount = 0
        // ~500ms worth of samples at 16kHz
        val samplesPerChunk = SAMPLE_RATE / 2

        while (isCapturing) {
            val read = audioRecord?.read(buffer, 0, buffer.size) ?: break

            if (read > 0) {
                // Convert shorts to bytes for JS
                for (i in 0 until read) {
                    val sample = buffer[i]
                    chunkBuffer.write(sample.toInt() and 0xFF)
                    chunkBuffer.write((sample.toInt() shr 8) and 0xFF)
                }
                chunkSampleCount += read

                // Every ~500ms, send chunk to JS
                if (chunkSampleCount >= samplesPerChunk) {
                    val audioData = chunkBuffer.toByteArray()
                    val base64Chunk = android.util.Base64.encodeToString(
                        audioData,
                        android.util.Base64.NO_WRAP
                    )

                    // Emit event to JS
                    sendEvent("onAudioChunk", base64Chunk)

                    // Reset chunk buffer
                    chunkBuffer.reset()
                    chunkSampleCount = 0
                }
            }
        }
    }

    // ─── Send event to JS ────────────────────────────────────────────────────
    private fun sendEvent(eventName: String, data: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    // ─── Handle MediaProjection permission result ────────────────────────────
    override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == MEDIA_PROJECTION_REQUEST) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                mediaProjection = projectionManager.getMediaProjection(resultCode, data)
                pendingPromise?.resolve("Permission granted")
            } else {
                pendingPromise?.reject("PERMISSION_DENIED", "User denied projection")
            }
            pendingPromise = null
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    // ─── Also capture mic audio (speaker's voice) ───────────────────────────
    @ReactMethod
    fun startMicCapture(promise: Promise) {
        if (isCapturing) {
            promise.resolve("Already capturing")
            return
        }

        val minBuffer = AudioRecord.getMinBufferSize(
            SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT
        )

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            minBuffer * 4
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            promise.reject("INIT_FAILED", "Mic AudioRecord failed")
            return
        }

        isCapturing = true
        audioRecord?.startRecording()

        captureThread = Thread {
            streamAudioToJS(minBuffer)
        }.apply {
            isDaemon = true
            start()
        }

        promise.resolve("Mic capture started")
    }

    // ─── Add listener (required by RN event emitter) ─────────────────────────
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}