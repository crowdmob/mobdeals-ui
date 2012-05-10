// Manages the current (3rd-party) application context which we are operating
// within.

MobDeals.Habitat = {
  _apiKey: null,
  _platform: null,
  _initialized: false,
  _iOS: navigator.platform.match(/(iPad|iPhone|iPod)/i) ? true : false,
  _android: navigator.userAgent.toLowerCase().match(/android/i) != null,
  app: null,

  init: function() {
    if (this._initialized) {
      return false;
    } else {
      this._initialized = true;
    }
  },

  apiKey: function(val) {
    if (val) {
      MobDeals.Habitat._apiKey = val;
    }
    return MobDeals.Habitat._apiKey;
  },

  report: function(iOSHeader, iOSStr, androidFunction, androidParamter) {
      
    if (MobDeals.Habitat._android) {
      try {
        if (androidParameter == null) {
          androidFunction();
        }
        else {
          androidFunction(androidParamter);
        }
      }
      catch(ignored) {}
    }
    else if (MobDeals.Habitat._iOS) {
      var iframe = document.createElement("IFRAME");
      iframe.setAttribute("src", iOSHeader + ":" + iOSStr);
      document.documentElement.appendChild(iframe);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  }
};
