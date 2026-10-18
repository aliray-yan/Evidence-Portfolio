package com.ihadrs.mobile.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ihadrs.mobile.data.local.preferences.UserPreferences
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.utils.CryptoUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {
    val preferences = settingsRepository.preferences
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UserPreferences())

    private val _authenticated = MutableStateFlow(false)
    val authenticated = _authenticated.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message = _message.asStateFlow()

    fun createLogin(username: String, password: String, confirmPassword: String) {
        val cleanUsername = username.trim()
        when {
            cleanUsername.length < 3 -> _message.value = "Use at least 3 characters for the username."
            password.length < 6 -> _message.value = "Use at least 6 characters for the password."
            password != confirmPassword -> _message.value = "Passwords do not match."
            else -> viewModelScope.launch {
                val salt = CryptoUtils.randomSalt()
                val hash = CryptoUtils.passwordHash(cleanUsername, password, salt)
                settingsRepository.setAuthCredentials(cleanUsername, hash, salt)
                _authenticated.value = true
                _message.value = null
            }
        }
    }

    fun login(username: String, password: String) {
        val prefs = preferences.value
        val expectedHash = prefs.authPasswordHash
        val enteredHash = CryptoUtils.passwordHash(username, password, prefs.authSalt)
        val usernameMatches = username.trim().equals(prefs.authUsername, ignoreCase = true)
        if (usernameMatches && expectedHash.isNotBlank() && enteredHash == expectedHash) {
            _authenticated.value = true
            _message.value = null
        } else {
            _message.value = "Username or password is incorrect."
        }
    }

    fun signOut() {
        _authenticated.value = false
    }
}
