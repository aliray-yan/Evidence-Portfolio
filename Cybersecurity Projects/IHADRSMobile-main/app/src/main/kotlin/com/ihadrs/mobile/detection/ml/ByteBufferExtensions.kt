package com.ihadrs.mobile.detection.ml

import java.nio.ByteBuffer
import java.nio.ByteOrder

fun ByteArray.toDirectBuffer(): ByteBuffer =
    ByteBuffer.allocateDirect(size).order(ByteOrder.nativeOrder()).also { buffer ->
        buffer.put(this)
        buffer.rewind()
    }
