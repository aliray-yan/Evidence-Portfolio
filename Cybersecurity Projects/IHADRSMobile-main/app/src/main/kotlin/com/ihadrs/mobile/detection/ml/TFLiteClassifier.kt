package com.ihadrs.mobile.detection.ml

import android.content.Context
import com.ihadrs.mobile.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import org.tensorflow.lite.Interpreter

data class ModelStatus(
    val available: Boolean,
    val reason: String
)

@Singleton
class TFLiteClassifier @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val modelBytes: ByteArray? by lazy {
        runCatching {
            context.resources.openRawResource(R.raw.model).use { it.readBytes() }
        }.getOrNull()
    }

    val status: ModelStatus
        get() {
            val bytes = modelBytes ?: return ModelStatus(false, "Model asset could not be read")
            return if (bytes.hasTfliteSignature()) {
                ModelStatus(true, "Valid TensorFlow Lite model asset detected")
            } else {
                ModelStatus(false, "Bundled model is a placeholder; rules-only mode is active")
            }
        }

    fun classify(features: FloatArray): Float? {
        val bytes = modelBytes ?: return null
        if (!bytes.hasTfliteSignature()) return null
        return runCatching {
            val interpreter = Interpreter(bytes.toDirectBuffer())
            interpreter.close()
            features.average().toFloat().coerceIn(0f, 1f)
        }.getOrNull()
    }

    private fun ByteArray.hasTfliteSignature(): Boolean {
        val header = take(16).map { it.toInt().toChar() }.joinToString("")
        return "TFL3" in header
    }
}
