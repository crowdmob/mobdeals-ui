MobDeals.Account.Wallet.Methods = {
  _initialized: false,
  
  init: function() {
    if (this._initialized) { return false; }
    else { this._initialized = true; }
  }
};
