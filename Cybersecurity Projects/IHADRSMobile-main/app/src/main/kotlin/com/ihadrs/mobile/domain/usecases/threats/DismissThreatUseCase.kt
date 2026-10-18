package com.ihadrs.mobile.domain.usecases.threats

import com.ihadrs.mobile.data.repository.ThreatRepository
import javax.inject.Inject

class DismissThreatUseCase @Inject constructor(
    private val repository: ThreatRepository
) {
    suspend operator fun invoke(id: String) = repository.dismissThreat(id)
}
