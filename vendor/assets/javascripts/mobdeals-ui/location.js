MobDeals.Location = {
  _initialized: false,
  location: null,
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
  },
  get: function(callback, forceRefresh) {
    if (this.location && !forceRefresh) { return this.location; }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          MobDeals.Location.location = [position.coords.latitude, position.coords.longitude];
          callback.apply(callback, [MobDeals.Location.location]);
        },
        function (error) { callback.apply(callback, [MobDeals.Location.location]); },
        { timeout: (5 * 1000), maximumAge: (1000 * 60 * 15), enableHighAccuracy: true }
      );
    }
    else { callback.apply(callback, [MobDeals.Location.location]); }
  }
};
