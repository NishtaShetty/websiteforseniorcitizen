let calendar;
let map;
let autocomplete;
let marker;

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: '/get_appointments_json',
            selectable: true,
            select: function(info) {
                const date = info.start;
                document.getElementById('appointment-date').value = date.toISOString().slice(0, 16);
                showAddAppointmentForm();
            },
            eventClick: function(info) {
                editAppointment(info.event.id);
            },
            height: 'auto',
            aspectRatio: 1.35
        });
        calendar.render();
        
        // Initialize map after calendar is rendered
        initializeMap();
    }
});

function initializeMap() {
    // Initialize the map
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8
    });

    // Initialize the autocomplete
    const input = document.getElementById('appointment-location');
    autocomplete = new google.maps.places.Autocomplete(input);
    
    // Update map when place is selected
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        // Update map
        map.setCenter(place.geometry.location);
        map.setZoom(15);

        // Update marker
        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location
        });

        // Save coordinates
        document.getElementById('location-lat').value = place.geometry.location.lat();
        document.getElementById('location-lng').value = place.geometry.location.lng();
    });
}

function showAddAppointmentForm(date = null) {
    const form = document.getElementById('appointmentForm');
    form.reset();
    form.action = '/add_appointment';
    document.getElementById('appointmentModalTitle').textContent = 'Schedule Appointment';
    document.getElementById('appointment-id').value = '';
    
    if (date) {
        document.getElementById('appointment-date').value = date;
    }
    
    showModal('appointmentModal');
    
    // Reset map
    if (marker) marker.setMap(null);
    map.setCenter({ lat: -34.397, lng: 150.644 });
    map.setZoom(8);
}

function editAppointment(appointmentId) {
    // Fetch appointment details
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
            
            if (appointment.notes) {
                document.getElementById('appointment-notes').value = appointment.notes;
            }
            
            // Show the modal
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('show'), 10);
        })
        .catch(error => {
            console.error('Error:', error);
            notifications.error({
                title: 'Error',
                message: 'Failed to load appointment details'
            });
        });
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
            // Update the calendar
            if (calendar) {
                if (appointmentId) {
                    // Update existing event
                    const event = calendar.getEventById(appointmentId);
                    if (event) {
                        event.remove();
                    }
                }
                // Add the new/updated event
                calendar.addEvent({
                    id: data.appointment.id,
                    title: data.appointment.title,
                    start: data.appointment.date,
                    description: `Doctor: ${data.appointment.doctor}\nLocation: ${data.appointment.location}`
                });
            }
            
            // Update the appointment card if it exists
            updateAppointmentCard(data.appointment);
            
            notifications.success({
                title: 'Success',
                message: data.message
            });
            closeModal();
        } else {
            notifications.error({
                title: 'Error',
                message: data.message || 'Failed to save appointment'
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        notifications.error({
            title: 'Error',
            message: 'Failed to save appointment'
        });
    });
}

function updateAppointmentCard(appointment) {
    const card = document.querySelector(`[data-appointment-id="${appointment.id}"]`);
    if (card) {
        // Update card content
        card.querySelector('h3').textContent = appointment.title;
        card.querySelector('.appointment-date').textContent = 
            new Date(appointment.date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        
        const details = card.querySelector('.appointment-details');
        details.innerHTML = `
            <p><i class="fas fa-user-md"></i> Dr. ${appointment.doctor}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${appointment.location}</p>
            <p><i class="fas fa-clock"></i> ${new Date(appointment.date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            })}</p>
            ${appointment.notes ? `
            <p class="appointment-notes">
                <i class="fas fa-sticky-note"></i> ${appointment.notes}
            </p>
            ` : ''}
        `;
    } else {
        // If card doesn't exist, reload the page to show new appointment
        location.reload();
    }
}