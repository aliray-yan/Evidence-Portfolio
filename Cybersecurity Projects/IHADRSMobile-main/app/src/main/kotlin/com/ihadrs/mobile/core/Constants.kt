package com.ihadrs.mobile.core

object Constants {
    const val DATABASE_NAME = "ihadrs.db"
    const val MONITORING_NOTIFICATION_ID = 1001
    const val SCAN_NOTIFICATION_ID = 1002
    const val NETWORK_FLOW_NOTIFICATION_ID = 1003
    const val MONITORING_CHANNEL_ID = "ihadrs_monitoring"
    const val ALERT_CHANNEL_ID = "ihadrs_alerts"
    const val SCAN_CHANNEL_ID = "ihadrs_scans"
    const val DEEP_SCAN_WORK_NAME = "ihadrs_deep_scan"
    const val SOC_SYNC_WORK_NAME = "ihadrs_soc_sync"
    const val ACTION_STOP_MONITORING = "com.ihadrs.mobile.action.STOP_MONITORING"
    const val ACTION_DISMISS_THREAT = "com.ihadrs.mobile.action.DISMISS_THREAT"
    const val EXTRA_THREAT_ID = "extra_threat_id"
}
