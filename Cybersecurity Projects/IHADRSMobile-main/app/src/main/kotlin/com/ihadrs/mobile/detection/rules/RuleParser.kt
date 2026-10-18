package com.ihadrs.mobile.detection.rules

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken
import com.ihadrs.mobile.data.models.DetectionRule
import com.ihadrs.mobile.domain.models.AttackCategory
import com.ihadrs.mobile.domain.models.Severity
import javax.inject.Inject

class RuleParser @Inject constructor(
    private val gson: Gson
) {
    fun parse(json: String): List<DetectionRule> {
        val type = object : TypeToken<List<RawDetectionRule>>() {}.type
        val rawRules: List<RawDetectionRule> = gson.fromJson(json, type)
        return rawRules.mapNotNull { raw ->
            val severity = runCatching { Severity.valueOf(raw.severity) }.getOrNull()
            val category = runCatching { AttackCategory.valueOf(raw.category) }.getOrNull()
            if (
                raw.id.isBlank() ||
                raw.name.isBlank() ||
                raw.description.isBlank() ||
                raw.mitreTechnique.isBlank() ||
                severity == null ||
                category == null
            ) {
                null
            } else {
                DetectionRule(
                    id = raw.id,
                    name = raw.name,
                    description = raw.description,
                    severity = severity,
                    category = category,
                    mitreTechnique = raw.mitreTechnique,
                    enabled = raw.enabled
                )
            }
        }
    }
}

private data class RawDetectionRule(
    @SerializedName("id")
    val id: String = "",
    @SerializedName("name")
    val name: String = "",
    @SerializedName("description")
    val description: String = "",
    @SerializedName("severity")
    val severity: String = "",
    @SerializedName("category")
    val category: String = "",
    @SerializedName("mitreTechnique")
    val mitreTechnique: String = "",
    @SerializedName("enabled")
    val enabled: Boolean = true
)
