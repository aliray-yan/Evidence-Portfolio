/**
 * Doctor Dashboard JavaScript
 * Handles doctor-specific functionality
 */

/**
 * Load doctor dashboard data
 */
async function loadDoctorDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/doctor/dashboard`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load dashboard');

        const data = await response.json();
        renderDoctorDashboard(data);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        renderDoctorDashboardError();
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Render doctor dashboard data
 * @param {object} data - Dashboard data
 */
function renderDoctorDashboard(data) {
    const doctorInfo = data.doctor_info || {};

    // Update doctor name
    const doctorName = document.getElementById('doctorName');
    if (doctorName) {
        doctorName.textContent = `Welcome, ${doctorInfo.full_name || 'Doctor'}`;
    }

    // Update stats
    document.getElementById('appointmentsToday').textContent = data.appointments_today ?? 0;
    document.getElementById('pendingAppointments').textContent = data.pending_appointments ?? 0;
    document.getElementById('totalPatients').textContent = data.total_patients ?? 0;
    document.getElementById('doctorRating').textContent = Number(doctorInfo.rating || 0).toFixed(1);

    // Render upcoming schedule
    renderTodaySchedule(data.upcoming_appointments || []);

    // Render recent patients
    renderRecentPatients(data.recent_patients || []);
}

function renderDoctorDashboardError() {
    ['appointmentsToday', 'pendingAppointments', 'totalPatients', 'doctorRating'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '-';
    });

    const errorHtml = `
        <div class="text-center py-8 text-red-500">
            <i class="fas fa-circle-exclamation text-4xl mb-3"></i>
            <p>Could not load dashboard data</p>
        </div>
    `;

    const todaySchedule = document.getElementById('todaySchedule');
    const recentPatients = document.getElementById('recentPatients');
    if (todaySchedule) todaySchedule.innerHTML = errorHtml;
    if (recentPatients) recentPatients.innerHTML = errorHtml;
}

/**
 * Render today's schedule
 * @param {Array} appointments - Today's appointments
 */
function renderTodaySchedule(appointments = []) {
    const container = document.getElementById('todaySchedule');
    if (!container) return;

    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-calendar-check text-4xl mb-3"></i>
                <p>No appointments scheduled for today</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-4">
            ${appointments.slice(0, 5).map(apt => `
                <div class="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div class="w-16 text-center border-r pr-4 mr-4">
                        <p class="text-lg font-bold text-primary">${apt.time}</p>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium text-gray-800">${apt.patient_name}</p>
                        <p class="text-xs text-gray-400">${formatDate(apt.date)}</p>
                        <p class="text-sm text-gray-500">${apt.reason || 'General Consultation'}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(apt.status)}">
                        ${apt.status}
                    </span>
                </div>
            `).join('')}
        </div>
        ${appointments.length > 5 ? `
            <div class="mt-4 text-center">
                <a href="appointments.html" class="text-primary hover:underline text-sm">
                    View all ${appointments.length} appointments
                </a>
            </div>
        ` : ''}
    `;
}

/**
 * Render recent patients list
 * @param {Array} patients - Recent patients
 */
