// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const icon = event.currentTarget.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Form validation
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match!');
            }
        });
    }
});

// Voice control functionality
const voiceControlBtn = document.getElementById('voiceControlBtn');
let isListening = false;

function startVoiceControl() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Voice recognition is not supported in this browser. Please use Chrome.');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    voiceControlBtn.classList.add('listening');
    voiceControlBtn.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
    isListening = true;

    recognition.start();

    recognition.onresult = function(event) {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', command);

        // Handle different voice commands
        if (command.includes('medication') || command.includes('medicine')) {
            window.location.href = '/medication-reminder';
        }
        else if (command.includes('appointment') || command.includes('schedule')) {
            window.location.href = '/appointment-scheduling';
        }
        else if (command.includes('emergency') || command.includes('help')) {
            window.location.href = '/emergency';
        }
        else if (command.includes('transport') || command.includes('ride')) {
            window.location.href = '/transportation';
        }
        else if (command.includes('home')) {
            window.location.href = '/';
        }
        else if (command.includes('logout')) {
            window.location.href = '/logout';
        }
        // Add new commands for services and profile
        else if (command.includes('services') || command.includes('menu')) {
            window.location.href = '/services';
        }
        else if (command.includes('profile') || command.includes('account')) {
            window.location.href = '/profile';
        }
    };

    recognition.onend = function() {
        voiceControlBtn.classList.remove('listening');
        voiceControlBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice Control';
        isListening = false;
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        voiceControlBtn.classList.remove('listening');
        voiceControlBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice Control';
        isListening = false;
    };
}

voiceControlBtn.addEventListener('click', () => {
    if (!isListening) {
        startVoiceControl();
    }
});

// Font size adjustment
function adjustFontSize(increase) {
    const root = document.documentElement;
    const currentSize = parseFloat(getComputedStyle(root).fontSize);
    root.style.fontSize = (increase ? currentSize + 2 : currentSize - 2) + 'px';
}

// Generic Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal() {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        modal.style.display = 'none';
    }
}

