package com.ihadrs.mobile.core

import com.ihadrs.mobile.domain.models.Severity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun Long.asReadableTime(): String =
    SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()).format(Date(this))

fun Severity.displayName(): String = name.lowercase().replaceFirstChar { it.titlecase() }
