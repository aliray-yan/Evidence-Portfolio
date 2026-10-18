package com.ihadrs.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ihadrs.mobile.domain.models.Severity
import com.ihadrs.mobile.ui.theme.IhadrsAmber
import com.ihadrs.mobile.ui.theme.IhadrsBlue
import com.ihadrs.mobile.ui.theme.IhadrsGreen
import com.ihadrs.mobile.ui.theme.IhadrsMuted
import com.ihadrs.mobile.ui.theme.IhadrsRed

@Composable
fun PageHeader(
    title: String,
    subtitle: String? = null
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
        if (subtitle != null) {
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = IhadrsMuted)
        }
    }
}

@Composable
fun SectionTitle(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
}

@Composable
fun InfoPanel(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
fun SeverityChip(severity: Severity) {
    val color = severityColor(severity)
    AssistChip(
        onClick = {},
        label = { Text(severity.name) },
        leadingIcon = {
            Box(
                modifier = Modifier
                    .width(8.dp)
                    .height(8.dp)
                    .background(color = color, shape = RoundedCornerShape(8.dp))
            )
        }
    )
}

@Composable
fun RiskMeter(score: Int, modifier: Modifier = Modifier) {
    val color = when {
        score >= 80 -> IhadrsRed
        score >= 50 -> IhadrsAmber
        score > 0 -> IhadrsBlue
        else -> IhadrsGreen
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Risk score", style = MaterialTheme.typography.bodyMedium)
            Text("$score/100", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
        }
        LinearProgressIndicator(
            progress = score.coerceIn(0, 100) / 100f,
            modifier = Modifier.fillMaxWidth().height(8.dp),
            color = color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}

fun severityColor(severity: Severity): Color = when (severity) {
    Severity.CRITICAL -> IhadrsRed
    Severity.HIGH -> IhadrsRed
    Severity.MEDIUM -> IhadrsAmber
    Severity.LOW -> IhadrsGreen
}
