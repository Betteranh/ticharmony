/**
 * TIC HARMONY - APPLICATION JAVASCRIPT
 * Fonctions utilitaires pour améliorer l'UX
 */

// Toast Notifications
function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = getToastIcon(type);
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-auto text-white hover:opacity-75">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        success: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
        error: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
        warning: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        info: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    return icons[type] || icons.info;
}

// Loading Overlay
function showLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner-large"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
}

// Validation de formulaire
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        input.classList.remove('error', 'success');

        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.add('success');
        }
    });

    if (!isValid) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
    }

    return isValid;
}

// Validation email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Confirmation de suppression
function confirmDelete(message = 'Êtes-vous sûr de vouloir supprimer cet élément ?') {
    return confirm(message);
}

// Animation d'apparition au scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.animate-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeIn');
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
}

// Auto-hide alerts
function autoHideAlerts() {
    const alerts = document.querySelectorAll('[role="alert"]');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateX(100%)';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Animer les éléments au scroll
    animateOnScroll();

    // Auto-hide des alertes
    autoHideAlerts();

    // Ajouter des listeners pour la validation en temps réel
    const inputs = document.querySelectorAll('.input-modern');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required')) {
                if (!this.value.trim()) {
                    this.classList.add('error');
                    this.classList.remove('success');
                } else {
                    this.classList.remove('error');
                    this.classList.add('success');
                }
            }

            if (this.type === 'email' && this.value) {
                if (!validateEmail(this.value)) {
                    this.classList.add('error');
                    this.classList.remove('success');
                } else {
                    this.classList.remove('error');
                    this.classList.add('success');
                }
            }
        });
    });

    // Confirmation avant submit de formulaires de suppression
    const deleteForms = document.querySelectorAll('form[action*="delete"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirmDelete()) {
                e.preventDefault();
            }
        });
    });
});

// Copier dans le presse-papiers
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copié dans le presse-papiers', 'success', 2000);
    }).catch(() => {
        showToast('Erreur lors de la copie', 'error');
    });
}

// Détection de messages d'erreur/succès dans l'URL
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('success')) {
        showToast(urlParams.get('success') || 'Opération réussie', 'success');
    }

    if (urlParams.has('error')) {
        showToast(urlParams.get('error') || 'Une erreur est survenue', 'error');
    }

    if (urlParams.has('loginError')) {
        showToast('Nom d\'utilisateur ou mot de passe incorrect', 'error');
    }

    if (urlParams.has('logoutSuccess')) {
        showToast('Vous avez été déconnecté avec succès', 'success');
    }
});
