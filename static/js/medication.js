let currentVoiceField = null;
let recognition = null;

function showAddMedicationForm() {
    const modal = document.getElementById('medicationModal');
    const form = document.getElementById('medicationForm');
    const modalTitle = modal.querySelector('.modal-header h2');
    
    // Reset form
    form.reset();
    document.getElementById('medication-id').value = '';
    
    // Set minimum date-time to now for next dose
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('next-dose').min = now.toISOString().slice(0, 16);
    document.getElementById('next-dose').value = now.toISOString().slice(0, 16);
    
    // Update modal title
    modalTitle.innerHTML = '<i class="fas fa-pills"></i> Add New Medication';
    
    // Reset voice input state
    currentVoiceField = null;
    if (recognition) {
        recognition.abort();
    }
    
    // Show modal
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function saveMedication(event) {
    event.preventDefault();
    
    const form = document.getElementById('medicationForm');
    const formData = new FormData(form);
    const medicationId = document.getElementById('medication-id').value;
    
    // Determine if we're adding or updating
    const url = medicationId ? '/update_medication' : '/add_medication';
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal();
            location.reload(); // Refresh to show updated medication
        } else {
            showNotification(data.message || 'Error saving medication', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to save medication', 'error');
    });
}

function closeModal() {
    const modal = document.getElementById('medicationModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('medicationModal');
    if (event.target === modal) {
        closeModal();
    }
}

function editMedication(medId) {
    // Fetch medication details
    fetch(`/get_medication/${medId}`)
        .then(response => response.json())
        .then(medication => {
            const modal = document.getElementById('medicationModal');
            const form = document.getElementById('medicationForm');
            const modalTitle = modal.querySelector('.modal-header h2');
            
            // Update modal title
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Medication';
            
            // Fill form with medication details
            document.getElementById('medication-id').value = medication.id;
            document.getElementById('medication-name').value = medication.name;
            document.getElementById('medication-dosage').value = medication.dosage;
            document.getElementById('medication-frequency').value = medication.frequency;
            
            // Format the date-time for the input
            const nextDose = new Date(medication.next_dose);
            nextDose.setMinutes(nextDose.getMinutes() - nextDose.getTimezoneOffset());
            document.getElementById('next-dose').value = nextDose.toISOString().slice(0, 16);
            
            // Show the modal
            modal.style.display = 'block';
            setTimeout(() => modal.classList.add('show'), 10);
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to load medication details', 'error');
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
                showNotification('Medication deleted successfully', 'success');
                
                // Refresh if no medications left
                if (document.querySelectorAll('.medication-card').length === 0) {
                    location.reload();
                }
            } else {
                showNotification(data.message || 'Failed to delete medication', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to delete medication', 'error');
        });
    }
}

function markMedicationTaken(medId) {
    fetch(`/mark_medication_taken/${medId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const medCard = document.querySelector(`[data-medication-id="${medId}"]`);
            const dosesTaken = data.doses_taken;
            const dailyDoses = data.daily_doses;
            
            // Update doses taken display
            const statusBadge = medCard.querySelector('.status-badge');
            statusBadge.textContent = `${dosesTaken}/${dailyDoses} Doses`;
            
            // Update badge class based on progress
            statusBadge.className = 'status-badge';
            if (dosesTaken === dailyDoses) {
                statusBadge.classList.add('completed');
                medCard.classList.add('taken');
            } else if (dosesTaken > 0) {
                statusBadge.classList.add('partial');
            }
            
            // Update doses taken count in details
            const dosesTakenText = medCard.querySelector('.medication-details p:last-child');
            dosesTakenText.innerHTML = `<i class="fas fa-check-circle"></i> Doses Taken Today: ${dosesTaken}/${dailyDoses}`;
            
            // Hide take button if all doses taken
            if (dosesTaken >= dailyDoses) {
                const takeBtn = medCard.querySelector('.take-btn');
                if (takeBtn) takeBtn.remove();
            }
            
            showNotification('Dose taken successfully', 'success');
        } else {
            showNotification(data.message || 'Failed to record dose', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to record dose', 'error');
    });
}

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

    // If no field is selected, start with name
    if (!currentVoiceField) {
        currentVoiceField = 'name';
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
        case 'name':
            prompt = 'Please say the medication name';
            break;
        case 'dosage':
            prompt = 'Please say the dosage amount';
            break;
        case 'frequency':
            prompt = 'Please say how often to take the medication (daily, twice daily, weekly, etc.)';
            break;
        default:
            prompt = `Please say the ${fieldName}`;
    }
    
    showNotification(prompt, 'info');
}

function handleVoiceInput(transcript) {
    if (!currentVoiceField) return;

    const value = transcript.trim().toLowerCase();
    
    // Update the corresponding input field
    switch(currentVoiceField) {
        case 'name':
            document.getElementById('medication-name').value = 
                value.charAt(0).toUpperCase() + value.slice(1);
            currentVoiceField = 'dosage';
            break;
        case 'dosage':
            document.getElementById('medication-dosage').value = value;
            currentVoiceField = 'frequency';
            break;
        case 'frequency':
            // Process frequency input
            let frequency = value;
            if (value.includes('twice')) frequency = 'twice daily';
            else if (value.includes('thrice')) frequency = 'thrice daily';
            else if (value.includes('daily')) frequency = 'daily';
            else if (value.includes('week')) frequency = 'weekly';
            else if (value.includes('month')) frequency = 'monthly';
            
            document.getElementById('medication-frequency').value = frequency;
            currentVoiceField = null;
            
            // Set default next dose time to now
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('next-dose').value = now.toISOString().slice(0, 16);
            
            showNotification('All fields completed! Please review and set the next dose time.', 'success');
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