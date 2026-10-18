/**
 * Patient Dashboard JavaScript
 * Handles patient-specific functionality
 */

/**
 * Load patient dashboard data
 */
async function loadPatientDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/patient/dashboard`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load dashboard');

        const data = await response.json();
        renderPatientDashboard(data);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Render patient dashboard data
 * @param {object} data - Dashboard data
 */
function renderPatientDashboard(data) {
    // Update welcome section
    const welcomeSection = document.getElementById('welcomeSection');
    if (welcomeSection) {
        if (data.is_new_patient) {
            welcomeSection.innerHTML = `
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
                    <h2 class="text-2xl font-bold mb-2">Welcome, ${data.patient_info.full_name}! 👋</h2>
                    <p class="text-blue-100">You haven't made any health checkups yet. Start by checking your symptoms to get AI-powered health insights.</p>
                </div>
            `;
        } else {
            welcomeSection.innerHTML = `
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
                    <h2 class="text-2xl font-bold mb-2">Welcome back, ${data.patient_info.full_name}! 👋</h2>
                    <p class="text-blue-100">You have ${data.total_predictions} health checkups and ${data.total_appointments} appointments on record.</p>
                </div>
            `;
        }
    }

    // Update stats
    document.getElementById('statPredictions').textContent = data.total_predictions;
    document.getElementById('statAppointments').textContent = data.total_appointments;
    document.getElementById('statUpcoming').textContent = data.upcoming_appointments.length;

    // Render recent predictions
    const predictionsContainer = document.getElementById('recentPredictions');
    if (predictionsContainer) {
        if (data.recent_predictions.length === 0) {
            predictionsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-clipboard-list text-4xl mb-3"></i>
                    <p>No predictions yet</p>
                    <a href="symptom-checker.html" class="text-primary hover:underline mt-2 inline-block">Check your symptoms</a>
                </div>
            `;
        } else {
            predictionsContainer.innerHTML = `
                <div class="space-y-4">
                    ${data.recent_predictions.map(pred => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-stethoscope text-primary"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-800">${pred.disease}</p>
                                    <p class="text-sm text-gray-500">${formatDate(pred.date)}</p>
                                </div>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm ${getConfidenceClass(pred.confidence)}">
                                ${(pred.confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // Render upcoming appointments
    const appointmentsContainer = document.getElementById('upcomingAppointments');
    if (appointmentsContainer) {
        if (data.upcoming_appointments.length === 0) {
            appointmentsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-calendar text-4xl mb-3"></i>
                    <p>No upcoming appointments</p>
                    <a href="book-appointment.html" class="text-primary hover:underline mt-2 inline-block">Book an appointment</a>
                </div>
            `;
        } else {
            appointmentsContainer.innerHTML = `
                <div class="space-y-4">
                    ${data.upcoming_appointments.map(apt => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user-md text-secondary"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-800">${apt.doctor_name}</p>
                                    <p class="text-sm text-gray-500">${apt.doctor_specialty}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-medium text-gray-800">${formatDate(apt.date)}</p>
                                <p class="text-sm text-gray-500">${apt.time}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
}

/**
 * Load and display symptoms list
 */
async function loadSymptomsList() {
    try {
        const response = await fetch(`${API_URL}/api/symptoms`);
        if (!response.ok) throw new Error('Failed to load symptoms');
        
        const data = await response.json();
        return data.symptoms;
    } catch (error) {
        console.error('Error loading symptoms:', error);
        showToast('Failed to load symptoms', 'error');
        return [];
    }
}

/**
 * Predict disease from symptoms
 * @param {Array} symptoms - Array of symptom names
 */
async function predictDisease(symptoms) {
    try {
        const response = await fetch(`${API_URL}/api/patient/predict`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ symptoms })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Prediction failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Prediction error:', error);
        throw error;
    }
}

/**
 * Load patient's prediction history
 */
async function loadPredictionHistory() {
    try {
        const response = await fetch(`${API_URL}/api/patient/history`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load history');

        return await response.json();
    } catch (error) {
        console.error('Error loading history:', error);
        throw error;
    }
}

/**
 * Load patient's appointments
 */
async function loadAppointments() {
    try {
        const response = await fetch(`${API_URL}/api/patient/appointments`, {
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
 * Load available doctors
 * @param {string} specialty - Optional specialty filter
 */
async function loadDoctors(specialty = null) {
    try {
        let url = `${API_URL}/api/patient/doctors`;
        if (specialty) url += `?specialty=${encodeURIComponent(specialty)}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load doctors');

        return await response.json();
    } catch (error) {
        console.error('Error loading doctors:', error);
        throw error;
    }
}

/**
 * Book appointment with doctor
 * @param {object} appointmentData - Appointment details
 */
async function bookAppointment(appointmentData) {
    try {
        const response = await fetch(`${API_URL}/api/patient/book`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(appointmentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Booking failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Booking error:', error);
        throw error;
    }
}

/**
 * Cancel appointment
 * @param {number} appointmentId - Appointment ID
 */
async function cancelAppointment(appointmentId) {
    try {
        const response = await fetch(`${API_URL}/api/patient/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Cancellation failed');
        }

        showToast('Appointment cancelled successfully', 'success');
        return true;
    } catch (error) {
        console.error('Cancellation error:', error);
        showToast(error.message, 'error');
        return false;
    }
}