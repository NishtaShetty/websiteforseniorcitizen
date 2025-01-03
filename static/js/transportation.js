// Initialize variables for voice input
let currentVoiceField = null;
let recognition = null;

function submitTransportRequest(event) {
    event.preventDefault();
    
    const form = document.getElementById('transportForm');
    const formData = new FormData(form);
    
    fetch('/add_transportation', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Add the new ride card to the list
            addRideCard(data.ride);
            
            // Show success notification
            notifications.success({
                title: 'Success',
                message: 'Transportation request submitted successfully'
            });
            
            // Reset form
            form.reset();
        } else {
            notifications.error({
                title: 'Error',
                message: data.message || 'Failed to submit transportation request'
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        notifications.error({
            title: 'Error',
            message: 'Failed to submit transportation request'
        });
    });
}

function addRideCard(ride) {
    const ridesList = document.querySelector('.rides-list');
    const emptyState = ridesList.querySelector('.empty-state');
    
    // Remove empty state if it exists
    if (emptyState) {
        emptyState.remove();
    }
    
    // Create new ride card
    const rideCard = document.createElement('div');
    rideCard.className = 'ride-card';
    rideCard.setAttribute('data-ride-id', ride.id);
    
    // Format the date
    const pickupDate = new Date(ride.pickup_time);
    const formattedDate = pickupDate.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    
    rideCard.innerHTML = `
        <div class="ride-status ${ride.status.toLowerCase()}">
            <span class="status-badge">${ride.status}</span>
        </div>
        <div class="ride-details">
            <div class="ride-route">
                <p><i class="fas fa-map-marker-alt"></i> From: ${ride.pickup_location}</p>
                <p><i class="fas fa-hospital"></i> To: ${ride.destination}</p>
            </div>
            <p><i class="fas fa-clock"></i> ${formattedDate}</p>
            ${ride.special_needs ? `
            <p class="special-needs-note">
                <i class="fas fa-wheelchair"></i> ${ride.special_needs}
            </p>
            ` : ''}
        </div>
    `;
    
    // Add to the beginning of the list
    ridesList.insertBefore(rideCard, ridesList.firstChild);
    
    // Add slide-in animation
    setTimeout(() => rideCard.classList.add('show'), 10);
}

// Voice input functionality
function startVoiceInput() {
    if (!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            handleVoiceInput(transcript);
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            notifications.error({
                title: 'Error',
                message: 'Voice input error. Please try again.'
            });
        };
    }
    
    // Start with pickup location if no field is selected
    if (!currentVoiceField) {
        currentVoiceField = 'pickup-location';
    }
    
    promptForField(currentVoiceField);
    recognition.start();
}

function promptForField(fieldName) {
    let prompt;
    switch(fieldName) {
        case 'pickup-location':
            prompt = 'Please say your pickup location';
            break;
        case 'destination':
            prompt = 'Please say your destination';
            break;
        case 'special-needs':
            prompt = 'Please specify any special requirements';
            break;
        default:
            prompt = `Please provide ${fieldName.replace('-', ' ')}`;
    }
    
    notifications.info({
        title: 'Voice Input',
        message: prompt
    });
}

function handleVoiceInput(transcript) {
    if (!currentVoiceField) return;
    
    const value = transcript.trim();
    document.getElementById(currentVoiceField).value = value;
    
    // Move to next field
    switch(currentVoiceField) {
        case 'pickup-location':
            currentVoiceField = 'destination';
            break;
        case 'destination':
            currentVoiceField = 'special-needs';
            break;
        case 'special-needs':
            currentVoiceField = null;
            // Set default pickup time to now + 1 hour
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('pickup-time').value = now.toISOString().slice(0, 16);
            
            notifications.success({
                title: 'Voice Input Complete',
                message: 'Please review and set your pickup time.'
            });
            return;
    }
    
    // Prompt for next field after a short delay
    if (currentVoiceField) {
        setTimeout(() => {
            promptForField(currentVoiceField);
            recognition.start();
        }, 1000);
    }
}

// Set minimum date-time to now for pickup time
document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('pickup-time').min = now.toISOString().slice(0, 16);
    document.getElementById('pickup-time').value = now.toISOString().slice(0, 16);
}); 