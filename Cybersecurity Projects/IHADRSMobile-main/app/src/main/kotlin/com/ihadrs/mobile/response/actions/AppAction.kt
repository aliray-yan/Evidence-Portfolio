package com.ihadrs.mobile.response.actions

import android.content.Context
import android.content.Intent
import android.net.Uri

object AppAction {
    fun uninstallIntent(packageName: String): Intent =
        Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}
