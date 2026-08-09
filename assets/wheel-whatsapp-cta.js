/**
 * WhatsApp "Send your configuration" button (all product pages).
 *
 * On click, builds the message from the real state of the product form:
 * selected variant options (via the [data-whatsapp-variants] JSON map),
 * configurator properties when present, quantity and price, then updates
 * the wa.me href before navigation. The link still works without this
 * script (server-side fallback href).
 *
 * No dependencies: touches neither the configurator nor the cart.
 */
(function () {
  'use strict';

  /** Price in pence → "£1,234.56" (raw fallback if Intl is unavailable). */
  function formatPrice(cents, currency) {
    var amount = cents / 100;
    try {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
      return amount.toFixed(2) + ' ' + currency;
    }
  }

  /**
   * Selected variant: read on click from the hidden name="id" input of the
   * form, looked up in the JSON map rendered by the snippet.
   * Returns null when the map or the variant cannot be found.
   */
  function readVariant(cta, form) {
    // Same fallback as findForm: persistent CTAs carry no form id.
    var mapEl =
      (cta.dataset.formId &&
        document.querySelector(
          '[data-whatsapp-variants][data-form-id="' + cta.dataset.formId + '"]'
        )) ||
      document.querySelector('[data-whatsapp-variants]');
    if (!mapEl) return null;
    try {
      var map = JSON.parse(mapEl.textContent);
      var idInput = form.querySelector('input[name="id"]');
      var variant = idInput && map.variants[idInput.value];
      if (!variant) return null;
      return {
        price: variant.price,
        // "Option name: value" pairs, omitted for the default variant.
        options: map.hasOnlyDefaultVariant
          ? []
          : map.optionNames.map(function (name, i) {
              return { label: name, value: variant.options[i] };
            })
      };
    } catch (e) {
      return null;
    }
  }

  /** "+ 49.90 £" or "£1,234.56" → pence (0 when unparsable). */
  function parsePriceCents(text) {
    var raw = (text || '').replace(/[^\d.,]/g, '');
    if (!raw) return 0;
    if (raw.indexOf('.') > -1 && raw.indexOf(',') > -1) raw = raw.replace(/,/g, '');
    raw = raw.replace(',', '.');
    var value = parseFloat(raw);
    return isNaN(value) ? 0 : Math.round(value * 100);
  }

  /**
   * Visible form properties (configurator, options app, custom fields):
   * checked radios, selects and text fields named properties[...].
   * Machine properties (underscore prefix) and empty values are ignored.
   *
   * The options app writes any paid surcharge into the property value
   * itself ("Carbon + alcantara | 149.90 £") — exactly what reaches the
   * cart. That amount is extracted into `cents` for the total.
   */
  function readProperties(form) {
    var options = [];
    var seen = {};
    for (var i = 0; i < form.elements.length; i++) {
      var el = form.elements[i];
      var match = el.name && el.name.match(/^properties\[(.+)\]$/);
      if (!match) continue;
      var rawLabel = match[1];
      if (rawLabel.charAt(0) === '_') continue; // machine property (_config, _hash)
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) continue;
      // Deduplication uses the raw name: two distinct fields stay distinct
      // even if their cleaned labels collide.
      if (!el.value || seen[rawLabel]) continue;
      seen[rawLabel] = true;
      var priceSuffix = el.value.match(/\|\s*([\d\s.,]+\s*[€$£])\s*$/);
      options.push({
        label: cleanLabel(rawLabel),
        value: el.value,
        cents: priceSuffix ? parsePriceCents(priceSuffix[1]) : 0
      });
    }
    return options;
  }

  /**
   * Strips the internal id the options app appends to some property names:
   * "10. Add a personalised airbag cover-28-6".
   *
   * The pattern is always two digit groups separated by dashes at the end
   * of the name (-1-17, -28-6, -29-20…). No legitimate customer-facing
   * label ends in -digits-digits, so the cleanup is safe.
   */
  function cleanLabel(label) {
    return label.replace(/-\d+-\d+$/, '').trim();
  }

  function buildMessage(cta, form) {
    // No emoji here: some devices corrupt them through the wa.me link.
    var lines = ['Hello Drive Custom,', '', "I'd like to send you my configuration:", ''];

    // Product name
    var title = cta.dataset.productTitle;
    if (title) lines.push('Product: ' + title);

    // Selected variant options, then properties (configurator…)
    var variant = readVariant(cta, form);
    var properties = readProperties(form);
    var selections = (variant ? variant.options : []).concat(properties);
    selections.forEach(function (opt) {
      if (opt.value) lines.push('• ' + opt.label + ': ' + opt.value);
    });

    // Quantity (defaults to 1 when the field is absent or empty)
    var qtyInput = form.elements.namedItem('quantity');
    var qty = qtyInput && parseInt(qtyInput.value, 10) > 0 ? parseInt(qtyInput.value, 10) : 1;
    lines.push('Quantity: ' + qty);

    // Total = (current variant price + paid option surcharges) × quantity
    // (fallback: server-rendered price; line omitted when no price known)
    var unitCents = variant ? variant.price : parseInt(cta.dataset.priceCents, 10);
    var totalCents = 0;
    if (unitCents > 0) {
      properties.forEach(function (opt) { unitCents += opt.cents; });
      totalCents = unitCents * qty;
      lines.push('Total: ' + formatPrice(totalCents, cta.dataset.currency || 'GBP'));
    }

    // Product URL + shareable configuration (?cfg= maintained by the configurator)
    var url = cta.dataset.productUrl || '';
    if (url) {
      var cfg = new URLSearchParams(window.location.search).get('cfg');
      if (cfg) url += '?cfg=' + encodeURIComponent(cfg);
      lines.push('', 'Link: ' + url);
    }

    return lines.join('\n');
  }

  /**
   * Product form associated with the CTA.
   *
   * The CTA rendered in buy-buttons knows the <form> id; persistent CTAs
   * (sticky bar, floating button) are rendered outside the product section
   * and do not. We then fall back to the page's add-to-cart form.
   */
  function findForm(cta) {
    var byId = cta.dataset.formId && document.getElementById(cta.dataset.formId);
    if (byId) return byId;

    // Dawn renders two /cart/add forms on a product page: the installment
    // form (hidden, id product-form-installment-…, no properties) comes
    // FIRST in the DOM. Taking the first form would produce a message with
    // no chosen options — exactly what this button must transmit. So the
    // installment form is excluded and a visible form is preferred, then
    // the one carrying the most properties[] fields.
    var forms = [].slice
      .call(document.querySelectorAll('form[action*="/cart/add"]'))
      .filter(function (f) {
        return (f.getAttribute('id') || '').indexOf('installment') === -1;
      });
    if (!forms.length) return null;

    var visible = forms.filter(function (f) {
      return f.offsetParent !== null;
    });
    var candidates = visible.length ? visible : forms;

    return candidates.reduce(function (best, f) {
      return countProperties(f) > countProperties(best) ? f : best;
    }, candidates[0]);
  }

  /** Number of properties[...] fields in a form. */
  function countProperties(form) {
    var n = 0;
    for (var i = 0; i < form.elements.length; i++) {
      if (/^properties\[/.test(form.elements[i].name || '')) n++;
    }
    return n;
  }

  /**
   * Final order: configurator options, then the WhatsApp CTA, then Add to
   * cart.
   *
   * The snippet renders the CTA AFTER button[name=add] on purpose: the
   * options app injects its configurator right before that button at init,
   * so anything placed before it in the markup would end up above the
   * whole configurator. Once the configurator exists, moving the CTA just
   * before the button (or the <span> the app wraps it in) is safe.
   * Idempotent, and re-applied whenever the app reshuffles the DOM
   * (condition re-renders, variant changes).
   */
  function ensureCtaOrder() {
    document.querySelectorAll('a.wheel-whatsapp-cta').forEach(function (cta) {
      var container = cta.parentElement;
      var scope = cta.closest('form');
      var btn =
        (scope && scope.querySelector('button[name="add"]')) ||
        document.querySelector('button[name="add"]');
      if (!btn || !container) return;
      // The options app wraps the button in a plain <span> that stays a
      // direct child of the container; walk up to that direct child (the
      // bare button when the app has not wrapped it) and slot the CTA
      // right before it.
      var unit = btn;
      while (unit.parentElement && unit.parentElement !== container) {
        unit = unit.parentElement;
      }
      if (unit.parentElement !== container) return;
      if (unit.previousElementSibling !== cta) container.insertBefore(cta, unit);
    });
  }

  (function () {
    var enforcing = false;
    function enforce() {
      if (enforcing) return;
      enforcing = true;
      requestAnimationFrame(function () {
        ensureCtaOrder();
        enforcing = false;
      });
    }
    function start() {
      ensureCtaOrder();
      // The app reshuffles its DOM on re-renders (conditional options,
      // variant changes); keep the order enforced. ensureCtaOrder is
      // idempotent, so quiet frames cost nothing and cause no loops.
      new MutationObserver(enforce).observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    if (document.querySelector('.ymq-options-box')) return start();
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      waiter.disconnect();
      clearTimeout(timer);
      start();
    };
    // Wait for the configurator before touching anything: relocating the
    // CTA earlier would make the app inject the configurator below it.
    var waiter = new MutationObserver(function () {
      if (document.querySelector('.ymq-options-box')) finish();
    });
    waiter.observe(document.body, { childList: true, subtree: true });
    // Pages without an option set never render a configurator.
    var timer = setTimeout(finish, 8000);
  })();

  document.addEventListener('click', function (evt) {
    var cta = evt.target.closest('[data-whatsapp-cta]');
    if (!cta) return;

    var form = findForm(cta);
    // Without a form, the fallback href (product + URL) is kept.
    if (!form) return;

    cta.href = 'https://wa.me/' + cta.dataset.phone + '?text=' + encodeURIComponent(buildMessage(cta, form));
  });
})();
