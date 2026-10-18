package com.ihadrs.mobile.detection.ml

import com.ihadrs.mobile.data.models.AppInfo
import javax.inject.Inject

class FeatureExtractor @Inject constructor() {
    fun appFeatures(appInfo: AppInfo): FloatArray =
        floatArrayOf(appInfo.riskScore / 100f, appInfo.requestedPermissions.size / 20f)
}