// Emergency Contact Functions
function showAddContactForm() {
    // Reset the form
    const form = document.getElementById('contactForm');
    if (form) {
        form.reset();
        form.action = '/add_emergency_contact';
        document.getElementById('contactModalTitle').textContent = 'Add Emergency Contact';
        document.getElementById('contact-id').value = '';
        
        // Show the modal
        const modal = document.getElementById('contactModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
}

function editContact(contactId) {
    fetch(`/get_contact/${contactId}`)
        .then(response => response.json())
        .then(contact => {
            // Fill the modal with contact data
            document.getElementById('contact-id').value = contact.id;
            document.getElementById('contact-name').value = contact.name;
            document.getElementById('contact-phone').value = contact.phone;
            document.getElementById('contact-relationship').value = contact.relationship;
            
            // Change form action and title
            const form = document.getElementById('contactForm');
            form.action = '/update_emergency_contact';
            document.getElementById('contactModalTitle').textContent = 'Edit Emergency Contact';
            
            // Show the modal
            const modal = document.getElementById('contactModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                console.error('Contact modal not found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load contact information');
        });
}

function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
        fetch(`/delete_contact/${contactId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const contactCard = document.querySelector(`[data-contact-id="${contactId}"]`);
                contactCard.remove();
                alert('Contact deleted successfully');
                if (document.querySelectorAll('.contact-card').length === 0) {
                    location.reload();
                }
            } else {
                alert('Failed to delete contact: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to delete contact');
        });
    }
}

// Medication Functions
function showAddMedicationForm() {
    document.getElementById('medicationForm').reset();
    document.getElementById('medicationForm').action = '/add_medication';
    document.getElementById('medicationModalTitle').textContent = 'Add Medication';
    showModal('medicationModal');
}

function editMedication(medId) {
    fetch(`/get_medication/${medId}`)
        .then(response => response.json())
        .then(medication => {
            document.getElementById('medication-id').value = medication.id;
            document.getElementById('medication-name').value = medication.name;
            document.getElementById('medication-dosage').value = medication.dosage;
            document.getElementById('medication-frequency').value = medication.frequency;
            document.getElementById('next-dose').value = medication.next_dose;
            
            const form = document.getElementById('medicationForm');
            form.action = '/update_medication';
            document.getElementById('medicationModalTitle').textContent = 'Edit Medication';
            
            showModal('medicationModal');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load medication information');
        });
}

function deleteMedication(medId) {
    if (confirm('Are you sure you want to delete this medication?')) {
        fetch(`/delete_medication/${medId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const medCard = document.querySelector(`[data-medication-id="${medId}"]`);
                medCard.remove();
                alert('Medication deleted successfully');
                if (document.querySelectorAll('.medication-card').length === 0) {
                    location.reload();
                }
            } else {
                alert('Failed to delete medication: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to delete medication');
        });
    }
}

// Appointment Functions
function showAddAppointmentForm() {
    const form = document.getElementById('appointmentForm');
    if (form) {
        form.reset();
        form.action = '/add_appointment';
        document.getElementById('appointmentModalTitle').textContent = 'Schedule Appointment';
        document.getElementById('appointment-id').value = '';
        showModal('appointmentModal');
    }
}

function editAppointment(appointmentId) {
    fetch(`/get_appointment/${appointmentId}`)
        .then(response => response.json())
        .then(appointment => {
            document.getElementById('appointment-id').value = appointment.id;
            document.getElementById('appointment-title').value = appointment.title;
            document.getElementById('appointment-doctor').value = appointment.doctor;
            document.getElementById('appointment-location').value = appointment.location;
            document.getElementById('appointment-date').value = appointment.date.slice(0, 16);
            document.getElementById('appointment-notes').value = appointment.notes || '';
            
            const form = document.getElementById('appointmentForm');
            form.action = '/update_appointment';
            document.getElementById('appointmentModalTitle').textContent = 'Edit Appointment';
            
            showModal('appointmentModal');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to load appointment details', 'error');
        });
}

function deleteAppointment(appointmentId) {
    if (confirm('Are you sure you want to delete this appointment?')) {
        fetch(`/delete_appointment/${appointmentId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
                appointmentCard.remove();
                showNotification('Appointment deleted successfully', 'success');
                
                // Refresh if no appointments left
                if (document.querySelectorAll('.appointment-card').length === 0) {
                    location.reload();
                }
            } else {
                showNotification(data.message || 'Failed to delete appointment', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to delete appointment', 'error');
        });
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
    }
}

// Emergency functions
async function triggerEmergency() {
    if (confirm('Are you sure you want to trigger an emergency alert?')) {
        try {
            const response = await fetch('/trigger_emergency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                alert('Emergency alert sent to your contacts!');
            } else {
                alert('Failed to send emergency alert: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send emergency alert. Please try again.');
        }
    }
}

// Calendar functionality
let currentDate = new Date();
let selectedDate = null;

function updateCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    // Update month and year display
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    // Clear existing calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // Get first day of month and total days
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Add empty cells for days before start of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if this day has appointments
        const dateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        if (window.appointments && window.appointments.includes(dateString)) {
            dayElement.classList.add('has-appointment');
        }
        
        dayElement.addEventListener('click', () => {
            // Clear previous selection
            document.querySelectorAll('.calendar-day.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Add selection to clicked day
            dayElement.classList.add('selected');
            selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            
            // Open appointment modal with pre-filled date
            showAddAppointmentForm(selectedDate);
        });
        
        calendar.appendChild(dayElement);
    }
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
}

function showAddAppointmentForm(date = null) {
    const modal = document.getElementById('appointmentModal');
    if (date) {
        // Format date for datetime-local input
        const dateString = date.toISOString().slice(0, 16);
        document.getElementById('date').value = dateString;
    }
    modal.style.display = 'block';
}

// Add these styles to your existing style.css
const calendarStyles = `
    .calendar-day-header {
        font-weight: bold;
        text-align: center;
        padding: 0.5rem;
        background: var(--primary-color);
        color: white;
    }

    .calendar-day {
        padding: 0.5rem;
        text-align: center;
        border: 1px solid #ddd;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .calendar-day:hover {
        background-color: #f0f0f0;
    }

    .calendar-day.empty {
        background: #f9f9f9;
        cursor: default;
    }

    .calendar-day.has-appointment {
        background: var(--primary-color);
        color: white;
    }

    .calendar-day.selected {
        background: var(--secondary-color);
        color: white;
    }
`;

// Add the styles to the document
const styleSheet = document.createElement("style");
styleSheet.textContent = calendarStyles;
document.head.appendChild(styleSheet);

// Initialize calendar when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('calendar')) {
        updateCalendar();
        
        // Add button to show appointment form
        const container = document.querySelector('.appointments-list');
        const addButton = document.createElement('button');
        addButton.className = 'add-btn';
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Appointment';
        addButton.onclick = () => showAddAppointmentForm();
        container.insertBefore(addButton, container.firstChild);
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
    }
}

function closeModal() {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        modal.style.display = 'none';
    }
}

// Add this to your app.py route to pass appointments to the template 

// Emergency contact functions
function editContact(contactId) {
    fetch(`/get_contact/${contactId}`)
        .then(response => response.json())
        .then(contact => {
            // Fill the modal with contact data
            document.getElementById('contact-id').value = contact.id;
            document.getElementById('contact-name').value = contact.name;
            document.getElementById('contact-phone').value = contact.phone;
            document.getElementById('contact-relationship').value = contact.relationship;
            
            // Change form action and title
            const form = document.getElementById('contactForm');
            form.action = '/update_emergency_contact';
            document.getElementById('contactModalTitle').textContent = 'Edit Emergency Contact';
            
            // Show the modal
            const modal = document.getElementById('contactModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                console.error('Contact modal not found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load contact information');
        });
}

function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
        fetch(`/delete_contact/${contactId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove the contact card from the DOM
                const contactCard = document.querySelector(`[data-contact-id="${contactId}"]`);
                contactCard.remove();
                
                // Show success message
                alert('Contact deleted successfully');
                
                // Reload the page if no contacts left
                if (document.querySelectorAll('.contact-card').length === 0) {
                    location.reload();
                }
            } else {
                alert('Failed to delete contact: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to delete contact');
        });
    }
}

// Profile Functions
function showEditProfileForm() {
    showModal('editProfileModal');
}

// High Contrast Toggle
function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    const isHighContrast = document.body.classList.contains('high-contrast');
    localStorage.setItem('highContrast', isHighContrast);
}

