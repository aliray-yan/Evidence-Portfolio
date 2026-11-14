package com.safehaven.app.domain

object PhoneNumber {
    private val valid = Regex("^\\+?[0-9]{3,15}$")
    private val separators = Regex("[\\s\\-().]")

    /**
     * Strips separators and converts a leading "00" to "+". Returns null when the result is not
     * a plausible dialable number. Three digits are accepted so emulator numbers like 5554 work.
     */
    fun normalize(raw: String): String? {
        var s = raw.trim().replace(separators, "")
        if (s.startsWith("00") && s.length > 4) s = "+" + s.substring(2)
        return if (valid.matches(s)) s else null
    }

    /** "***123": enough to recognise a number in logs without storing it in full. */
    fun mask(phone: String): String = "***" + phone.takeLast(3)
}
