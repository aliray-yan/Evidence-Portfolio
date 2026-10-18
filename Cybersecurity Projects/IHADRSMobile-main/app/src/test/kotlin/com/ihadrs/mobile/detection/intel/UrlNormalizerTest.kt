package com.ihadrs.mobile.detection.intel

import org.junit.Assert.assertEquals
import org.junit.Test

class UrlNormalizerTest {
    @Test
    fun normalize_addsSchemeAndRemovesWww() {
        val normalized = UrlNormalizer.normalize("www.Example.com/login.")!!

        assertEquals("example.com", normalized.host)
        assertEquals("https://example.com/login", normalized.normalized)
    }
}
