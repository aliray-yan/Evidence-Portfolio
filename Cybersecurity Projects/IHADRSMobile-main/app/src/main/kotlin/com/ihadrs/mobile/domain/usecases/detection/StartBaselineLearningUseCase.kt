package com.ihadrs.mobile.domain.usecases.detection

import android.content.Context
import com.ihadrs.mobile.data.models.TimelineEventType
import com.ihadrs.mobile.data.repository.SettingsRepository
import com.ihadrs.mobile.data.repository.TimelineRepository
import com.ihadrs.mobile.monitoring.workers.BaselineLearningWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class StartBaselineLearningUseCase @Inject constructor(
    @ApplicationContext private val context: Context,
    private val settingsRepository: SettingsRepository,
    private val timelineRepository: TimelineRepository
) {
    suspend operator fun invoke() {
        val startedAt = System.currentTimeMillis()
        val endsAt = startedAt + BASELINE_WINDOW_MS
        settingsRepository.setBaselineLearning(startedAt, endsAt)
        timelineRepository.record(
            type = TimelineEventType.BASELINE_LEARNING_STARTED,
            title = "Baseline learning started",
            detail = "IHADRS will observe stable device behavior for 10 minutes before calming routine app findings."
        )
        BaselineLearningWorker.schedule(context)
    }

    private companion object {
        const val BASELINE_WINDOW_MS = 10 * 60 * 1000L
    }
}
