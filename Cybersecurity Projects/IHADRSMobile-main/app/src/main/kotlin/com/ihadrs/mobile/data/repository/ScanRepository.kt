package com.ihadrs.mobile.data.repository

import com.ihadrs.mobile.data.local.dao.ScanRunDao
import com.ihadrs.mobile.data.local.entities.ScanRunEntity
import com.ihadrs.mobile.data.models.ScanRun
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class ScanRepository @Inject constructor(
    private val scanRunDao: ScanRunDao
) {
    fun observeRecentScans(): Flow<List<ScanRun>> =
        scanRunDao.observeRecent().map { runs -> runs.map { it.toModel() } }

    fun observeLatestScan(): Flow<ScanRun?> =
        scanRunDao.observeLatest().map { it?.toModel() }

    suspend fun getRecentScans(limit: Int = 10): List<ScanRun> =
        scanRunDao.getRecent(limit).map { it.toModel() }

    suspend fun record(scanRun: ScanRun) {
        scanRunDao.insert(scanRun.toEntity())
    }
}

private fun ScanRunEntity.toModel(): ScanRun =
    ScanRun(id, startedAt, finishedAt, scannedApps, findings, status)

private fun ScanRun.toEntity(): ScanRunEntity =
    ScanRunEntity(id, startedAt, finishedAt, scannedApps, findings, status)
