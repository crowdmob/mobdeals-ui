
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
  platform: function(val) {
    if (val) { MobDeals.Habitat._platform = val; }
    return MobDeals.Habitat._platform;
  },
  report: function(str) {
    if (this.platform() == 'android') {
      try { window.mobdeals_native.purchaseConfirmed(str); }
      catch(ignored) {}
    }
    else if (this.platform() == 'ios') {
      var iframe = document.createElement("IFRAME");
      iframe.setAttribute("src", "mobdeals-html5:"+str);
      document.documentElement.appendChild(iframe);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  }
};