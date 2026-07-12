// Dans votre fichier custom-shipping.js
document.addEventListener('DOMContentLoaded', function() {
  const shippingMessage = document.getElementById('shipping-location-message');
  
  if (shippingMessage) {
    // Utiliser l'API de géolocalisation du navigateur (plus précise)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        // Convertir les coordonnées en nom de ville
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        // Utiliser l'API Nominatim d'OpenStreetMap pour obtenir le nom de la ville
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(response => response.json())
          .then(data => {
            if (data && data.address && data.address.city) {
              shippingMessage.textContent = `Free shipping to ${data.address.city}`;
            }
          })
          .catch(error => {
            console.error('Erreur:', error);
          });
      }, function() {
        // En cas d'erreur, afficher un message par défaut
        shippingMessage.textContent = "Livraison offerte partout en France";
      });
    } else {
      shippingMessage.textContent = "Livraison offerte partout en France";
    }
  }
});