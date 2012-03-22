
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
  assertCookied: function(callback, returnUrl) {
    this.cookied(function(isCookied) {
      if (isCookied) { callback.apply(callback); }
      else { MobDeals.Account.prompt(callback, null, returnUrl); }
    });
  },
  
  switched: function(callback) { this._switchedListeners.push(callback); },
  
  prompt: function(callback, error, returnUrl) {
    MobDeals.Popup.show('login', function(popup) {
      if (!MobDeals.Account._promptHtml) { MobDeals.Account._promptHtml = $('#choose-login-type-popup').remove().html(); }
      popup.html(MobDeals.Account._promptHtml);
      
      var readInput = function() { MobDeals.Account._username($(this), callback); MobDeals.Popup.destroy(popup); }
      popup.find('a.email').bind(CLICK, function(ev) {
 	    popup.find('.inputs').slideDown();
        popup.find('.email-box').removeClass('hidden').addClass('active').find('form').submit(readInput).find('input').blur(readInput).focus(); 
        popup.find('.mobile-box').addClass('hidden').removeClass('active');
      });
      popup.find('a.mobile').bind(CLICK, function(ev) { 
 	    popup.find('.inputs').slideDown();
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
      
      popup.find('a.facebook').bind(CLICK, function(ev) { MobDeals.Account._facebook(callback, returnUrl); MobDeals.Popup.destroy(popup); });
    });
  },

  createPassword: function(callback, error) {
    MobDeals.Popup.show('create-password', function(popup) { 
      if (!MobDeals.Account._createPasswordHtml) { MobDeals.Account._createPasswordHtml = $('#create-password-popup').remove().html(); }
      popup.html(MobDeals.Account._createPasswordHtml);
      popup.find('input').focus();
      
      var readInput = function() { 
        $.post(MobDeals.host('core')+'/account/passwords.json', { password: popup.find('input').val() }, function(data) {
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
    var params = {}; params[input.get(0).name] = input.val(); params['user[username]'] = input.val();
    var setAndCallback = function(dataOrXhr, error, errorType) {
      if (error && error != 'success') {
        var data = $.parseJSON(dataOrXhr.responseText)
        console.log(data)
        
        if (data.errors.email[0] == "has already been taken") {
          MobDeals.Popup.show('password', function(popup) { 
            if (!MobDeals.Account._passwordHtml) { MobDeals.Account._passwordHtml = $('#password-popup').remove().html(); }
            popup.html(MobDeals.Account._passwordHtml);
            popup.find('input').focus();
            
            var readInput = function() { MobDeals.Account._password($(this), parent, params, callback); MobDeals.Popup.destroy(popup); }
            popup.find('form').submit(function() { readInput(); return false; }).find('input').blur(readInput).focus();

            if (error) {
              var box = popup.find('.'+error.field+'-box');
              box.find('.errors').removeClass('hidden').text(error.message);
            }
          });
        }
        else {
          MobDeals.Account.prompt(callback, $.parseJSON(dataOrXhr.responseText));
        }
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
      success: function(data) {
        setAndCallback(data);
      }, 
      error: function(xhr, data, error) {
        $.ajax({ 
          url: MobDeals.host('core')+'/users.json',
          type:'POST',
          data: params,
          success: setAndCallback,
          error: setAndCallback,
          dataType: 'json'
        }); // register
      },
      dataType: 'json'
    });
  },
  
  _password: function(parent, grandparent, additionalParams, callback) {
    var input = parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    additionalParams.password = input.val()
    $.post(MobDeals.host('core')+'/users/sign_in.json', additionalParams, function(data) {
      if (data.authenticated) {
        MobDeals.Account._cookied = true;
        MobDeals.Account._authenticated(data);
        callback.apply(callback);
      }
      else { MobDeals.Account._username(grandparent, callback, data.error); }
    }, 'json');
    
  },

  _facebook: function(callback, returnUrl) {
    MobDeals.Log.click({'event': 'facebook', 'return_url': returnUrl});
    MobDeals.redirect('http://m.facebook.com/login.php?app_id=293759800656841&cancel=http%3A%2F%2Flocalhost%3A3000%2Fusers%2Fauth%2Ffacebook%2Fcallback%3Ferror_reason%3Duser_denied%26error%3Daccess_denied%26error_description%3DThe%2Buser%2Bdenied%2Byour%2Brequest.&fbconnect=1&next=https%3A%2F%2Fm.facebook.com%2Fdialog%2Fpermissions.request%3F_path%3Dpermissions.request%26app_id%3D293759800656841%26redirect_uri%3Dhttp%253A%252F%252Flocalhost%253A3000%252Fusers%252Fauth%252Ffacebook%252Fcallback%26display%3Dtouch%26response_type%3Dcode%26state%3D'+escape(escape(returnUrl))+'%26perms%3Demail%252Coffline_access%26fbconnect%3D1%26from_login%3D1%26client_id%3D293759800656841&rcount=1&_rdr');
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
  _authenticated: function(data) {
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