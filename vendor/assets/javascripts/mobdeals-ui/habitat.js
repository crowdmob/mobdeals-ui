// Manages the current (3rd-party) application context which we are operating
// within.

MobDeals.Habitat = {
  _apiKey: null,
  platform: null,
  _initialized: false,
  app: null,

  init: function() {
    if (this._initialized) {
      return false;
    } else {
      var iOS = navigator.platform.match(/(iPad|iPhone|iPod)/i) ? true : false;
      var android = navigator.userAgent.toLowerCase().match(/android/i) != null;
      
      if (iOS) {
        MobDeals.Habitat.platform = 'ios';
      }
      else if (android) {
        MobDeals.Habitat.platform = 'android';
      }
      else {
        MobDeals.Habitat.platform = 'html5';
      }
      
      this._initialized = true;
    }
  },

  apiKey: function(val) {
    if (val) {
      MobDeals.Habitat._apiKey = val;
    }
    return MobDeals.Habitat._apiKey;
  },

  report: function(iOSHeader, iOSStr, androidFunctionWrapper) {
    if (MobDeals.Habitat.platform == 'android') {
      androidFunctionWrapper();
    } else if (MobDeals.Habitat.platform == 'ios') {
      var iframe = document.createElement("IFRAME");
      iframe.setAttribute("src", iOSHeader + ":" + iOSStr);
      document.documentElement.appendChild(iframe);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  }
};
