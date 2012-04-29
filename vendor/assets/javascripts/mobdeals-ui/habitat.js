
// Manages the current (3rd-party) application context which we are operating within
MobDeals.Habitat = {
  _apiKey: null,
  _platform: null,
  _initialized: false,
  app: null,
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
  },
  apiKey: function(val) {
    if (val) { MobDeals.Habitat._apiKey = val; }
    return MobDeals.Habitat._apiKey;
  },
  report: function(header, str) {
    var iOS = navigator.platform.match(/(iPad|iPhone|iPod)/i) ? true : false;
    var android = navigator.userAgent.toLowerCase().match(/android/i) ? true : false;
      
    if (android) {
      try { window.mobdeals_native.purchaseConfirmed(str); }
      catch(ignored) {}
    }
    else if (iOS) {
      var iframe = document.createElement("IFRAME");
      iframe.setAttribute("src", header+":"+str);
      document.documentElement.appendChild(iframe);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  }
};
