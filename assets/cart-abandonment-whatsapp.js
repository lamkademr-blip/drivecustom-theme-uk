/**
 * Cart Abandonment WhatsApp Popup
 * Les As du Volant — Popup d'abandon de panier avec redirection WhatsApp
 *
 * Déclencheurs :
 * 1. Intention de quitter (exit intent) → si panier non vide
 * 2. Après 45 secondes sur la page → si panier non vide et pas encore vu
 *
 * Comportement :
 * - Ne s'affiche qu'une fois par session (localStorage)
 * - Ne s'affiche pas sur les pages de checkout
 * - Pré-remplit le message WhatsApp avec les infos du panier
 * - Design responsive, s'intègre au thème existant
 */

(function () {
  'use strict';

  const WHATSAPP_NUMBER = '33622510196';
  const POPUP_DELAY_MS = 45000; // 45 secondes
  const STORAGE_KEY = 'lav_cart_whatsapp_shown';
  const SESSION_COOKIE = 'lav_cart_whatsapp_session';

  // Ne pas s'afficher sur le checkout
  if (window.location.pathname.includes('/checkouts/') || window.location.pathname.includes('/checkout')) {
    return;
  }

  // Vérifier si déjà affiché dans cette session
  function hasBeenShown() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function markAsShown() {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      // Silently fail
    }
  }

  // Récupérer le panier via l'API Shopify
  function fetchCart() {
    if (typeof window.routes === 'undefined' || !window.routes.cart_url) {
      return fetch('/cart.js').then(function (r) { return r.json(); });
    }
    return fetch(window.routes.cart_url + '.js').then(function (r) { return r.json(); });
  }

  // Construire le message WhatsApp pré-rempli
  function buildWhatsAppMessage(cartData) {
    var itemCount = cartData.item_count || 0;
    var total = cartData.total_price || 0;
    var formattedTotal = (total / 100).toFixed(2) + '€';
    var firstItem = cartData.items && cartData.items.length > 0 ? cartData.items[0] : null;

    var message = 'Bonjour 👋, ';
    if (firstItem) {
      message += 'je suis intéressé par ' + firstItem.title;
      if (firstItem.quantity > 1) {
        message += ' (x' + firstItem.quantity + ')';
      }
      message += ' et ';
    }
    message += 'j\'ai ' + itemCount + ' article' + (itemCount > 1 ? 's' : '') + ' dans mon panier';
    if (formattedTotal !== '0.00€') {
      message += ' pour un total de ' + formattedTotal;
    }
    message += '. Puis-je obtenir plus d\'informations avant de commander ?';

    return encodeURIComponent(message);
  }

  // Injecter les styles CSS
  function injectStyles() {
    if (document.getElementById('cwp-styles')) return;
    var style = document.createElement('style');
    style.id = 'cwp-styles';
    style.textContent =
      '#cart-whatsapp-popup {' +
        'position: fixed;' +
        'top: 0; left: 0; right: 0; bottom: 0;' +
        'z-index: 100000;' +
        'display: flex;' +
        'align-items: flex-end;' +
        'justify-content: center;' +
        'padding: 20px;' +
        'pointer-events: none;' +
        'opacity: 0;' +
        'transition: opacity 0.4s ease;' +
      '}' +
      '#cart-whatsapp-popup.cwp-visible {' +
        'opacity: 1;' +
        'pointer-events: auto;' +
      '}' +
      '.cwp-overlay {' +
        'position: absolute;' +
        'top: 0; left: 0; right: 0; bottom: 0;' +
        'background: rgba(0,0,0,0.4);' +
      '}' +
      '.cwp-card {' +
        'position: relative;' +
        'background: #fff;' +
        'border-radius: 16px;' +
        'padding: 28px 24px 20px;' +
        'max-width: 400px;' +
        'width: 100%;' +
        'box-shadow: 0 8px 32px rgba(0,0,0,0.2);' +
        'text-align: center;' +
        'animation: cwp-slideUp 0.4s ease;' +
        'margin-bottom: 20px;' +
      '}' +
      '@keyframes cwp-slideUp {' +
        'from { transform: translateY(40px); opacity: 0; }' +
        'to { transform: translateY(0); opacity: 1; }' +
      '}' +
      '.cwp-close {' +
        'position: absolute;' +
        'top: 12px; right: 14px;' +
        'background: none; border: none;' +
        'font-size: 24px;' +
        'color: #999;' +
        'cursor: pointer;' +
        'padding: 4px 8px;' +
        'line-height: 1;' +
      '}' +
      '.cwp-icon {' +
        'width: 64px; height: 64px;' +
        'background: #25D366;' +
        'border-radius: 50%;' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'margin: 0 auto 16px;' +
        'box-shadow: 0 4px 14px rgba(37,211,102,0.35);' +
      '}' +
      '.cwp-title {' +
        'font-size: 18px;' +
        'font-weight: 700;' +
        'color: #1a1a1a;' +
        'margin: 0 0 8px;' +
        'font-family: inherit;' +
      '}' +
      '.cwp-text {' +
        'font-size: 14px;' +
        'color: #555;' +
        'line-height: 1.5;' +
        'margin: 0 0 4px;' +
      '}' +
      '.cwp-sub-text {' +
        'font-size: 12px;' +
        'color: #25D366;' +
        'font-weight: 600;' +
        'margin: 4px 0 16px;' +
      '}' +
      '.cwp-button {' +
        'display: inline-flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'background: #25D366;' +
        'color: #fff;' +
        'border: none;' +
        'border-radius: 50px;' +
        'padding: 14px 28px;' +
        'font-size: 15px;' +
        'font-weight: 600;' +
        'text-decoration: none;' +
        'cursor: pointer;' +
        'transition: background 0.2s, transform 0.15s;' +
        'width: 100%;' +
        'box-sizing: border-box;' +
      '}' +
      '.cwp-button:hover {' +
        'background: #20bd5a;' +
        'transform: scale(1.02);' +
      '}' +
      '.cwp-skip {' +
        'display: block;' +
        'background: none; border: none;' +
        'color: #999;' +
        'font-size: 12px;' +
        'cursor: pointer;' +
        'margin: 12px auto 0;' +
        'text-decoration: underline;' +
        'padding: 4px;' +
      '}' +
      '@media (max-width: 480px) {' +
        '#cart-whatsapp-popup { padding: 10px; }' +
        '.cwp-card { padding: 20px 16px 16px; border-radius: 12px; }' +
        '.cwp-icon { width: 52px; height: 52px; }' +
        '.cwp-icon svg { width: 30px; height: 30px; }' +
      '}';
    document.head.appendChild(style);
  }

  // Créer et afficher le popup
  function showPopup(cartData) {
    if (hasBeenShown()) return;
    markAsShown();

    // Injecter les styles CSS avant d'afficher
    injectStyles();

    var whatsappUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + buildWhatsAppMessage(cartData);

    // Créer le conteneur du popup
    var popup = document.createElement('div');
    popup.id = 'cart-whatsapp-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Besoin d\'aide pour votre commande ?');
    popup.innerHTML =
      '<div class="cwp-overlay"></div>' +
      '<div class="cwp-card">' +
        '<button class="cwp-close" aria-label="Fermer">&times;</button>' +
        '<div class="cwp-icon">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="white">' +
            '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
          '</svg>' +
        '</div>' +
        '<h3 class="cwp-title">Vous hésitez ?</h3>' +
        '<p class="cwp-text">' +
          'Vous avez <strong>' + (cartData.item_count || 0) + ' article' + (cartData.item_count > 1 ? 's' : '') + '</strong> dans votre panier.' +
          ' Nos experts sont disponibles sur WhatsApp pour répondre à toutes vos questions ' +
          '(fabrication, délais, personnalisation).' +
        '</p>' +
        '<p class="cwp-sub-text">Réponse sous 5 minutes ⚡</p>' +
        '<a href="' + whatsappUrl + '" target="_blank" rel="noopener noreferrer" class="cwp-button">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="vertical-align:middle;margin-right:8px">' +
            '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
          '</svg>' +
          'Parler à un expert'
        '</a>' +
        '<button class="cwp-skip">Non merci, je continue</button>' +
      '</div>';

    document.body.appendChild(popup);

    // Animation d'entrée
    requestAnimationFrame(function () {
      popup.classList.add('cwp-visible');
    });

    // Fermeture
    var closeBtn = popup.querySelector('.cwp-close');
    var skipBtn = popup.querySelector('.cwp-skip');
    var overlay = popup.querySelector('.cwp-overlay');

    function closePopup() {
      popup.classList.remove('cwp-visible');
      setTimeout(function () {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
      }, 400);
    }

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (skipBtn) skipBtn.addEventListener('click', closePopup);
    if (overlay) overlay.addEventListener('click', closePopup);
  }

  // Exit intent : détecter la sortie du curseur par le haut
  function setupExitIntent(cartData) {
    var exitFired = false;

    function onMouseLeave(e) {
      // Ne réagir que si le curseur quitte par le haut (clientY <= 0)
      if (e.clientY > 0 || exitFired) return;
      exitFired = true;
      showPopup(cartData);
      document.removeEventListener('mouseleave', onMouseLeave);
    }

    document.addEventListener('mouseleave', onMouseLeave);
  }

  // Initialisation
  function init() {
    fetchCart()
      .then(function (cart) {
        if (!cart || !cart.item_count || cart.item_count === 0) return;

        // Déclencher le popup après un délai si le panier a été récemment modifié
        // (vérifier si un produit vient d'être ajouté)
        var addToCartTime = parseInt(localStorage.getItem('lav_cart_last_add'), 10);
        var now = Date.now();

        if (addToCartTime && (now - addToCartTime) < 120000) {
          // Ajout récent (moins de 2 min) → popup plus rapide (15s)
          setTimeout(function () { showPopup(cart); }, 15000);
        }

        // Exit intent toujours actif
        setupExitIntent(cart);

        // Popup différé si pas de modification récente
        if (!addToCartTime || (now - addToCartTime) >= 120000) {
          var delayTimer = setTimeout(function () {
            // Ne montrer le différé que si l'exit intent n'a pas déjà montré le popup
            if (!hasBeenShown()) {
              showPopup(cart);
            }
          }, POPUP_DELAY_MS);

          // Si exit intent se déclenche avant le timer, annuler le timer différé
          // (géré par le fait que showPopup vérifie hasBeenShown)
        }

        // Intercepter les clics "Ajouter au panier" pour tracker le moment
        document.addEventListener('click', function (e) {
          var btn = e.target.closest('[name="add"], .shopify-submit, [data-add-to-cart]');
          if (btn) {
            localStorage.setItem('lav_cart_last_add', Date.now().toString());
          }
        });
      })
      .catch(function () {
        // Silently fail
      });

    // Écouter les événements cartUpdate pour rafraîchir
    if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, function () {
        fetchCart().then(function (cart) {
          if (cart && cart.item_count && cart.item_count > 0) {
            localStorage.setItem('lav_cart_last_add', Date.now().toString());
          }
        }).catch(function () {});
      });
    }
  }

  // Attendre que DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
