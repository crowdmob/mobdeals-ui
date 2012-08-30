MobDeals.Account.Wallet = {
  _initialized: false,
  _defaultWalletMethod: null,
  loaded: false,
  methods: null,
  purchaseData: null,

  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
  },

  assertChargeConfirmed: function(message, purchasable, walletMethod, confirmed, canceled) {
    MobDeals.Popup.show('confirm-purchase', function(popup) {
      if (!MobDeals.Account.Wallet._confirmPurchaseHtml) { MobDeals.Account.Wallet._confirmPurchaseHtml = $('#confirm-purchase-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._confirmPurchaseHtml);
      popup.find('.confirm-message').text(message);

      if (walletMethod.kind == 'credit_card') {
        popup.find('.using-cc').removeClass('hidden').find('.lastfour').text(walletMethod.last_four);
      }
      else {
        popup.find('.using-3rdparty').removeClass('hidden').find('.3rdparty-name').text(walletMethod.kind);
      }

      popup.find('button.cancel').bind(CLICK, function(ev) {
        MobDeals.Log.click({'event': 'cancel-payment', 'purchasable_id': purchasable.id, 'purchasable_type': purchasable.purchasable_type});
        if (canceled) { canceled.apply(canceled, [purchasable, walletMethod]); }
        MobDeals.Popup.destroy(popup);
      });
      popup.find('button.buy').bind(CLICK, function(ev) {
        if (confirmed) { confirmed.apply(confirmed, [purchasable, walletMethod]); }
        MobDeals.Popup.destroy(popup);
      });
      popup.find('.switch').bind(CLICK, function(ev) {
        MobDeals.Account.Wallet.switchPaymentMethod(purchasable, function() { 
          if (confirmed) { confirmed.apply(confirmed, [purchasable, walletMethod]); } 
        });
        MobDeals.Popup.destroy(popup);
      });
    });
  },

  charge: function(purchasable, walletMethod, successCallback, passwordCallback, chargeCompletedCallback, dataErrorCallback, connectionErrorCallback) {
    var apiKey = MobDeals.Habitat.apiKey();
    var appId = MobDeals.Habitat.appId();
    
    $.support.cors = true;
    $.ajax({
      url: MobDeals.host('core') + '/account/purchases.json', 
      type: 'POST',
      xhrFields: { withCredentials: true },
      data: { purchase: { unique_id: purchasable.uniqueId, 
        purchasable_id: purchasable.id, purchasable_type: purchasable.purchasable_type, 
        wallet_method_id: walletMethod.id, extra_data: purchasable.extra_data,
        purchasable: { virtual_good_id: purchasable.virtual_good_id }, 
        habitat: { apikey: apiKey, id: appId } }
      },
      crossDomain: true,
      success: function(data) {
        if (data.error_message && dataErrorCallback) {
          console.log("fake error!");
          return dataErrorCallback.apply(dataErrorCallback, [data.error_message]);
        }
        else if (data.settled) {              //Change for pay later  
          MobDeals.Account.Wallet.purchaseData = data;
        
          // Any callbacks, like report to natives...
          if (chargeCompletedCallback) { chargeCompletedCallback.apply(chargeCompletedCallback, [data]); } 
        
          if (!MobDeals.Account.user.password_initialized) {
            if (passwordCallback) { passwordCallback.call(); }
          }
          else {
            if (successCallback) { successCallback.call(); }
          }
        }
      },
      error: function() {
        console.log("Real Error!");
        if (connectionErrorCallback) { connectionErrorCallback.apply(connectionErrorCallback, [data]); }
      },
      dataType: 'json'
    });
  },
  
  createNewCC: function(div, purchasable, successCallback, passwordCallback) {
    var serializedCard = { kind: 'credit_card' };
    var form_loc = div.find('form');
    
    $.each(form_loc.serializeArray(), function(index,value) { serializedCard[value.name] = value.value; });

    $.support.cors = true;
    $.ajax({
      url: MobDeals.host('core') + '/account/wallet/methods.json', 
      type: 'POST',
      xhrFields: { withCredentials: true },
      data: { settle: purchasable != null, wallet_method: serializedCard,
        purchasable_id: purchasable.id, purchasable_type: purchasable.purchasable_type, 
        purchasable: { appymeal: purchasable.appymeal, unique_id: purchasable.uniqueId, extra_data: purchasable.extra_data,
          app_id: purchasable.app_id, virtual_good_id: purchasable.virtual_good_id }, 
        habitat: { apikey: MobDeals.Habitat.apiKey() }
      },
      crossDomain: true,
      success: function(data) {
        if (data.errors && data.errors.bad_input) {
          if (data.error_data.bad_input == 'card_number') {
            div.find('.row-1-error').text('Credit card number is incorrect. Please try again.').removeClass('hidden');
            div.find('p.card_number').addClass('errored');
          }
          else if (data.error_data.bad_input == 'card_processing') {
            div.find('.row-1-error').text('Card declined. Please try another card, or call your bank.').removeClass('hidden');
            div.find('p.card_number').addClass('errored');
          }
          else if (data.error_data.bad_input == 'card_sec') {
            div.find('.row-2-error').text('Security code incorrect. Please try again.').removeClass('hidden');
            div.find('p.cvv').addClass('errored');
          }
          else if (data.error_data.bad_input == 'card_expires') {
            div.find('.row-2-error').text('Expiration date is incorrect. Please try again.').removeClass('hidden');
            div.find('p.exp').addClass('errored');
          }
        }
        else {
          MobDeals.Account.Wallet.purchaseData = data;
          
          if (!MobDeals.Account.user.password_initialized) {
            if (passwordCallback) { passwordCallback.call(); }
          }
          else { 
            if (successCallback) { successCallback.call(); }
          }
        }
      },
      dataType: 'json'
    });
  },

  loadWalletMethods: function(callback) {
    $.support.cors = true;
    $.ajax({
      url: MobDeals.host('core')+'/account/wallet/methods/usable.json', 
      type: 'GET',
      xhrFields: { withCredentials: true },
      crossDomain: true,
      success: function(data) {
        MobDeals.Account.Wallet.methods = data;
        MobDeals.Account.Wallet._defaultWalletMethod = MobDeals.Account.Wallet.methods ? MobDeals.Account.Wallet.methods[0] : null;
        MobDeals.Account.Wallet.loaded = true;
        if (callback) { callback.apply(callback); }
      },
      dataType: 'json'
    });
  },
  
  selectedMethod: function(purchasable, callback, redirectTo) {
    if (!this.loaded) {
      return this.loadWalletMethods(function() { MobDeals.Account.Wallet.selectedMethod(purchasable, callback); })
    }  
    else if (this._defaultWalletMethod) {
      return callback.apply(callback, [this._defaultWalletMethod]);
    }
    else if (purchasable.pay_later_allowed && MobDeals.Account.user.can_pay_later) {
      return this._when(callback, purchasable, redirectTo);
    }
    else {
      return this._now(purchasable, redirectTo);
    }
  },
  
  switchPaymentMethod: function(purchasable, callback) {
    // TODO
    MobDeals.Log.click({'event': 'switch-payment-method', 'purchasable_id': purchasable.id, 'purchasable_type': purchasable.purchasable_type});
    alert("Sorry, we're hard at work on this and you'll be able to switch payment methods soon!");
  },

  receipt: function(receiptId, passwordCreated) {
    if (!receiptId) {
      receiptId = MobDeals.Account.Wallet.purchaseData.id;
    }
    
    MobDeals.Popup.show('receipt', function(popup) {
      if (!MobDeals.Account.Wallet._receiptHtml) { MobDeals.Account.Wallet._receiptHtml = $('#receipt-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._receiptHtml);

      //if (purchase.appymeal) { popup.find('.giftcard').addClass('hidden'); }

      if (passwordCreated) { popup.find('.initialized-password').removeClass('hidden'); }

      popup.find('button.giftcard').bind(CLICK, function(ev) {
        MobDeals.redirect(MobDeals.host('wallet') + '?receipt_id=' + receiptId);
        MobDeals.Popup.destroy(popup);
      });
      popup.find('button.continue').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
      });
    });
  },
  
  _ccPopup: function(purchasable) {
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
        MobDeals.Account.Wallet._now(purchasable);
      });
      
      popup.find('a.cancel').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Log.click({'event': 'cancel-new-cc-payment', 'purchasable': purchasable.id});
      });
      
      popup.find('form').submit(function(ev) {
        var passwordCallback = function() {
          MobDeals.Popup.destroy(popup);
          MobDeals.Account.createPasswordPopup(MobDeals.Account.Wallet.receipt)
        }
        var successCallback = function() {
          MobDeals.Popup.destroy(popup);
          MobDeals.Account.Wallet.receipt();
        }
        MobDeals.Account.Wallet.createNewCC(popup, purchasable, successCallback, passwordCallback);

        popup.find('.row-1-error,.row-2-error').addClass('hidden');
        popup.find('p.card_number,p.cvv,p.exp').removeClass('errored');

        return false;
      });
    });
  },
    
  _empty: function() {
    return this.methods == null || this.methods.length < 1;
  },
    
  _now: function(purchasable, redirectTo) {
    MobDeals.Popup.show('new-method-type', function(popup) {
      if (!MobDeals.Account.Wallet._nowHtml) { MobDeals.Account.Wallet._nowHtml = $('#new-method-type-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._nowHtml);

      popup.find('button.cc').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._ccPopup(purchasable, redirectTo);
      });
      popup.find('button.paypal').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._start3rdParty('paypals', purchasable, redirectTo);
      });
      popup.find('button.amazon').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        MobDeals.Account.Wallet._start3rdParty('amazons', purchasable, redirectTo);
      });
    });
  },
  
  _start3rdParty: function(uri, purchasable, redirectTo) {
    $.support.cors = true;
    $.ajax({
      url: MobDeals.host('core') + 
        '/account/wallet/methods/' + uri + '/new.json?settle=true&redirect='+(redirectTo ? redirectTo :  'offerwall')+'&habitat[apikey]=' + 
        MobDeals.Habitat.apiKey()+'&habitat[id]=' + 
        MobDeals.Habitat.appId()  + '&purchasable_type=' + purchasable.purchasable_type + '&purchasable_id=' + purchasable.id+ '&purchasable[virtual_good_id]='+purchasable.virtual_good_id+'&purchasable[app_id]=' + purchasable.app_id,
      type: 'GET',
      xhrFields: { withCredentials: true },
      crossDomain: true,
      success: function(data) {
        MobDeals.redirect(data.setup_url);
      },
      dataType: 'json'
    });
  },
  
  _when: function(callback, purchasable, redirectTo) {
    MobDeals.Popup.show('pay-when', function(popup) {
      if (!MobDeals.Account.Wallet._whenHtml) { MobDeals.Account.Wallet._whenHtml = $('#pay-when-popup').remove().html(); }
      popup.html(MobDeals.Account.Wallet._whenHtml);
      popup.find('a.now .virtual-count').text(purchasable.currency);
      popup.find('a.later .virtual-count').text(purchasable.advanced_virtual_good_quantity_for_pay_later);
      popup.find('.virtual-img').html('<img src="' + purchasable.virtual_good_image_url + '"/>');

      popup.find('a.now').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        if (MobDeals.Account.Wallet._empty()) { MobDeals.Account.Wallet._now(callback, purchasable, redirectTo); }
        else { MobDeals.Account.Wallet.switchPaymentMethod(purchasable, callback); }
      });
      popup.find('a.later').bind(CLICK, function(ev) {
        MobDeals.Popup.destroy(popup);
        callback.apply(callback, [{type: 'later'}, true]); // purchase is done!
      });
    });
  }
};

