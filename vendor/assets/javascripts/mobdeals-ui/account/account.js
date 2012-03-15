
// Anything related to the current user
MobDeals.Account = {
  _initialized: false,
  _cookied: null,
  _switchedListeners: [],
  user: null,
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
  },
  // returns whether or not the user is cookied and returns that to the callback
  cookied: function(callback) {
    if (this._cookied === null) { this._verifyCookie(callback); }
    else if (callback) { callback.apply(callback, [this._cookied]); }
  },
  assertCookied: function(callback) {
    this.cookied(function(isCookied) { console.log("checking isCookied:", isCookied);
      if (isCookied) { callback.apply(callback); }
      else { MobDeals.Account.prompt(callback); }
    });
  },
  
  switched: function(callback) { this._switchedListeners.push(callback); },
  
  prompt: function(callback, error) { console.log("Got in prompt: ", callback, error);
    MobDeals.Popup.show('login', function(popup) {
      if (!MobDeals.Account._promptHtml) { MobDeals.Account._promptHtml = $('#choose-login-type-popup').remove().html(); }
      popup.html(MobDeals.Account._promptHtml);
      
      var readInput = function() { MobDeals.Account._username($(this), callback); MobDeals.Popup.destroy(popup); }
      popup.find('a.email').bind(CLICK, function(ev) {
 	      popup.find('.inputs').slideDown()
        popup.find('.email-box').removeClass('hidden').addClass('active').find('form').submit(readInput).find('input').blur(readInput).focus(); 
        popup.find('.mobile-box').addClass('hidden').removeClass('active');
      });
      popup.find('a.mobile').bind(CLICK, function(ev) { 
 	      popup.find('.inputs').slideDown()
        popup.find('.mobile-box').removeClass('hidden').addClass('active').find('form').submit(readInput).find('input').blur(readInput).focus();
        popup.find('.email-box').addClass('hidden').removeClass('active'); 
      });
      
      if (error && error.errors) {
        for (var field in error.errors) {
          popup.find('a.'+field).click();
          var box = popup.find('.'+field+'-box');
          box.find('.errors').removeClass('hidden').text(field.charAt(0).toUpperCase() + field.slice(1) + ' ' + error.errors[field].join(', and '));
        }
      }
      
      popup.find('a.facebook').bind(CLICK, function(ev) { MobDeals.Account._facebook(callback); });
    });
  },

  createPassword: function(callback, error) {
    MobDeals.Popup.show('create-password', function(popup) { 
      if (!MobDeals.Account._createPasswordHtml) { MobDeals.Account._createPasswordHtml = $('#create-password-popup').remove().html(); }
      popup.html(MobDeals.Account._createPasswordHtml);
      popup.find('input').focus();
      
      var readInput = function() { 
        $.post(MobDeals.host('core')+'/account/passwords.json', { password: popup.find('input').val() }, function(data) { console.log("created password, got", data);
          if (data.errors) { MobDeals.Account.createPassword(callback, data.error); }
          else { MobDeals.Account._authenticated(data); callback.apply(callback); }
        }, 'json');
        MobDeals.Popup.destroy(popup);
      }
      
      popup.find('form').submit(readInput).find('input').blur(readInput).focus();
      
      if (error) {
        var box = popup.find('.'+error.field+'-box');
        box.find('.errors').text(error.message).removeClass('hidden');
      }
    });
  },

  _username: function(parent, callback, error) {
    var input = parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    var params = {}; params[input.get(0).name] = input.val();
    var setAndCallback = function(dataOrXhr, error, errorType) { console.log("GOT USER from callback:", dataOrXhr, error, errorType);
      if (error && error != 'success') {
        MobDeals.Account.prompt(callback, $.parseJSON(dataOrXhr.responseText));
      }
      else {
        MobDeals.Account._authenticated(dataOrXhr);
        if (callback) { callback.apply(callback); }
      }
    };
    
    $.ajax({
      url: MobDeals.host('core')+'/users/sign_in.json', 
      type: 'POST',
      data: params, 
      success: function(data) { console.log('got session data', data);
        if (data.password_initialized) {
          MobDeals.Popup.show('password', function(popup) { 
            if (!MobDeals.Account._passwordHtml) { MobDeals.Account._passwordHtml = $('#password-popup').remove().html(); }
            popup.html(MobDeals.Account._passwordHtml);
            popup.find('input').focus();
          });
          var readInput = function() { MobDeals.Account._password($(this), parent, callback); MobDeals.Popup.destroy(popup); }
          popup.find('form').submit(readInput).find('input').blur(readInput).focus();
          
          if (error) {
            var box = popup.find('.'+error.field+'-box');
            box.find('.errors').text(error.message).removeClass('hidden');
          }
        }
        else { setAndCallback(data); }
      }, 
      error: function(xhr, data, error) {console.log('got error in session', xhr, data, error);
        $.ajax({ url: MobDeals.host('core')+'/users.json', type:'POST', data: params, success: setAndCallback, error: setAndCallback,  dataType: 'json'}); // register
      },
      dataType: 'json'
    });
  },
  
  _password: function(parent, grandparent, callback) {
    var input = parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    $.post(MobDeals.host('core')+'/users/sign_in.json', { password: input.val() }, function(data) {
      if (data.authenticated) {
        MobDeals.Account._cookied = true;
        MobDeals.Account._authenticated(data);
        callback.apply(callback);
      }
      else { MobDeals.Account._username(grandparent, callback, data.error); }
    }, 'json');
    
  },

  _facebook: function(callback) {
    MobDeals.Log.click({'event': 'facebook'});
    MobDeals.redirect('https://WIP');
    // TODO FIND WAY TO MAKE CALLBACK INSIDE AN IFRAME
  },
  
  _clear: function() {
    MobDeals.Account._authenticated(null);
  },
  _verifyCookie: function(callback) {
    $.get(MobDeals.host('core')+'/sessions.json', function(data) {
      if (data.error) { MobDeals.Account._authenticated(null); }
      else { MobDeals.Account._authenticated(data); }
      
      if (callback) { callback.apply(callback, [MobDeals.Account._cookied]); }
    }, 'json');
  },
  _authenticated: function(data) { console.log("setting user _auth", data);
    var userWas = this.user;
    if (!data || data.id == null) { 
      this._cookied = false;
      this.user = null;
      $('#footer .user').html('<a>Login...</a>').find('a').bind(CLICK, function(ev) { MobDeals.Account.prompt(); }); 
    }
    else {
      this._cookied = true;
      this.user = data;
      
      $('#footer .user').html('Hi '+this.user.short_name+'. <a>Not you?</a>').find('a').bind(CLICK, function(ev) { 
        MobDeals.Account._clear();
        MobDeals.Account.prompt();
      });
    }
    if (this.user != null && userWas == null || this.user == null && userWas != null || this.user && userWas && this.user.id == userWas.id) {
      for (var i in this._switchedListeners) {
        this._switchedListeners[i].apply(this._switchedListeners[i]);
      }
    }
  }
};