function renderRecentPatients(patients = []) {
    const container = document.getElementById('recentPatients');
    if (!container) return;

    if (patients.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-users text-4xl mb-3"></i>
                <p>No patients yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-4">
            ${patients.map(patient => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                     onclick="viewPatientHistory(${patient.patient_id})">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span class="text-primary font-semibold">
                                ${patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${patient.full_name}</p>
                            <p class="text-sm text-gray-500">
                                ${patient.latest_disease || 'No recent diagnosis'}
                            </p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Load doctor's appointments
 * @param {string} dateFilter - Optional date filter
 * @param {string} statusFilter - Optional status filter
 */
async function loadDoctorAppointments(dateFilter = null, statusFilter = null) {
    try {
        let url = `${API_URL}/api/doctor/appointments`;
        const params = new URLSearchParams();
        if (dateFilter) params.append('date_filter', dateFilter);
        if (statusFilter) params.append('status_filter', statusFilter);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load appointments');

        return await response.json();
    } catch (error) {
        console.error('Error loading appointments:', error);
        throw error;
    }
}

/**
 * Load today's appointments
 */
async function loadTodayAppointments() {
    try {
        const response = await fetch(`${API_URL}/api/doctor/appointments/today`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load appointments');

        return await response.json();
    } catch (error) {
        console.error('Error loading appointments:', error);
        throw error;
    }
}

/**
 * Update appointment status
 * @param {number} appointmentId - Appointment ID
 * @param {string} status - New status
 */
async function updateAppointmentStatus(appointmentId, status) {
    try {
        const response = await fetch(`${API_URL}/api/doctor/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update appointment');

        showToast('Appointment updated successfully', 'success');
        return await response.json();
    } catch (error) {
        console.error('Error updating appointment:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

/**
 * Load doctor's patients
 */
async function loadDoctorPatients() {
    try {
        const response = await fetch(`${API_URL}/api/doctor/patients`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load patients');

        return await response.json();
    } catch (error) {
        console.error('Error loading patients:', error);
        throw error;
    }
}

/**
 * View patient history
 * @param {number} patientId - Patient ID
 */
async function viewPatientHistory(patientId) {
    try {
        const response = await fetch(`${API_URL}/api/doctor/patient/${patientId}/history`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load patient history');

        const data = await response.json();
        showPatientHistoryModal(data);
    } catch (error) {
        console.error('Error loading patient history:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Show patient history modal
 * @param {object} data - Patient history data
 */
function showPatientHistoryModal(data) {
    // Create modal HTML
    const modalHtml = `
        <div id="patientHistoryModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b sticky top-0 bg-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                                <span class="text-primary font-bold">
                                    ${data.patient_info.full_name.split(' ').map(n => n[0]).join('')}
                                </span>
                            </div>
                            <div>
                                <h3 class="text-xl font-semibold text-gray-800">${data.patient_info.full_name}</h3>
                                <p class="text-sm text-gray-500">${data.patient_info.email}</p>
                            </div>
                        </div>
                        <button onclick="closePatientHistoryModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    <!-- Patient Info -->
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-sm text-gray-500">Blood Group</p>
                            <p class="font-medium">${data.patient_info.blood_group || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-sm text-gray-500">Allergies</p>
                            <p class="font-medium">${data.patient_info.allergies || 'None'}</p>
                        </div>
                    </div>

                    <!-- Predictions -->
                    <h4 class="font-semibold text-gray-800 mb-3">Prediction History</h4>
                    <div class="space-y-3 mb-6">
                        ${data.predictions.length === 0 ? '<p class="text-gray-500">No predictions</p>' : 
                          data.predictions.map(pred => `
                            <div class="border rounded-lg p-3">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-medium text-gray-800">${pred.disease}</span>
                                    <span class="text-sm text-gray-500">${formatDate(pred.date)}</span>
                                </div>
                                <div class="flex flex-wrap gap-1">
                                    ${pred.symptoms.slice(0, 4).map(s => `
                                        <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">${formatSymptomName(s)}</span>
                                    `).join('')}
                                    ${pred.symptoms.length > 4 ? `<span class="text-xs text-gray-500">+${pred.symptoms.length - 4} more</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Appointments -->
                    <h4 class="font-semibold text-gray-800 mb-3">Appointment History</h4>
                    <div class="space-y-3">
                        ${data.appointments.length === 0 ? '<p class="text-gray-500">No appointments</p>' : 
                          data.appointments.map(apt => `
                            <div class="flex items-center justify-between border rounded-lg p-3">
                                <div>
                                    <p class="font-medium text-gray-800">${formatDate(apt.date)} at ${apt.time}</p>
                                    <p class="text-sm text-gray-500">${apt.reason || 'General Consultation'}</p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(apt.status)}">
                                    ${apt.status}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('patientHistoryModal');
    if (existingModal) existingModal.remove();

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Close patient history modal
 */
function closePatientHistoryModal() {
    const modal = document.getElementById('patientHistoryModal');
    if (modal) modal.remove();
}

/**
 * Update doctor availability
 * @param {object} schedule - Availability schedule
 */
async function updateAvailability(schedule) {
    try {
        const response = await fetch(`${API_URL}/api/doctor/availability`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(schedule)
        });

        if (!response.ok) throw new Error('Failed to update availability');

        showToast('Availability updated successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error updating availability:', error);
        showToast(error.message, 'error');
        return false;
    }
}