// Load high contrast setting on page load
document.addEventListener('DOMContentLoaded', () => {
    const isHighContrast = localStorage.getItem('highContrast') === 'true';
    if (isHighContrast) {
        document.body.classList.add('high-contrast');
    }
});

// Transportation Functions
function showRequestRideForm() {
    document.getElementById('transportForm').reset();
    showModal('transportModal');
}

function cancelRide(rideId) {
    if (confirm('Are you sure you want to cancel this ride?')) {
        fetch(`/cancel_ride/${rideId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const rideCard = document.querySelector(`[data-ride-id="${rideId}"]`);
                rideCard.remove();
                alert('Ride cancelled successfully');
            } else {
                alert('Failed to cancel ride: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to cancel ride');
        });
    }
}

// Medication Functions
function markMedicationTaken(medId) {
    const card = document.querySelector(`[data-medication-id="${medId}"]`);
    const button = card.querySelector('.taken-btn');
    
    // Disable button immediately to prevent double-clicks
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    fetch(`/mark_medication_taken/${medId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the card
            card.classList.add('taken');
            
            // Update the status badge
            const statusBadge = card.querySelector('.status-badge');
            statusBadge.textContent = 'Taken';
            statusBadge.classList.remove('pending');
            statusBadge.classList.add('taken');
            
            // Update the next dose time
            const nextDoseElement = card.querySelector('.next-dose time');
            if (nextDoseElement) {
                nextDoseElement.textContent = data.next_dose;
                nextDoseElement.setAttribute('datetime', data.next_dose);
            }
            
            // Update the button
            button.innerHTML = '<i class="fas fa-check"></i> Taken';
            
            // Show success message
            showNotification('Medication marked as taken!', 'success');
        } else {
            // Revert button state if failed
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check"></i> Mark as Taken';
            showNotification(data.message || 'Failed to update medication status', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check"></i> Mark as Taken';
        showNotification('Failed to update medication status', 'error');
    });
}

// Add this helper function for notifications
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-exclamation-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

// Add this to handle modal closing when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
    }
});

