package com.ihadrs.mobile.di

import android.content.Context
import androidx.room.Room
import com.ihadrs.mobile.core.Constants
import com.ihadrs.mobile.data.local.database.AppDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, Constants.DATABASE_NAME)
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideThreatEventDao(db: AppDatabase) = db.threatEventDao()
    @Provides fun provideAppInfoDao(db: AppDatabase) = db.appInfoDao()
    @Provides fun provideNetworkEventDao(db: AppDatabase) = db.networkEventDao()
    @Provides fun provideSmsEventDao(db: AppDatabase) = db.smsEventDao()
    @Provides fun provideFileEventDao(db: AppDatabase) = db.fileEventDao()
    @Provides fun provideScanRunDao(db: AppDatabase) = db.scanRunDao()
    @Provides fun provideAppPolicyDao(db: AppDatabase) = db.appPolicyDao()
    @Provides fun provideTimelineEventDao(db: AppDatabase) = db.timelineEventDao()
    @Provides fun provideAppBehaviorDao(db: AppDatabase) = db.appBehaviorDao()
    @Provides fun provideSocOutboundAlertDao(db: AppDatabase) = db.socOutboundAlertDao()
    @Provides fun provideNetworkFlowDao(db: AppDatabase) = db.networkFlowDao()
    @Provides fun provideDnsCacheDao(db: AppDatabase) = db.dnsCacheDao()
}
