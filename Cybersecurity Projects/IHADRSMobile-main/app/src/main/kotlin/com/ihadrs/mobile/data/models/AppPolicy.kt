package com.ihadrs.mobile.data.models

data class AppPolicy(
    val packageName: String,
    val status: AppPolicyStatus = AppPolicyStatus.DEFAULT,
    val updatedAt: Long = System.currentTimeMillis()
)
