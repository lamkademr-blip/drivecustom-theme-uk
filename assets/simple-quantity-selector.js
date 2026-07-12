// Créez un nouveau fichier dans votre dossier assets nommé "simple-quantity-selector.js"

document.addEventListener('DOMContentLoaded', function() {
  // Fonction pour ajouter des sélecteurs de quantité simples
  function addSimpleQuantitySelectors() {
    // Sélectionnez tous les éléments du panier
    const cartItems = document.querySelectorAll('.cart-item');
    
    cartItems.forEach(function(item) {
      // Vérifiez si un sélecteur existe déjà
      const existingSelector = item.querySelector('.simple-quantity-selector');
      
      if (!existingSelector) {
        // Obtenez l'ID de la ligne ou de l'article
        let lineId = '';
        let variantId = '';
        
        if (item.id && item.id.includes('CartItem-')) {
          lineId = item.id.replace('CartItem-', '');
        } else if (item.dataset && item.dataset.key) {
          variantId = item.dataset.key;
        } else if (item.dataset && item.dataset.cartItemKey) {
          variantId = item.dataset.cartItemKey;
        } else if (item.dataset && item.dataset.id) {
          variantId = item.dataset.id;
        }
        
        // Obtenez la quantité actuelle
        let currentQty = 1;
        const qtyInput = item.querySelector('input[name="updates[]"]');
        if (qtyInput) {
          currentQty = parseInt(qtyInput.value) || 1;
        }
        
        // Créer le conteneur pour le sélecteur
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'simple-quantity-selector';
        selectorContainer.style.margin = '10px 0';
        selectorContainer.style.display = 'flex';
        selectorContainer.style.alignItems = 'center';
        
        // Créer le label
        const label = document.createElement('span');
        label.textContent = 'Quantity: ';
        label.style.marginRight = '10px';
        label.style.fontSize = '14px';
        label.style.color = '#555';
        selectorContainer.appendChild(label);
        
        // Créer le sélecteur
        const select = document.createElement('select');
        select.className = 'quantity-select';
        select.style.padding = '5px 10px';
        select.style.borderRadius = '4px';
        select.style.border = '1px solid #ddd';
        select.style.backgroundColor = 'white';
        select.style.fontSize = '14px';
        
        // Ajouter l'option "Supprimer" (quantité 0)
        const removeOption = document.createElement('option');
        removeOption.value = '0';
        removeOption.textContent = 'Supprimer';
        select.appendChild(removeOption);
        
        // Ajouter les options de quantité (1-10)
        for (let i = 1; i <= 10; i++) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = i;
          if (i === currentQty) {
            option.selected = true;
          }
          select.appendChild(option);
        }
        
        // Ajouter l'écouteur d'événements pour la mise à jour de la quantité
        select.addEventListener('change', function() {
          const newQty = parseInt(this.value);
          
          // Paramètres de la requête
          let params = {};
          
          if (lineId) {
            // Si nous avons l'ID de ligne, utiliser line_id
            params = {
              line: parseInt(lineId),
              quantity: newQty
            };
          } else if (variantId) {
            // Si nous avons l'ID de variante, utiliser id
            params = {
              id: variantId,
              quantity: newQty
            };
          }
          
          // Effectuer la requête AJAX pour mettre à jour la quantité
          fetch('/cart/change.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
          })
          .then(response => response.json())
          .then(cart => {
            // Si la quantité est 0, supprimer l'article de l'interface
            if (newQty === 0 && item.parentNode) {
              item.parentNode.removeChild(item);
            }
            
            // Mettre à jour le total
            const totalElements = document.querySelectorAll('.cart-subtotal-price, .cart-subtotal-value, [data-cart-subtotal], .cart__subtotal');
            const formattedTotal = (cart.total_price / 100).toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR'
            });
            
            totalElements.forEach(el => {
              el.textContent = formattedTotal;
            });
            
            // Si le panier est vide, recharger la page
            if (cart.item_count === 0) {
              window.location.reload();
            }
          })
          .catch(error => {
            console.error('Erreur lors de la mise à jour de la quantité:', error);
            window.location.reload();
          });
        });
        
        // Ajouter le sélecteur au conteneur
        selectorContainer.appendChild(select);
        
        // Trouver l'endroit où insérer le sélecteur
        const optionsList = item.querySelector('.product-options-list');
        if (optionsList) {
          // Insérer après la liste des options
          optionsList.parentNode.insertBefore(selectorContainer, optionsList.nextSibling);
        } else {
          // Ajouter à la fin de l'élément du panier
          item.appendChild(selectorContainer);
        }
      }
    });
  }
  
  // Ajouter les sélecteurs au chargement de la page
  addSimpleQuantitySelectors();
  
  // Observer les changements DOM pour détecter l'ouverture du slide cart
  const observer = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && (
            node.classList.contains('cart-drawer') || 
            node.classList.contains('drawer') || 
            node.classList.contains('cart-notification')
          )) {
            // Attendre un peu pour que le contenu soit chargé
            setTimeout(addSimpleQuantitySelectors, 300);
          }
        }
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Ajouter les sélecteurs lors des événements personnalisés du panier
  document.addEventListener('cart:open', function() {
    setTimeout(addSimpleQuantitySelectors, 300);
  });
  
  document.addEventListener('cart:update', function() {
    setTimeout(addSimpleQuantitySelectors, 300);
  });
  
  document.addEventListener('drawer:open', function() {
    setTimeout(addSimpleQuantitySelectors, 300);
  });
});