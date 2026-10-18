package com.ihadrs.mobile.data.local.database

import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun fromStringList(value: List<String>): String = value.joinToString(SEPARATOR)

    @TypeConverter
    fun toStringList(value: String): List<String> =
        if (value.isBlank()) emptyList() else value.split(SEPARATOR)

    private companion object {
        const val SEPARATOR = "||"
    }
}
