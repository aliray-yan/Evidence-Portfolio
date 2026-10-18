package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.AppPolicyDao
import com.ihadrs.mobile.data.local.entities.AppPolicyEntity
import com.ihadrs.mobile.data.models.AppPolicy
import com.ihadrs.mobile.data.models.AppPolicyStatus
import com.ihadrs.mobile.data.models.TimelineEventType
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class AppPolicyRepository @Inject constructor(
    private val dao: AppPolicyDao,
    private val timelineRepository: TimelineRepository
) {
    fun observePolicy(packageName: String): Flow<AppPolicy> =
        dao.observePolicy(packageName).map { it?.toModel() ?: AppPolicy(packageName = packageName) }

    suspend fun getPolicy(packageName: String): AppPolicy =
        dao.getPolicy(packageName)?.toModel() ?: AppPolicy(packageName = packageName)

    suspend fun setPolicy(packageName: String, status: AppPolicyStatus) {
        if (status == AppPolicyStatus.DEFAULT) {
            dao.delete(packageName)
        } else {
            dao.upsert(
                AppPolicyEntity(
                    packageName = packageName,
                    status = status.name,
                    updatedAt = System.currentTimeMillis()
                )
            )
        }
        timelineRepository.record(
            type = TimelineEventType.APP_POLICY_CHANGED,
            title = "App policy changed",
            detail = "$packageName set to ${status.name.lowercase()}",
            packageName = packageName
        )
    }
}

private fun AppPolicyEntity.toModel(): AppPolicy =
    AppPolicy(
        packageName = packageName,
        status = runCatching { AppPolicyStatus.valueOf(status) }.getOrDefault(AppPolicyStatus.DEFAULT),
        updatedAt = updatedAt
    )
