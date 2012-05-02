// Manages the current (3rd-party) application context which we are operating
// within.

MobDeals.Habitat = {
  _apiKey: null,
  _platform: null,
  _initialized: false,
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

  report: function(header, str) {
    var iOS = navigator.platform.match(/(iPad|iPhone|iPod)/i) ? true : false;
    var android = navigator.userAgent.toLowerCase().match(/android/i) != null;

    if (android) {
      switch (header) {
        case "mobdeals-html5":
          try {
            window.mobdeals_native.purchaseConfirmed(str);
          } catch(ignored) {
          }
          break;
        case "flurry-apps":
          var flurryApps = window.loot_native.getFlurryApps();
          flurryApps = $.parseJSON(flurryApps);
          MobDeals.Loot.Installs.Fetch.showFlurryApps(flurryApps);
          break;
      }
    } else if (iOS) {
      var iframe = document.createElement("iframe");
      iframe.setAttribute("src", header + ":" + str);
      document.documentElement.appendChild(iframe);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  }
};
