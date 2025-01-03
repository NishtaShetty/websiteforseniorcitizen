document.addEventListener('DOMContentLoaded', function() {
    // Initialize FullCalendar
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: '/get_appointments_json',
        eventClick: function(info) {
            editAppointment(info.event.id);
        }
    });
    calendar.render();

    // Set minimum date-time to now for new appointments
    const dateInput = document.getElementById('appointment-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.min = now.toISOString().slice(0, 16);
    }
});

function showAddAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    const form = document.getElementById('appointmentForm');
    const modalTitle = modal.querySelector('.modal-header h2');
    
    // Reset form
    form.reset();
    document.getElementById('appointment-id').value = '';
    
    // Set default date-time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('appointment-date').value = now.toISOString().slice(0, 16);
    
    // Update modal title
    modalTitle.innerHTML = '<i class="fas fa-calendar-plus"></i> Schedule New Appointment';
    
    // Show modal
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Reset voice input state
    currentVoiceField = null;
    if (recognition) {
        recognition.abort();
    }
}

function saveAppointment(event) {
    event.preventDefault();
    
    const form = document.getElementById('appointmentForm');
    const formData = new FormData(form);
    const appointmentId = document.getElementById('appointment-id').value;
    
    // Determine if we're adding or updating
    const url = appointmentId ? '/update_appointment' : '/add_appointment';
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal();
            location.reload(); // Refresh to show updated appointments
        } else {
            showNotification(data.message || 'Error saving appointment', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to save appointment', 'error');
    });
}

function editAppointment(appointmentId) {
    fetch(`/get_appointment/${appointmentId}`)
        .then(response => response.json())
        .then(appointment => {
            const modal = document.getElementById('appointmentModal');
            const form = document.getElementById('appointmentForm');
            const modalTitle = modal.querySelector('.modal-header h2');
            
            // Update modal title
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Appointment';
            
            // Fill form with appointment details
            document.getElementById('appointment-id').value = appointment.id;
            document.getElementById('appointment-title').value = appointment.title;
            document.getElementById('appointment-doctor').value = appointment.doctor;
            document.getElementById('appointment-location').value = appointment.location;
            
            // Format the date-time for the input
            const appointmentDate = new Date(appointment.date);
            appointmentDate.setMinutes(appointmentDate.getMinutes() - appointmentDate.getTimezoneOffset());
            document.getElementById('appointment-date').value = appointmentDate.toISOString().slice(0, 16);
            
            document.getElementById('appointment-notes').value = appointment.notes || '';
            
            // Show modal
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('show'), 10);
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
                showNotification('Appointment deleted successfully', 'success');
                location.reload(); // Refresh to update the list
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

function closeModal() {
    const modal = document.getElementById('appointmentModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

let currentVoiceField = null;
let recognition = null;

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('Voice input is not supported in this browser. Please use Chrome.', 'error');
        return;
    }

    if (!recognition) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            handleVoiceInput(transcript);
        };

        recognition.onend = function() {
            const voiceBtn = document.querySelector('.voice-input-btn');
            voiceBtn.classList.remove('listening');
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showNotification('Voice input error. Please try again.', 'error');
            const voiceBtn = document.querySelector('.voice-input-btn');
            voiceBtn.classList.remove('listening');
        };
    }

    // If no field is selected, start with title
    if (!currentVoiceField) {
        currentVoiceField = 'title';
    }

    promptForField(currentVoiceField);
    startListening();
}

function startListening() {
    const voiceBtn = document.querySelector('.voice-input-btn');
    voiceBtn.classList.add('listening');
    recognition.start();
}

function promptForField(fieldName) {
    let prompt;
    switch(fieldName) {
        case 'title':
            prompt = 'Please say the appointment title';
            break;
        case 'doctor':
            prompt = "Please say the doctor's name";
            break;
        case 'location':
            prompt = 'Please say the appointment location';
            break;
        case 'notes':
            prompt = 'Please say any notes for the appointment';
            break;
        default:
            prompt = `Please say the ${fieldName}`;
    }
    
    showNotification(prompt, 'info');
}

function handleVoiceInput(transcript) {
    if (!currentVoiceField) return;

    const value = transcript.trim();
    
    // Update the corresponding input field
    switch(currentVoiceField) {
        case 'title':
            document.getElementById('appointment-title').value = value;
            currentVoiceField = 'doctor';
            break;
        case 'doctor':
            document.getElementById('appointment-doctor').value = value;
            currentVoiceField = 'location';
            break;
        case 'location':
            document.getElementById('appointment-location').value = value;
            currentVoiceField = 'notes';
            break;
        case 'notes':
            document.getElementById('appointment-notes').value = value;
            currentVoiceField = null;
            showNotification('All fields completed! Please set the date and time.', 'success');
            return;
    }

    // After small delay, prompt for next field
    setTimeout(() => {
        if (currentVoiceField) {
            promptForField(currentVoiceField);
            startListening();
        }
    }, 1000);
} 