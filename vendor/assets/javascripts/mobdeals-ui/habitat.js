// Manages the current (3rd-party) application context which we are operating
// within.

MobDeals.Habitat = {
  _apiKey: null,
  _appId: null,
  platform: null,
  device_type: null,
  udid: null,
  udid_type: null,
  _initialized: false,

  init: function() {
    if (this._initialized) {
      return false;
    } 
    else {
      var iOS = navigator.platform.match(/(iPad|iPhone|iPod|iPhone Simulator)/i) ? true : false;
      var android = navigator.userAgent.toLowerCase().match(/android/i) != null;
      alert(navigator.userAgent.toLowerCase());
      
      if (iOS) {
        MobDeals.Habitat.platform = 'ios';
        if (navigator.platform.match(/iPhone/i)) {
          MobDeals.Habitat.device_type = 'iPhone';
        }
        else if (navigator.platform.match(/iPad/i)) {
          MobDeals.Habitat.device_type = 'iPad';
        }
        else if (navigator.platform.match(/iPod/i)) {
          MobDeals.Habitat.device_type = 'iPod';
        }
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

  appId: function(val) {
    // backwards compatible with app with old apikey implementation
    if (val && val.charAt(val.length-1) == "=" && val.charAt(val.length-2) == "=") {
      MobDeals.Habitat.apiKey(val);
    }
    else if (val) {
      MobDeals.Habitat._appId = val;
    }
    return MobDeals.Habitat._appId;
  },

  apiKey: function(val) {
    if (val) {
      MobDeals.Habitat._apiKey = val;
    }
    return MobDeals.Habitat._apiKey;
  },

  report: function(iOSHeader, iOSStr, androidFunctionWrapper) {
    alert('entering report function');
    alert(MobDeals.Habitat.platform);
    if (MobDeals.Habitat.platform == 'android') {
      try {
        androidFunctionWrapper();
      } catch(e) {
        // Ignored.
      }
    }
    else if (MobDeals.Habitat.platform == 'ios') {
      var iframe = document.createElement("IFRAME");
      iframe.setAttribute("src", iOSHeader + ":" + iOSStr);
      document.documentElement.appendChild(iframe);
      iframe.parentNode.removeChild(iframe);
      iframe = null;
    }
  }
};
