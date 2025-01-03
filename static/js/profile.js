document.addEventListener('DOMContentLoaded', function() {
    // Update the click handler for the edit button
    const editButton = document.querySelector('.edit-profile-btn');
    if (editButton) {
        editButton.addEventListener('click', showEditProfileModal);
    }

    // Add submit handler for the edit profile form
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/update_profile', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update the displayed information
                    document.querySelector('.profile-header h1').textContent = data.user.username;
                    document.querySelector('.info-item:nth-child(1) p').textContent = data.user.username;
                    document.querySelector('.info-item:nth-child(2) p').textContent = data.user.email;
                    
                    notifications.success({
                        title: 'Success',
                        message: 'Profile updated successfully'
                    });
                    
                    closeModal();
                } else {
                    notifications.error({
                        title: 'Error',
                        message: data.message || 'Failed to update profile'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                notifications.error({
                    title: 'Error',
                    message: 'Failed to update profile'
                });
            });
        });
    }
});

function showEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function closeModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
} 