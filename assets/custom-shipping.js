// Shows a localised free-delivery message in #shipping-location-message.
document.addEventListener('DOMContentLoaded', function() {
  const shippingMessage = document.getElementById('shipping-location-message');

  if (shippingMessage) {
    const FALLBACK = 'Free delivery across the UK';
    // Use the browser geolocation API for a city-level message
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Reverse-geocode via OpenStreetMap Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(response => response.json())
          .then(data => {
            if (data && data.address && data.address.city) {
              shippingMessage.textContent = `Free delivery to ${data.address.city}`;
            }
          })
          .catch(error => {
            console.error('Error:', error);
          });
      }, function() {
        shippingMessage.textContent = FALLBACK;
      });
    } else {
      shippingMessage.textContent = FALLBACK;
    }
  }
});
