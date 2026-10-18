package com.ihadrs.mobile.utils

import android.util.Base64
import java.security.MessageDigest
import java.security.SecureRandom

object CryptoUtils {
    fun sha256(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
        return Base64.encodeToString(digest, Base64.NO_WRAP)
    }

    fun randomSalt(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    fun passwordHash(username: String, password: String, salt: String): String =
        sha256("$salt:${username.trim().lowercase()}:$password")
}
