package com.ihadrs.mobile.domain.usecases.detection

import com.ihadrs.mobile.data.models.AppInfo
import com.ihadrs.mobile.detection.analyzers.AppAnalyzer
import javax.inject.Inject

class AnalyzeAppUseCase @Inject constructor(
    private val appAnalyzer: AppAnalyzer
) {
    operator fun invoke(appInfo: AppInfo) = appAnalyzer.analyze(appInfo)
}
