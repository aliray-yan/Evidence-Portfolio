package com.ihadrs.mobile.di

import com.ihadrs.mobile.detection.intel.LocalUrlThreatIntel
import com.ihadrs.mobile.detection.intel.UrlThreatIntel
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class ThreatIntelModule {
    @Binds
    @Singleton
    abstract fun bindUrlThreatIntel(localUrlThreatIntel: LocalUrlThreatIntel): UrlThreatIntel
}
