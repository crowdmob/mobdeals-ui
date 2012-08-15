// Anything related to the current user
MobDeals.Account = {
  _initialized: false,
  _cookied: false,
  _switchedListeners: [],
  user: null,
  facebookClientId: '249222915102781',

  init: function() {
    if (this._initialized) {
      return false;
    }

    this.facebookClientId = '249222915102781';    // production
    if (location.hostname.indexOf('mobstaging.com') != -1) {
      this.facebookClientId = '288627961176125';  // staging
    }
    else if (location.hostname.indexOf('localhost') != -1 || location.hostname.indexOf('127.0.0.1') != -1) {
      this.facebookClientId = '293759800656841';  // development
    }

    this._initialized = true;
  },

  // Determines whether or not the user is cookied and returns that to the
  // callback.
  cookied: function(callback) {
    if (this._cookied == false) {
      this._verifyCookie(callback);
    }
    else if (callback) {
      callback.apply(callback, [this._cookied]);
    }
  },

  assertCookied: function(callback, returnUrl) {
    this.cookied(function(isCookied) {
      if (isCookied) {
        callback.apply(callback);
      }
      else {
        MobDeals.Account.loginPrompt(callback, null, returnUrl);
      }
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
      success: function(data) {
        MobDeals.Account._clear();
        if (callback) { callback.apply(callback); }
      },
      dataType: 'json'
    });
  },

  switched: function(callback) {
    this._switchedListeners.push(callback);
  },

  loginPrompt: function(callback, error, returnUrl) {
    MobDeals.Popup.show('login', function(popup) {
      if (!MobDeals.Account._promptHtml) {
        MobDeals.Account._promptHtml = $('#choose-login-type-popup').remove().html();
      }
      popup.html(MobDeals.Account._promptHtml);

      var readInput = function() {
        MobDeals.Account._username($(this), callback);
        MobDeals.Popup.destroy(popup);
      };
      var readInputCancelBubble = function() {
        $(this).find("*:focus").blur();
        return false;
      };
      popup.find('a.email').bind(CLICK, function(ev) {
 	      popup.find('.inputs').slideDown();
        popup.find('.email-box').removeClass('hidden').addClass('active').find('form').submit(readInputCancelBubble).find('input').blur(readInput).focus();
        popup.find('.mobile-box').addClass('hidden').removeClass('active');
      });
      popup.find('a.mobile').bind(CLICK, function(ev) {
 	      popup.find('.inputs').slideDown();
        popup.find('.mobile-box').removeClass('hidden').addClass('active').find('form').submit(readInputCancelBubble).find('input').blur(readInput).focus();
        popup.find('.email-box').addClass('hidden').removeClass('active');
      });

      if (error && error.errors) {
        for (var field in error.errors) {
          popup.find('a.'+field).click();
          var box = popup.find('.'+field+'-box');
          box.find('.errors').removeClass('hidden').text(field.charAt(0).toUpperCase() + field.slice(1) + ' ' + error.errors[field].join(', and '));
        }
      }

      popup.find('a.facebook').bind(CLICK, function(ev) {
        MobDeals.Account._facebook(callback, returnUrl);
        MobDeals.Popup.destroy(popup);
      });
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

      popup.find('form').submit(function() { $(this).find("*:focus").blur(); return false; }).find('input').blur(readInput).focus();

      if (error) {
        var box = popup.find('.'+error.field+'-box');
        box.find('.errors').text(error.message).removeClass('hidden');
      }
    });
  },

  _username: function(parent, callback, error) {
    var input = parent.get(0).nodeName && parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    
    var params = {};
    params['user[type]'] = input.get(0).name;
    params['user[username]'] = input.val();
    
    var setAndCallback = function(dataOrXhr, error, errorType) {
      if (error && error != 'success') {
        var data = $.parseJSON(dataOrXhr.responseText);
        
        if ((data.errors.email && data.errors.email[0] == "has already been taken") || (data.errors.mobile && data.errors.mobile[0] == "has already been taken")) {
          MobDeals.Popup.show('password', function(popup) { 
            if (!MobDeals.Account._passwordHtml) { MobDeals.Account._passwordHtml = $('#password-popup').remove().html(); }
            popup.html(MobDeals.Account._passwordHtml);
            popup.find('input').focus();

            var readInput = function() { MobDeals.Account._password($(this), parent, params, callback); MobDeals.Popup.destroy(popup); }
            popup.find('form').submit(function() { $(this).find("*:focus").blur(); return false; }).find('input').blur(readInput).focus();

            if (error) {
              var box = popup.find('.'+error.field+'-box');
              box.find('.errors').removeClass('hidden').text(error.message);
            }
          });
        }
        else {
          MobDeals.Account.loginPrompt(callback, $.parseJSON(dataOrXhr.responseText));
        }
      }
      else {
        MobDeals.Account._authenticated(dataOrXhr);
        if (callback) { callback.apply(callback); }
      }
    };
    
    MobDeals.Account.login(params, setAndCallback, setAndCallback);
  },
  
  login: function(params, successCallback, failureCallback) {
    $.support.cors = true;
    
    $.ajax({
      url: MobDeals.host('core') + '/users/sign_in.json', 
      type: 'POST',
      xhrFields: {withCredentials: true},
      data: params,
      dataType: 'json',
      crossDomain: true,
      success: successCallback, 
      error: function(xhr, data, error) {
        $.ajax({ 
          url: MobDeals.host('core') + '/users.json',
          type: 'POST',
          xhrFields: {withCredentials: true},
          data: params,
          crossDomain: true,
          success: successCallback,
          error: failureCallback,
          dataType: 'json'
        });
      }
    });
  },

  _password: function(parent, grandparent, additionalParams, callback) {
    var input = parent.get(0).nodeName && parent.get(0).nodeName.toLowerCase() == 'input' ? parent : parent.find('input');
    additionalParams['user[password]'] = input.val();
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
        else {
          MobDeals.Account._username(grandparent, callback, data.error);
        }
      },
      dataType: 'json'
    });
  },

  // TODO: This callback does nothing.  We redirect to another (Facebook login) page, then Facebook redirects back to us.  Why is this here?  Remove it?
  _facebook: function(callback, returnUrl, cancelUrl, like, posting) {
    MobDeals.Log.click({'event': 'facebook', 'return_url': returnUrl});

    if (!cancelUrl) {
      cancelUrl = returnUrl;
    }
 
    var redirectUrl = MobDeals.host('core') + '/users/auth/facebook/callback';
    
    if (this._cookied) {
      appendage = (returnUrl.indexOf('?') != -1) ? '&' : '?';
      if (this.user.email) {
        returnUrl = returnUrl + appendage + 'email=' + this.user.email;
      }
      else if (this.user.mobile) {
        returnUrl = returnUrl + appendage + 'mobile=' + this.user.mobile;
      }
    }
    
    var permissions = 'email,publish_actions,user_actions.news,user_actions.video,user_actions.music';
    
    if (like) {
      permissions = permissions + ',user_likes';
    }
    if (posting) {
      permissions = permissions + ',publish_stream';
    }
    
    var facebookLoginUrl = 'http://m.facebook.com/dialog/oauth?client_id=' + MobDeals.Account.facebookClientId +
    '&redirect_uri=' + escape(redirectUrl) +
    '&scope=' + permissions +
    '&state=' + escape(returnUrl) +
    '&response_type=code' +
    '&display_type=touch';
    MobDeals.redirect(facebookLoginUrl);
  },

  _clear: function() {
    MobDeals.Account._authenticated(null);
    MobDeals.Account._cookied = false;
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
      $('.mobdeals-account-link-box').html('<a>Login...</a>').find('a').bind(CLICK, function(ev) {
        MobDeals.Account.loginPrompt();
      });
    }
    else {
      this._cookied = true;
      this.user = data;

      var short_name = this.user.short_name;
      
      if (this.user.mobile) {
        short_name = MobDeals.Account.formatMobileNumber(this.user.mobile);
      }

      $('.mobdeals-account-link-box').html('Hi ' + short_name + '. <a>Not you?</a>').find('a').bind(CLICK, function(ev) {
        MobDeals.Account.decookie(function() {
          MobDeals.Account._clear();
          MobDeals.Account.loginPrompt();
        });
      });

      if (MobDeals.Habitat !== undefined) {
        MobDeals.Habitat.report('loot-register', '', MobDeals.Account._androidSetupRegistration);
      }
    }
    if (this.user != null && userWas == null || this.user == null && userWas != null || this.user && userWas && this.user.id == userWas.id) {
      for (var i in this._switchedListeners) {
        this._switchedListeners[i].apply(this._switchedListeners[i]);
      }
    }
  },

  _androidSetupRegistration: function() {
    var uuids = MobDeals.Account._getUuids();
    data = {
      platform: MobDeals.Habitat.platform,
      adcolony_udid: window.loot_native.getAdColonyDeviceId(),
      android_id: uuids.android_id,
      android_serial_number: uuids.android_id,
      android_telephony_id: uuids.android_telephony_id,
      mac_address: uuids.mac_address
    };
    MobDeals.Account._registerDevice(data);
  },

  _getUuids: function() {
    // Note: This is only for Android.  iOS device registrations are handled
    // differently.
    var uuids = window.loot_native === undefined ? {} : window.loot_native.getUuids();
    uuids = $.parseJSON(uuids);
    return uuids;
  },

  _registerDevice: function(data) {
    // Confusing.  :-(  On the front-end, we store low-resolution platforms
    // (either 'ios' or 'android').  On the back-end, we store high-resolution
    // platforms ('iPhone', 'iPod touch', 'iPad', 'android', etc.)  So on the
    // front-end, we're storing this high-resolution platform in
    // MobDeals.Habitat.device_type.  Please fix me, someone, anyone?
    MobDeals.Habitat.device_type = data.platform;

    if ($.inArray(data.platform, ['iPhone', 'iPhone Simulator', 'iPod touch', 'iPad']) !== -1) {
      MobDeals.Habitat.platform = 'ios';
      if (data.mac_address) {
        MobDeals.Habitat.udid = data.mac_address;
        MobDeals.Habitat.udid_type = 'mac_address';
      }
    }
    else if (data.platform == 'android') {
      MobDeals.Habitat.platform = 'android';
      if (data.android_id) {
        MobDeals.Habitat.udid = data.android_id;
        MobDeals.Habitat.udid_type = 'android_id';
      }
    }

    $.support.cors = true;
    $.ajax({
      url: MobDeals.host('core') + '/devices.json',
      type: 'POST',
      xhrFields: {withCredentials: true},
      data: {device: data},
      dataType: 'json',
      crossDomain: true
    });
  },
  
  isValidEmail: function(s) {
    var re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$/;
    return re.test(s);
  },
  
  isValidMobile: function(s) {
    var re = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})$/;
    return re.test(s);
  },
  
  formatMobileNumber: function(mobileNumber) {
    if (mobileNumber.length == 11) {
      mobileNumber = mobileNumber.substr(1);
    }
    if (mobileNumber.length == 10) {
      var areaCode = mobileNumber.substr(0, 3);
      var exchange = mobileNumber.substr(3, 3);
      var subscriberNumber = mobileNumber.substr(6);
      mobileNumber = '(' + areaCode + ') ' + exchange + '-' + subscriberNumber;
    }
    return mobileNumber;
  },
  
};
