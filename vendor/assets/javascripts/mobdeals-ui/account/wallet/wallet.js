MobDeals.Account.Wallet = {
  _initialized: false,
  loaded: false,
  methods: null,
  _default: null,
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
  },
  
  _empty: function() {
    return this.methods == null || this.methods.length < 1;
  },
  selectedMethod: function(callback, purchasable) {
    if (!this.loaded) { return this.load(function() { MobDeals.Account.Wallet.selectedMethod(callback, purchasable); })}  
    else if (this._default) { return callback.apply(callback, [this._default, false]); }
    else if (purchasable.pay_later_allowed && MobDeals.Account.user.can_pay_later) { return this._when(callback, purchasable); }
    else { return this._now(callback, purchasable); }
  },
  load: function(callback) {
    $.support.cors = true;
    
    $.ajax({
      url: MobDeals.host('core')+'/account/wallet/methods/usable.json', 
      type: 'GET',
      xhrFields: { withCredentials: true },
      crossDomain: true,
      success: function(data) {
        MobDeals.Account.Wallet.methods = data;
        MobDeals.Account.Wallet._default = MobDeals.Account.Wallet.methods ? MobDeals.Account.Wallet.methods[0] : null;
        MobDeals.Account.Wallet.loaded = true;
        if (callback) { callback.apply(callback); }
      },
      dataType: 'json'
    });
  },
  switchPaymentMethod: function(callback, purchasable) {
    // TODO
    MobDeals.Log.click({'event': 'switch-payment-method', 'purchasable_id': purchasable.id, 'purchasable_type': purchasable.purchasable_type});
    alert("Sorry, we're hard at work on this and you'll be able to switch payment methods soon!");
  },
  assertChargeConfirmed: function(message, purchasable, walletMethod, confirmed, canceled) {
    MobDeals.Popup.show('confirm-purchase', function(popup) {
      if (!MobDeals.Account.Wallet._confirmPurchaseHtml) { MobDeals.Account.Wallet._confirmPurchaseHtml = $('#confirm-purchase-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._confirmPurchaseHtml);
      popup.find('.confirm-message').text(message);

      if (walletMethod.kind == 'credit_card') { popup.find('.using-cc').removeClass('hidden').find('.lastfour').text(walletMethod.last_four); }
      else { popup.find('.using-3rdparty').removeClass('hidden').find('.3rdparty-name').text(walletMethod.kind); }

      popup.find('button.cancel').bind(CLICK, function(ev) {
        MobDeals.Log.click({'event': 'cancel-payment', 'purchasable_id': purchasable.id, 'purchasable_type': purchasable.purchasable_type});
        if (canceled) { canceled.apply(canceled, [purchasable, walletMethod]); }
        MobDeals.Popup.destroy(popup);
      });
      popup.find('button.buy').bind(CLICK, function(ev) {
        confirmed.apply(confirmed, [purchasable, walletMethod]);
        MobDeals.Popup.destroy(popup);
      });
      popup.find('.switch').bind(CLICK, function(ev) {
        MobDeals.Account.Wallet.switchPaymentMethod(function() { confirmed.apply(confirmed, [purchasable, walletMethod]); }, purchasable);
        MobDeals.Popup.destroy(popup);
      });
    });
  },
  
  charge: function(purchasable, walletMethod, chargeCompletedCallback) {
    $.support.cors = true;
    $.ajax({
      url: MobDeals.host('core')+'/account/purchases.json', 
      type: 'POST',
      xhrFields: { withCredentials: true },
      data: { purchase: { purchasable_id: purchasable.id, purchasable_type: purchasable.purchasable_type, wallet_method_id: walletMethod.id, extra_data: purchasable.extra_data }, habitat: { apikey: MobDeals.Habitat.apiKey() } },
      crossDomain: true,
      success: function(data) {
        if (data.error_message) { return MobDeals.error(data.error_message); }
        
        // Any callbacks, like report to natives...
        if (chargeCompletedCallback) { chargeCompletedCallback.apply(chargeCompletedCallback, [data]); } 
        
        if (!MobDeals.Account.user.password_initialized) {
          MobDeals.Account.createPassword(function() { MobDeals.Account.Wallet.receipt(data, true, data.id); });
        }
        else { MobDeals.Account.Wallet.receipt(data, false, data.id); }
      },
      dataType: 'json'
    });
  },

  receipt: function(purchase, passwordCreated, receiptId) {
    MobDeals.Popup.show('receipt', function(popup) {
      if (!MobDeals.Account.Wallet._receiptHtml) { MobDeals.Account.Wallet._receiptHtml = $('#receipt-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._receiptHtml);

      if (passwordCreated) { popup.find('.initialized-password').removeClass('hidden'); }

      popup.find('button.giftcard').bind(CLICK, function(ev) {
        MobDeals.redirect(MobDeals.host('wallet') + '/?receipt_id='+receiptId);
        MobDeals.Popup.destroy(popup);
      });
      popup.find('button.continue').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
      });
    });
  },
  
  _when: function(callback, offer) {
    MobDeals.Popup.show('pay-when', function(popup) {
      if (!MobDeals.Account.Wallet._whenHtml) { MobDeals.Account.Wallet._whenHtml = $('#pay-when-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._whenHtml);
      popup.find('a.now .virtual-count').text(offer.currency);
      popup.find('a.later .virtual-count').text(offer.advanced_virtual_good_quantity_for_pay_later);
      popup.find('.virtual-img').html('<img src="'+offer.virtual_good_image_url+'"/>');

      popup.find('a.now').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        if (MobDeals.Account.Wallet._empty()) { MobDeals.Account.Wallet._now(callback, offer); }
        else { MobDeals.Account.Wallet.switchPaymentMethod(callback, offer); }
      });
      popup.find('a.later').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        callback.apply(callback, [{type: 'later'}, true]); // purchase is done!
      });
    });
  },
  _now: function(callback, offer) {
    MobDeals.Popup.show('new-method-type', function(popup) {
      if (!MobDeals.Account.Wallet._nowHtml) { MobDeals.Account.Wallet._nowHtml = $('#new-method-type-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._nowHtml);

      popup.find('button.cc').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._cc(callback, offer);
      });
      popup.find('button.paypal').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._start3rdParty('paypals', callback, offer);
      });
      popup.find('button.amazon').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._start3rdParty('amazons', callback, offer);
      });
    });
  },
  _start3rdParty: function(uri, callback, offer) {
    $.support.cors = true;
    
    $.ajax({
      url: MobDeals.host('core') + 
        '/account/wallet/methods/' + uri + '/new.json?settle=true&redirect=offerwall&habitat[apikey]=' + 
        MobDeals.Habitat.apiKey() + '&purchasable_type=' + offer.purchasable_type + '&purchasable_id=' + offer.id+ '&purchasable[virtual_good_id]='+offer.virtual_good_id+'&purchasable[app_id]=' + offer.app_id,
      type: 'GET',
      xhrFields: { withCredentials: true },
      crossDomain: true,
      success: function(data) {
        MobDeals.redirect(data.setup_url);
      },
      dataType: 'json'
    });
  },
  _cc: function(callback, offer) {
    MobDeals.Popup.show('new-cc', function(popup) {
      if (!MobDeals.Account.Wallet._ccHtml) { MobDeals.Account.Wallet._ccHtml = $('#new-cc-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._ccHtml);
      
      var hinted = popup.find('input.exp');
      hinted.bind('focus', function(ev) { popup.find('label').hide(); });
      hinted.bind('blur', function(ev) {
        if ($(this).val() != '') { popup.find('label').hide(); } 
        else { popup.find('label').show(); } 
      });

      popup.find('a.back').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._now(callback, offer);
      });
      
      popup.find('a.cancel').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Log.click({'event': 'cancel-new-cc-payment', 'offer': offer.id});
      });
      
      popup.find('form').submit(function(ev) {
        var serializedCard = {kind: 'credit_card'};
        $.each($(this).serializeArray(), function(index,value) { serializedCard[value.name] = value.value; });

        $.support.cors = true;

        $.ajax({
          url: MobDeals.host('core')+'/account/wallet/methods.json', 
          type: 'POST',
          xhrFields: { withCredentials: true },
          data: { settle: offer != null, wallet_method: serializedCard, 'purchasable[virtual_good_id]': offer.virtual_good_id, 'purchasable_type': offer.purchasable_type, 'purchasable_id': offer.id, 'purchasable[app_id]': offer.app_id, 'habitat[apikey]': MobDeals.Habitat.apiKey()},
          crossDomain: true,
          success: function(data) {
            if (data.errors && data.errors.bad_input) {
              if (data.error_data.bad_input == 'card_number') {
                popup.find('.row-1-error').text('Credit card number is incorrect. Please try again.').removeClass('hidden');
                popup.find('p.card_number').addClass('errored');
              }
              else if (data.error_data.bad_input == 'card_processing') {
                popup.find('.row-1-error').text('Card declined. Please try another card, or call your bank.').removeClass('hidden');
                popup.find('p.card_number').addClass('errored');
              }
              else if (data.error_data.bad_input == 'card_sec') {
                popup.find('.row-2-error').text('Security code incorrect. Please try again.').removeClass('hidden');
                popup.find('p.cvv').addClass('errored');
              }
              else if (data.error_data.bad_input == 'card_expires') {
                popup.find('.row-2-error').text('Expiration date is incorrect. Please try again.').removeClass('hidden');
                popup.find('p.exp').addClass('errored');
              }
            }
            else { MobDeals.Popup.destroy(popup); if (callback) { callback.apply(callback, [data, true]); } }
          },
          dataType: 'json'
        });

        popup.find('.row-1-error,.row-2-error').addClass('hidden');
        popup.find('p.card_number,p.cvv,p.exp').removeClass('errored');

        return false;
      });
    });
  }
};

