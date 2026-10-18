package com.ihadrs.mobile.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.ihadrs.mobile.data.local.dao.AppBehaviorDao
import com.ihadrs.mobile.data.local.dao.AppInfoDao
import com.ihadrs.mobile.data.local.dao.AppPolicyDao
import com.ihadrs.mobile.data.local.dao.DnsCacheDao
import com.ihadrs.mobile.data.local.dao.FileEventDao
import com.ihadrs.mobile.data.local.dao.NetworkEventDao
import com.ihadrs.mobile.data.local.dao.NetworkFlowDao
import com.ihadrs.mobile.data.local.dao.ScanRunDao
import com.ihadrs.mobile.data.local.dao.SmsEventDao
import com.ihadrs.mobile.data.local.dao.SocOutboundAlertDao
import com.ihadrs.mobile.data.local.dao.ThreatEventDao
import com.ihadrs.mobile.data.local.dao.TimelineEventDao
import com.ihadrs.mobile.data.local.entities.AppBehaviorSnapshotEntity
import com.ihadrs.mobile.data.local.entities.AppInfoEntity
import com.ihadrs.mobile.data.local.entities.AppPolicyEntity
import com.ihadrs.mobile.data.local.entities.DnsCacheEntity
import com.ihadrs.mobile.data.local.entities.FileEventEntity
import com.ihadrs.mobile.data.local.entities.NetworkEventEntity
import com.ihadrs.mobile.data.local.entities.NetworkFlowEntity
import com.ihadrs.mobile.data.local.entities.ScanRunEntity
import com.ihadrs.mobile.data.local.entities.SmsEventEntity
import com.ihadrs.mobile.data.local.entities.SocOutboundAlertEntity
import com.ihadrs.mobile.data.local.entities.ThreatEventEntity
import com.ihadrs.mobile.data.local.entities.TimelineEventEntity

@Database(
    entities = [
        ThreatEventEntity::class,
        AppInfoEntity::class,
        NetworkEventEntity::class,
        SmsEventEntity::class,
        FileEventEntity::class,
        ScanRunEntity::class,
        AppPolicyEntity::class,
        TimelineEventEntity::class,
        AppBehaviorSnapshotEntity::class,
        SocOutboundAlertEntity::class,
        NetworkFlowEntity::class,
        DnsCacheEntity::class
    ],
    version = 7,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun threatEventDao(): ThreatEventDao
    abstract fun appInfoDao(): AppInfoDao
    abstract fun networkEventDao(): NetworkEventDao
    abstract fun smsEventDao(): SmsEventDao
    abstract fun fileEventDao(): FileEventDao
    abstract fun scanRunDao(): ScanRunDao
    abstract fun appPolicyDao(): AppPolicyDao
    abstract fun timelineEventDao(): TimelineEventDao
    abstract fun appBehaviorDao(): AppBehaviorDao
    abstract fun socOutboundAlertDao(): SocOutboundAlertDao
    abstract fun networkFlowDao(): NetworkFlowDao
    abstract fun dnsCacheDao(): DnsCacheDao
}
