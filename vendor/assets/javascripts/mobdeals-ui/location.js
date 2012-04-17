MobDeals.Location = {
  _initialized: false,
  location: null,
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
  },
  get: function(callback, forceRefresh) {
    if (this.location && !forceRefresh) { 
      console.log("HAS A LOCATION");
      return this.location; }
    if (navigator.geolocation) {
      console.log("GEOLOCATING");
      navigator.geolocation.getCurrentPosition(
        function(position) {
          console.log("GETTING CURRENT LOCATION 1");
          MobDeals.Location.location = [position.coords.latitude, position.coords.longitude];
          callback.apply(callback, [MobDeals.Location.location]);
        },
        function (error) { console.log("ERROR!"); callback.apply(callback, [MobDeals.Location.location]); },
        { timeout: (5 * 1000), maximumAge: (1000 * 60 * 15), enableHighAccuracy: true }
      );
    }
    else { callback.apply(callback, [MobDeals.Location.location]); }
  }
};
