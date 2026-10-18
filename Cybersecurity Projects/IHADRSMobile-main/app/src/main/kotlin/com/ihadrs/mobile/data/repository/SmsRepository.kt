package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.SmsEventDao
import com.ihadrs.mobile.data.local.entities.SmsEventEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SmsRepository @Inject constructor(
    private val dao: SmsEventDao
) {
    suspend fun record(sender: String, preview: String, score: Int, links: List<String>) {
        dao.insert(
            SmsEventEntity(
                id = "${System.currentTimeMillis()}-$sender",
                sender = sender,
                bodyPreview = preview.take(120),
                timestamp = System.currentTimeMillis(),
                phishingScore = score,
                suspiciousLinks = links
            )
        )
    }
}
