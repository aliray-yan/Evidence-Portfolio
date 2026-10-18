package com.ihadrs.mobile.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_policies")
data class AppPolicyEntity(
    @PrimaryKey val packageName: String,
    val status: String,
    val updatedAt: Long
)
