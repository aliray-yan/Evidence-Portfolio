/**
 * Admin Dashboard JavaScript
 * Handles admin-specific functionality
 */

// Chart instances - MUST track these to destroy before recreating
let diseaseChartInstance = null;
let monthlyChartInstance = null;

const DESKTOP_CHART_HEIGHT = 320;
const MOBILE_CHART_HEIGHT = 280;

function getChartHeight() {
    return window.matchMedia('(max-width: 768px)').matches ? MOBILE_CHART_HEIGHT : DESKTOP_CHART_HEIGHT;
}

function destroyChart(canvas, chartInstance) {
    const existingChart = Chart.getChart(canvas);
    if (existingChart && existingChart !== chartInstance) {
        existingChart.destroy();
    }

    if (chartInstance) {
        chartInstance.destroy();
    }
}

function prepareChartCanvas(canvas) {
    const chartHeight = getChartHeight();
    const parent = canvas.parentElement;

    if (parent) {
        parent.style.height = `${chartHeight}px`;
        parent.style.minHeight = `${chartHeight}px`;
        parent.style.maxHeight = `${chartHeight}px`;
    }

    canvas.height = chartHeight;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = `${chartHeight}px`;
    canvas.style.maxHeight = `${chartHeight}px`;
}

/**
 * Load admin dashboard data
 */
async function loadAdminDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/admin/dashboard`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load dashboard');

        const data = await response.json();
        renderAdminDashboard(data);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Render admin dashboard data
 * @param {object} data - Dashboard data from API
 */
function renderAdminDashboard(data) {
    // Update stat cards
    document.getElementById('totalPatients').textContent = data.total_patients;
    document.getElementById('totalDoctors').textContent = data.total_doctors;
    document.getElementById('totalPredictions').textContent = data.total_predictions;
    document.getElementById('todayActivity').textContent = data.predictions_today + data.appointments_today;

    // Render charts - DESTROY old ones first
    renderDiseaseChart(data.common_diseases);
    renderMonthlyChart(data.monthly_stats);

    // Render recent predictions table
    renderRecentPredictionsTable(data.recent_predictions);
}

/**
 * Render disease distribution doughnut chart
 * @param {Array} diseases - Disease count data
 */
function renderDiseaseChart(diseases) {
    const canvas = document.getElementById('diseaseChart');
    if (!canvas) return;

    destroyChart(canvas, diseaseChartInstance);
    diseaseChartInstance = null;
    prepareChartCanvas(canvas);

    const ctx = canvas.getContext('2d');

    // Handle empty data
    if (!diseases || diseases.length === 0) {
        diseaseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 1,
                resizeDelay: 200,
                animation: false,
                layout: { padding: 0 },
                plugins: {
                    legend: { display: false }
                }
            }
        });
        return;
    }

    const topDiseases = diseases.slice(0, 8);
    const labels = topDiseases.map(d => d.disease);
    const values = topDiseases.map(d => d.count);
    const colors = [
        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
        '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
    ];

    diseaseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, topDiseases.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 1,
            resizeDelay: 200,
            animation: false,
            layout: { padding: 0 },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 12,
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render monthly activity line chart
 * @param {Array} stats - Monthly statistics from API
 */
function renderMonthlyChart(stats) {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;

    destroyChart(canvas, monthlyChartInstance);
    monthlyChartInstance = null;
    prepareChartCanvas(canvas);

    const ctx = canvas.getContext('2d');

    // Handle empty data
    if (!stats || stats.length === 0) {
        monthlyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Predictions',
                    data: [0],
                    borderColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 1,
                resizeDelay: 200,
                animation: false,
                layout: { padding: 0 }
            }
        });
        return;
    }

    // Data is already in correct chronological order from backend
    const labels = stats.map(s => s.month);
    const predictions = stats.map(s => s.predictions);
    const appointments = stats.map(s => s.appointments);

    monthlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Predictions',
                    data: predictions,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Appointments',
                    data: appointments,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 1,
            resizeDelay: 200,
            animation: false,
            layout: { padding: 0 },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        // Only show whole numbers
                        stepSize: 1,
                        callback: function (value) {
                            if (Math.floor(value) === value) {
                                return value;
                            }
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Render recent predictions table
 * @param {Array} predictions - Recent prediction data
 */
function renderRecentPredictionsTable(predictions) {
    const tbody = document.getElementById('recentPredictionsTable');
    if (!tbody) return;

    if (!predictions || predictions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-8 text-gray-500">
                    <i class="fas fa-clipboard-list text-2xl mb-2"></i>
                    <p>No predictions yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = predictions.map(pred => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span class="text-primary text-xs font-bold">
                            ${pred.patient_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                        </span>
                    </div>
                    <span class="font-medium text-gray-800 text-sm">${pred.patient_name}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    ${pred.disease}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-12 bg-gray-200 rounded-full h-1.5">
                        <div class="h-1.5 rounded-full ${pred.confidence >= 0.8 ? 'bg-green-500' : pred.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}"
                             style="width: ${(pred.confidence * 100).toFixed(0)}%"></div>
                    </div>
                    <span class="text-xs font-medium ${pred.confidence >= 0.8 ? 'text-green-600' : pred.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}">
                        ${(pred.confidence * 100).toFixed(1)}%
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-500 text-xs">${formatDate(pred.date)}</td>
        </tr>
    `).join('');
}

/**
 * Load all patients with their data
 */
async function loadAllPatients(search = '') {
    try {
        let url = `${API_URL}/api/admin/patients`;
        if (search) url += `?search=${encodeURIComponent(search)}`;

        const response = await fetch(url, {
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
 * Load all doctors
 */
async function loadAllDoctors() {
    try {
        const response = await fetch(`${API_URL}/api/admin/doctors`, {
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
 * Add new doctor
 * @param {object} doctorData - Doctor information
 */
async function addDoctor(doctorData) {
    try {
        const response = await fetch(`${API_URL}/api/admin/doctors`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(doctorData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add doctor');
        }

        showToast('Doctor added successfully', 'success');
        return await response.json();
    } catch (error) {
        console.error('Error adding doctor:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

/**
 * Delete doctor
 * @param {number} doctorId - Doctor ID
 */
async function deleteDoctor(doctorId) {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/doctors/${doctorId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to delete doctor');

        showToast('Doctor deleted successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting doctor:', error);
        showToast(error.message, 'error');
        return false;
    }
}

/**
 * Load all predictions
 */
async function loadAllPredictions() {
    try {
        const response = await fetch(`${API_URL}/api/admin/predictions`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load predictions');

        return await response.json();
    } catch (error) {
        console.error('Error loading predictions:', error);
        throw error;
    }
}

/**
 * Load all referrals
 */
async function loadAllReferrals() {
    try {
        const response = await fetch(`${API_URL}/api/admin/referrals`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load referrals');

        return await response.json();
    } catch (error) {
        console.error('Error loading referrals:', error);
        throw error;
    }
}

/**
 * Toggle patient account status
 * @param {number} patientId - Patient ID
 */
async function togglePatientStatus(patientId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/patients/${patientId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to update status');

        const data = await response.json();
        showToast(data.message, 'success');
        return data;
    } catch (error) {
        console.error('Error updating status:', error);
        showToast(error.message, 'error');
        throw error;
    }
}
