// Script to automatically play sound when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const sound = document.getElementById('blockedNotificationSound');
    if (sound) {
        sound.play().catch(error => {
            // Some browsers may block autoplay if the user hasn't interacted with the page.
            // Log this error so you know if it happens.
            console.warn('Audio play was prevented:', error);
        });
    }
});