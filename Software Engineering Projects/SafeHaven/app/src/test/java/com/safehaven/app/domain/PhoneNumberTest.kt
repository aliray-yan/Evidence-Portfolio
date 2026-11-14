package com.safehaven.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PhoneNumberTest {
    @Test fun stripsFormatting() = assertEquals("+923001234567", PhoneNumber.normalize(" +92 (300) 123-4567 "))

    @Test fun convertsDoubleZeroPrefix() = assertEquals("+923001234567", PhoneNumber.normalize("00923001234567"))

    @Test fun keepsLocalNumbers() = assertEquals("03001234567", PhoneNumber.normalize("0300-1234567"))

    @Test fun acceptsEmulatorNumbers() = assertEquals("5554", PhoneNumber.normalize("5554"))

    @Test fun rejectsLettersAndTooShortOrLong() {
        assertNull(PhoneNumber.normalize("abc123"))
        assertNull(PhoneNumber.normalize("12"))
        assertNull(PhoneNumber.normalize("+1234567890123456"))
        assertNull(PhoneNumber.normalize(""))
    }

    @Test fun masksAllButLastThreeDigits() = assertEquals("***567", PhoneNumber.mask("+923001234567"))
}
