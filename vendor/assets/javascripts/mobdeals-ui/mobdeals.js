var CLICK = 'click';
var MobDeals = {
  _initialized: false,
  
  // send in classes you wish to init
  inits: function() {
    for (var i = 0; i < arguments.length; ++i) { arguments[i].init.apply(arguments[i]); }
  },
  
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
    
    var userAgent = navigator.userAgent.toLowerCase();
    var isiPhone = (userAgent.indexOf('iphone') != -1 || userAgent.indexOf('ipod') != -1) ? true : false;
    CLICK = isiPhone ? 'click' : 'click';
    $("#loading").ajaxStart(function(){ $(this).removeClass("hidden"); });
    $("#loading").ajaxStop(function(){ $(this).addClass("hidden"); });
  },
  
  // logging for analytics
  Log: {
    click: function(data) { data['type'] = 'click'; this._send(HOST+'/crumbs', data, 'json'); console.log('log.click', data); },
    error: function(data) { data['type'] = 'error'; this._send(HOST+'/crumbs', data, 'json'); console.log('log.error', data); },
    _send: function(data) {
      if (window.XMLHttpRequest) { xhr = new XMLHttpRequest(); }
      else { xhr = new ActiveXObject("Microsoft.XMLHTTP"); }
      xhr.open("POST",HOST+'/crumbs');
      xhr.send($.param(data));
    }
  },
  
  //General error popup
  error: function(msg, callback) {
    MobDeals.Popup.show('error', function(popup) {
      popup.html('<h4>Mob Deals</h4><p>'+msg+'</p><fieldset><button>Ok</button>');
      popup.find('button').bind(CLICK, function(ev) { 
        MobDeals.Popup.destroy(popup);
        if (callback) { callback(); }
      });
    });
    MobDeals.Log.error({message: msg});
  },

  redirect: function(url) {
    document.location.href = url;
    $('#redirecting').removeClass('hidden');
  }

};