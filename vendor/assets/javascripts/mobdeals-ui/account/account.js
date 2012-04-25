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

  decookie: function(callback) {
    $.support.cors = true;

    $.ajax({
      url: MobDeals.host('core')+'/users/sign_out.json', 
      type: 'POST',
      xhrFields: {withCredentials: true},
      data: {_method: 'delete'},
      crossDomain: true,
      success: function(data) {  if (callback) { callback.apply(callback); } },
      dataType: 'json'
    });
  },

  switched: function(callback) { this._switchedListeners.push(callback); },

  prompt: function(callback, error, returnUrl) {
    MobDeals.Popup.show('login', function(popup) {
      if (!MobDeals.Account._promptHtml) { MobDeals.Account._promptHtml = $('#choose-login-type-popup').remove().html(); }
      popup.html(MobDeals.Account._promptHtml);
      
      var readInput = function() { MobDeals.Account._username($(this), callback); MobDeals.Popup.destroy(popup); };
      var readInputCancelBubble = function() { readInput(); return false; };
      popup.find('a.email').bind(CLICK, function(ev) {
 	      popup.find('.inputs').slideDown();
        popup.find('.email-box').removeClass('hidden').addClass('active').find('form').submit(readInputCancelBubble).find('input').blur(readInput).focus(); 

        popup.find('.mobile-box').addClass('hidden').removeClass('active');
      });
      popup.find('a.mobile').bind(CLICK, function(ev) { 
 	      popup.find('.inputs').slideDown();
        popup.find('.mobile-box').removeClass('hidden').addClass('active').find('form').submit(readInputCancelBubble).find('input').blur(readInput).focus();
        popup.find('.email-box').addClass('hidden').removeClass('active');
        //popup.find('.mobile-box').keypress(function(event){
        //  if(event.keyCode == 13){
        //    popup.find('.mobile-box').find('form').submit(readInputCancelBubble).find('input').blur(readInput).focus();
        //  }
        //});
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
        $.support.cors = true;
        
        $.ajax({
          url: MobDeals.host('core')+'/account/passwords.json', 
          type: 'POST',
          xhrFields: {withCredentials: true},
          data: { password: popup.find('input').val() },
          crossDomain: true,
          success: function(data) {
            if (data.errors) { MobDeals.Account.createPassword(callback, data.error); }
            else { MobDeals.Account._authenticated(data); callback.apply(callback); }
          },
          dataType: 'json'
        });
        MobDeals.Popup.destroy(popup);
      };
      
      popup.find('form').submit(function() { readInput(); return false; }).find('input').blur(readInput).focus();
      
      if (error) {
        var box = popup.find('.'+error.field+'-box');
        box.find('.errors').text(error.message).removeClass('hidden');
      }
    });
  },

  _username: function(parent, callback, error) {
    var input = parent.get(0).nodeName && parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    var params = {}; params[input.get(0).name] = input.val(); params['user[username]'] = input.val();
    var setAndCallback = function(dataOrXhr, error, errorType) {
      if (error && error != 'success') {
        var data = $.parseJSON(dataOrXhr.responseText);
        
        if ((data.errors.email && data.errors.email[0] == "has already been taken") || (data.errors.mobile && data.errors.mobile[0] == "has already been taken")) {
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
    
    $.support.cors = true;
    
    $.ajax({
      url: MobDeals.host('core') + '/users/sign_in.json', 
      type: 'POST',
      xhrFields: {withCredentials: true},
      data: params,
      dataType: 'json',
      crossDomain: true,
      success: function(data) {
        setAndCallback(data);
      }, 
      error: function(xhr, data, error) {
        $.ajax({ 
          url: MobDeals.host('core')+'/users.json',
          type:'POST',
          xhrFields: {withCredentials: true},
          data: params,
          crossDomain: true,
          success: setAndCallback,
          error: setAndCallback,
          dataType: 'json'
        }); // register
      }
    });
  },

  _password: function(parent, grandparent, additionalParams, callback) {
    var input = parent.get(0).nodeName && parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    additionalParams['user[password]'] = input.val()
    $.support.cors = true;

    $.ajax({
      url: MobDeals.host('core')+'/users/sign_in.json', 
      type: 'POST',
      xhrFields: {withCredentials: true},
      crossDomain: true,
      data: additionalParams,
      success: function(data) {
        if (data.authenticated) {
          MobDeals.Account._cookied = true;
          MobDeals.Account._authenticated(data);
          callback.apply(callback);
        }
        else { MobDeals.Account._username(grandparent, callback, data.error); }
        },
      dataType: 'json'
    });

  },

  _facebook: function(callback, returnUrl) {
    MobDeals.Log.click({'event': 'facebook', 'return_url': returnUrl});
    MobDeals.redirect('http://m.facebook.com/login.php?app_id=249222915102781&cancel=http%3A%2F%2Fdeals.crowdmob.com%2Fusers%2Fauth%2Ffacebook%2Fcallback%3Ferror_reason%3Duser_denied%26error%3Daccess_denied%26error_description%3DThe%2Buser%2Bdenied%2Byour%2Brequest.&fbconnect=1&next=https%3A%2F%2Fm.facebook.com%2Fdialog%2Fpermissions.request%3F_path%3Dpermissions.request%26app_id%3D249222915102781%26redirect_uri%3Dhttp%253A%252F%252Fdeals.crowdmob.com%252Fusers%252Fauth%252Ffacebook%252Fcallback%26display%3Dtouch%26response_type%3Dcode%26state%3D'+escape(escape(returnUrl))+'%26perms%3Demail%252Coffline_access%26fbconnect%3D1%26from_login%3D1%26client_id%3D249222915102781&rcount=1&_rdr');
  },
  
  _clear: function() {
    MobDeals.Account._authenticated(null);
  },
  _verifyCookie: function(callback) {
    $.support.cors = true;
    
    $.ajax({
      url: MobDeals.host('core')+'/sessions.json', 
      type: 'GET',
      xhrFields: {withCredentials: true},
      crossDomain: true,
      success: function(data) {
        MobDeals.Account._authenticated(data);
        },
      error: function(data) {
        MobDeals.Account._authenticated(null);
        },
      complete: function(jqXHR, textStatus) {
        if (callback) {
          callback.apply(callback, [MobDeals.Account._cookied]);
        }
      },
      dataType: 'json'
    });
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
      
      $('#footer .user').html('Hi ' + this.user.short_name + '. <a>Not you?</a>').find('a').bind(CLICK, function(ev) {
        MobDeals.Account.decookie(function() {
          MobDeals.Account._clear();
          MobDeals.Account.prompt();
        });
      });

      var uuid = MobDeals.Account._getUUID();
      if (uuid !== null) {
        $.ajax({
          url: MobDeals.host('core') + '/devices.json',
          type: 'POST',
          xhrFields: {withCredentials: true},
          data: {device: {uuid: uuid}},
          crossDomain: true,
          complete: function(jqXHR, textStatus) {
            alert(jqXHR.responseText);
          }
        });
      }

    }
    if (this.user != null && userWas == null || this.user == null && userWas != null || this.user && userWas && this.user.id == userWas.id) {
      for (var i in this._switchedListeners) {
        this._switchedListeners[i].apply(this._switchedListeners[i]);
      }
    }
  },

  _getUUID: function() {
    var uuid = window.loot_native === undefined ? null : window.loot_native.getUUID();
    return uuid;
  }
};
