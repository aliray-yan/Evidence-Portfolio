package com.safehaven.app.data.repo

import com.safehaven.app.data.db.ContactDao
import com.safehaven.app.data.db.ContactEntity
import com.safehaven.app.domain.PhoneNumber
import java.util.UUID
import kotlinx.coroutines.flow.Flow

class ContactsRepository(
    private val dao: ContactDao,
    private val clock: () -> Long = { System.currentTimeMillis() },
) {
    sealed interface SaveResult {
        data object Saved : SaveResult
        data class Invalid(val message: String) : SaveResult
    }

    fun observe(): Flow<List<ContactEntity>> = dao.observeAll()

    suspend fun enabled(): List<ContactEntity> = dao.getEnabled()

    suspend fun get(id: String): ContactEntity? = dao.getById(id)

    suspend fun save(id: String?, name: String, phone: String, relationship: String): SaveResult {
        val cleanName = name.trim()
        if (cleanName.isEmpty()) return SaveResult.Invalid("Enter the contact's name.")
        val number = PhoneNumber.normalize(phone)
            ?: return SaveResult.Invalid("Enter a valid phone number (digits, optionally starting with +).")
        val clash = dao.getByPhone(number)
        if (clash != null && clash.id != id) {
            return SaveResult.Invalid("${clash.name} already uses that number.")
        }

        val now = clock()
        val existing = id?.let { dao.getById(it) }
        val numberChanged = existing != null && existing.phoneNumber != number
        dao.upsert(
            ContactEntity(
                id = existing?.id ?: UUID.randomUUID().toString(),
                name = cleanName,
                phoneNumber = number,
                relationship = relationship.trim(),
                enabled = existing?.enabled ?: true,
                // A test result only applies to the number it was sent to.
                lastTestStatus = if (numberChanged) null else existing?.lastTestStatus,
                lastTestAt = if (numberChanged) null else existing?.lastTestAt,
                createdAt = existing?.createdAt ?: now,
                updatedAt = now,
            ),
        )
        return SaveResult.Saved
    }

    suspend fun setEnabled(id: String, enabled: Boolean) = dao.setEnabled(id, enabled, clock())

    suspend fun delete(id: String) = dao.delete(id)
}
