package com.ihadrs.mobile.utils

import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import kotlin.math.min

object ReportPdfExporter {
    fun export(context: Context, reportText: String): Uri {
        val reportDir = File(context.cacheDir, "reports").apply { mkdirs() }
        val reportFile = File(reportDir, "ihadrs-security-report.pdf")
        val document = PdfDocument()
        try {
            val normalPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textSize = 11f
                color = android.graphics.Color.rgb(15, 23, 42)
            }
            val titlePaint = Paint(normalPaint).apply {
                textSize = 18f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            }
            val pageWidth = 595
            val pageHeight = 842
            val margin = 42f
            val lineHeight = 16f
            var pageNumber = 1
            var page = document.startPage(PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create())
            var canvas = page.canvas
            var y = margin

            fun newPage() {
                document.finishPage(page)
                pageNumber++
                page = document.startPage(PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create())
                canvas = page.canvas
                y = margin
            }

            fun drawWrapped(text: String, paint: Paint) {
                val lines = wrap(text, paint, pageWidth - margin * 2)
                lines.forEach { line ->
                    if (y > pageHeight - margin) newPage()
                    canvas.drawText(line, margin, y, paint)
                    y += lineHeight
                }
            }

            reportText.lines().forEachIndexed { index, line ->
                val paint = if (index == 0) titlePaint else normalPaint
                if (line.isBlank()) {
                    y += lineHeight / 2
                } else {
                    drawWrapped(line, paint)
                }
            }
            document.finishPage(page)
            reportFile.outputStream().use(document::writeTo)
        } finally {
            document.close()
        }
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", reportFile)
    }

    private fun wrap(text: String, paint: Paint, maxWidth: Float): List<String> {
        if (paint.measureText(text) <= maxWidth) return listOf(text)
        val words = text.split(" ")
        val lines = mutableListOf<String>()
        var current = ""
        words.forEach { word ->
            val candidate = if (current.isBlank()) word else "$current $word"
            if (paint.measureText(candidate) <= maxWidth) {
                current = candidate
            } else {
                if (current.isNotBlank()) lines += current
                current = word.chunkIfNeeded(paint, maxWidth, lines)
            }
        }
        if (current.isNotBlank()) lines += current
        return lines
    }

    private fun String.chunkIfNeeded(paint: Paint, maxWidth: Float, lines: MutableList<String>): String {
        if (paint.measureText(this) <= maxWidth) return this
        var remaining = this
        while (paint.measureText(remaining) > maxWidth && remaining.length > 1) {
            var end = min(remaining.length, 24)
            while (end > 1 && paint.measureText(remaining.substring(0, end)) > maxWidth) end--
            lines += remaining.substring(0, end)
            remaining = remaining.substring(end)
        }
        return remaining
    }
}
