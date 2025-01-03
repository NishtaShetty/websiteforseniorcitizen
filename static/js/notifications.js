class NotificationSystem {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = 5000
        } = options;

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Set icon based on type
        const iconMap = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <i class="fas ${iconMap[type]} notification-icon"></i>
            <div class="notification-content">
                ${title ? `<h4 class="notification-title">${title}</h4>` : ''}
                <p class="notification-message">${message}</p>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        this.container.appendChild(notification);

        // Show notification with animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.close(notification));

        // Auto close after duration
        if (duration > 0) {
            setTimeout(() => this.close(notification), duration);
        }

        return notification;
    }

    close(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    success(options) {
        return this.show({ ...options, type: 'success' });
    }

    warning(options) {
        return this.show({ ...options, type: 'warning' });
    }

    error(options) {
        return this.show({ ...options, type: 'error' });
    }

    info(options) {
        return this.show({ ...options, type: 'info' });
    }
}

// Initialize notification system
const notifications = new NotificationSystem(); 