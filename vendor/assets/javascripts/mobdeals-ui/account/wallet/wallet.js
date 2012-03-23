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
  selectedMethod: function(callback, offer) {
    if (!this.loaded) { return this.load(function() { MobDeals.Account.Wallet.selectedMethod(callback, offer); })}  
    else if (this._default) { return callback.apply(callback, [this._default, false]); }
    else if (offer.pay_later_allowed && MobDeals.Account.user.can_pay_later) { return this._when(callback, offer); }
    else { return this._now(callback, offer); }
  },
  load: function(callback) {
    $.ajax({
      url: MobDeals.host('core')+'/account/wallet/methods/usable.json',
      async: false,
      type: 'OPTION',
      dataType: 'json'
    }).done(function( data ) {
      MobDeals.Account.Wallet.methods = data;
      MobDeals.Account.Wallet._default = MobDeals.Account.Wallet.methods ? MobDeals.Account.Wallet.methods[0] : null;
      MobDeals.Account.Wallet.loaded = true;
      if (callback) { callback.apply(callback); }
    });
    
    
    //$.get(MobDeals.host('core')+'/account/wallet/methods/usable.json', function(data) {
    //  MobDeals.Account.Wallet.methods = data;
    //  MobDeals.Account.Wallet._default = MobDeals.Account.Wallet.methods ? MobDeals.Account.Wallet.methods[0] : null;
    //  MobDeals.Account.Wallet.loaded = true;
    //  if (callback) { callback.apply(callback); }
    //}, 
    //'json');
  },
  switch: function(callback) {
    // TODO
    alert("Sorry, we're hard at work on this and you'll be able to switch payment methods soon!");
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
        else { MobDeals.Account.Wallet.switch(callback, offer); }
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
    $.get(MobDeals.host('core') + 
      '/account/wallet/methods/' + uri + '/new.json?settle=true&redirect=offerwall&habitat[apikey]=' + 
      MobDeals.Habitat.apiKey() + '&purchasable_type=' + offer.purchasable_type + '&purchasable_id=' + offer.id+ '&purchasable[virtual_good_id]='+offer.virtual_good_id, 
      function(data) {
        MobDeals.redirect(data.setup_url);
      }, 
    'json');
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

        $.post(MobDeals.host('core')+'/account/wallet/methods.json', { settle: offer != null, wallet_method: serializedCard, 'purchasable[virtual_good_id]': offer.virtual_good_id, 'purchasable_type': offer.purchasable_type, 'purchasable_id': offer.id, 'habitat[apikey]': MobDeals.Habitat.apiKey()}, function(data) {
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
        'json');

        popup.find('.row-1-error,.row-2-error').addClass('hidden');
        popup.find('p.card_number,p.cvv,p.exp').removeClass('errored');

        return false;
      });
    });
  }
};

