package com.ihadrs.mobile.domain.usecases.threats

import com.ihadrs.mobile.data.repository.ThreatRepository
import javax.inject.Inject

class GetThreatsUseCase @Inject constructor(
    private val repository: ThreatRepository
) {
    operator fun invoke() = repository.observeThreats()
}
