let currentVoiceField = null;
let recognition = null;

function showAddContactModal() {
    const modal = document.getElementById('contactModal');
    const form = document.getElementById('contactForm');
    const modalTitle = modal.querySelector('.modal-header h2');
    
    // Reset form
    form.reset();
    document.getElementById('contact-id').value = '';
    
    // Update modal title
    modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add Emergency Contact';
    
    // Show modal
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function saveContact(event) {
    event.preventDefault();
    
    const form = document.getElementById('contactForm');
    const formData = new FormData(form);
    const contactId = document.getElementById('contact-id').value;
    
    // Determine if we're adding or updating
    const url = contactId ? '/update_emergency_contact' : '/add_emergency_contact';
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal();
            location.reload(); // Refresh to show updated contacts
        } else {
            showNotification(data.message || 'Error saving contact', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to save contact', 'error');
    });
}

function editContact(contactId) {
    fetch(`/get_emergency_contact/${contactId}`)
        .then(response => response.json())
        .then(contact => {
            const modal = document.getElementById('contactModal');
            const form = document.getElementById('contactForm');
            const modalTitle = modal.querySelector('.modal-header h2');
            
            // Update modal title
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Emergency Contact';
            
            // Fill form with contact details
            document.getElementById('contact-id').value = contact.id;
            document.getElementById('contact-name').value = contact.name;
            document.getElementById('contact-phone').value = contact.phone;
            document.getElementById('contact-relationship').value = contact.relationship;
            
            // Show modal
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('show'), 10);
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to load contact details', 'error');
        });
}

function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
        fetch(`/delete_emergency_contact/${contactId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Contact deleted successfully', 'success');
                location.reload(); // Refresh to update the list
            } else {
                showNotification(data.message || 'Failed to delete contact', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to delete contact', 'error');
        });
    }
}

function closeModal() {
    const modal = document.getElementById('contactModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

function triggerEmergency() {
    const sosButton = document.getElementById('sosButton');
    sosButton.classList.add('active');
    
    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                sendEmergencyAlert(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.error('Error getting location:', error);
                sendEmergencyAlert(null, null);
            }
        );
    } else {
        sendEmergencyAlert(null, null);
    }
}

function sendEmergencyAlert(latitude, longitude) {
    fetch('/trigger_emergency', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Emergency alert sent to all contacts', 'success');
        } else {
            showNotification(data.message || 'Failed to send emergency alert', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to send emergency alert', 'error');
    })
    .finally(() => {
        // Remove active state from SOS button after 3 seconds
        setTimeout(() => {
            const sosButton = document.getElementById('sosButton');
            sosButton.classList.remove('active');
        }, 3000);
    });
} 