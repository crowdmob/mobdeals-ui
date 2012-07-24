var CLICK = 'click';
var MobDeals = {
  _initialized: false,
  _topology: {},
  _protocol: 'https',

  // Send in classes you wish to init:
  inits: function() {
    for (var i = 0; i < arguments.length; ++i) { arguments[i].init.apply(arguments[i]); }
  },

  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }

    var userAgent = navigator.userAgent.toLowerCase();
    var isiPhone = (userAgent.indexOf('iphone') != -1 || userAgent.indexOf('ipod') != -1) ? true : false;

    // Um...  What's the point of this?  For iPhone, shouldn't this event be tap instead of click?  - Raj
    CLICK = isiPhone ? 'click' : 'click';

    $("#loading").ajaxStart(function(){ $(this).removeClass("hidden"); });
    $("#loading").ajaxStop(function(){ $(this).addClass("hidden"); });
  },

  // General error popup:
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

  host: function(app) {
    var url = this._protocol + '://' + this._topology[app];
    if (url.indexOf('deals.crowdmob.com') != -1) {
      url.replace('http://', 'https://');
    }
    return url;
  },

  redirect: function(url) {
    document.location.href = url;
    $('#redirecting').removeClass('hidden');
  },

  topology: function(protocol, topologyHash) {
    this._topology = topologyHash;
    this._protocol = protocol;
  },

  // Logging for analytics:
  Log: {
    click: function(data) { this._send('click', data); console.log('log.click', data); },
    error: function(data) { this._send('error', data); console.log('log.error', data); },
    _send: function(dataType, payload) {
      var postable = $.param({data: payload});
      if (window.XMLHttpRequest) { xhr = new XMLHttpRequest(); }
      else { xhr = new ActiveXObject("Microsoft.XMLHTTP"); }
      xhr.open("POST",MobDeals.host('crumbs')+'/'+dataType+'s.json');
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      xhr.send(postable);
    }
  }
};