// Password visibility toggle
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Add "Add" button functionality for each section
function showAddButton() {
    const currentPath = window.location.pathname;
    const addButton = document.createElement('button');
    addButton.className = 'add-btn';
    
    if (currentPath.includes('medication')) {
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Medication';
        addButton.onclick = showAddMedicationForm;
    } else if (currentPath.includes('appointment')) {
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Appointment';
        addButton.onclick = showAddAppointmentForm;
    } else if (currentPath.includes('emergency')) {
        addButton.innerHTML = '<i class="fas fa-plus"></i> Add Contact';
        addButton.onclick = showAddContactForm;
    }
    
    document.querySelector('.page-container').appendChild(addButton);
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', () => {
    showAddButton();
});

// Medication reminder system
function checkMedicationReminders() {
    fetch('/check_medications')
        .then(response => response.json())
        .then(medications => {
            medications.forEach(med => {
                if (med.should_take) {
                    showMedicationReminder(med);
                }
            });
        });
}

function showMedicationReminder(medication) {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
        return;
    }

    // Request permission if needed
    if (Notification.permission === "granted") {
        createMedicationNotification(medication);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                createMedicationNotification(medication);
            }
        });
    }
}

function createMedicationNotification(medication) {
    const notification = new Notification("Medication Reminder", {
        body: `Time to take ${medication.name} (${medication.dosage})`,
        icon: "/static/images/pill-icon.png",
        badge: "/static/images/pill-icon.png"
    });

    notification.onclick = function() {
        window.focus();
        window.location.href = '/medication-reminder';
    };
}

// Check medications every minute
setInterval(checkMedicationReminders, 60000);

// Initial check when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkMedicationReminders();
});

// Add these functions for daily medication management
function checkDailyReset() {
    const lastReset = localStorage.getItem('lastMedicationReset');
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
        resetDailyMedications();
        localStorage.setItem('lastMedicationReset', today);
    }
}

function resetDailyMedications() {
    fetch('/reset_daily_medications')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Refresh the page to show updated medication statuses
                location.reload();
            }
        })
        .catch(error => console.error('Error resetting medications:', error));
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    checkDailyReset();
    checkMedicationReminders();
});

// Check for resets every hour
setInterval(checkDailyReset, 3600000); // 3600000 ms = 1 hour

// Add these functions for voice-controlled medication input
function startMedicationVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Voice input is not supported in this browser. Please use Chrome.');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Show modal and guide user
    showModal('medicationModal');
    const form = document.getElementById('medicationForm');
    form.reset();
    
    const fields = ['name', 'dosage', 'frequency'];
    let currentField = 0;

    function updatePrompt(fieldName) {
        showNotification(`Please say the ${fieldName} of the medication...`, 'info');
    }

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        
        // Fill in the current field
        switch(fields[currentField]) {
            case 'name':
                document.getElementById('medication-name').value = transcript;
                break;
            case 'dosage':
                document.getElementById('medication-dosage').value = transcript;
                break;
            case 'frequency':
                document.getElementById('medication-frequency').value = transcript;
                break;
        }

        currentField++;
        
        if (currentField < fields.length) {
            // Continue with next field
            setTimeout(() => {
                updatePrompt(fields[currentField]);
                recognition.start();
            }, 1000);
        } else {
            // Set default next dose time
            const now = new Date();
            now.setMinutes(now.getMinutes() + 1); // Set to 1 minute from now
            document.getElementById('next-dose').value = now.toISOString().slice(0, 16);
            
            showNotification('Please review and save the medication details', 'success');
        }
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        showNotification('Voice input error. Please try again.', 'error');
    };

    // Start with first field
    updatePrompt(fields[currentField]);
    recognition.start();
}

// Add voice input button to the modal
function addVoiceInputButton() {
    const modalHeader = document.querySelector('#medicationModal .modal-header');
    const voiceButton = document.createElement('button');
    voiceButton.type = 'button';
    voiceButton.className = 'voice-input-btn';
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i> Use Voice Input';
    voiceButton.onclick = startMedicationVoiceInput;
    modalHeader.appendChild(voiceButton);
}