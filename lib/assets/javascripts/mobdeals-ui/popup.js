MobDeals.Popup = {
  _count: 0,
  _initialized: false,
  _mask: null,
  init: function() {
    if (this._initialized) { return false; } else { this._initialized = true; }
    this._mask = $('#popup-mask');
    this._mask.bind(CLICK, function(ev) {
      MobDeals.Popup.destroy($('div.popup'));
    });
  },
  show: function(classname, contentFunction) {
    var popup = $('<div id="popup_'+(++MobDeals.Popup._count)+'" class="popup '+classname+' hidden"></div>');
    $('#main').append(popup);
    contentFunction(popup);
    this.center(popup);
    popup.removeClass('hidden');
    this._mask.removeClass('hidden');
  },
  //Moves popup in relation to where the user has scrolled
  center: function(popup) {
    var win = $(window);
    popup.css({
      left: win.scrollLeft()+(win.width()-popup.width())/2 + 'px',
      top: win.scrollTop()+(win.height()-popup.height())/2 + 'px'
    });
  },
  destroy: function(popups) {
    popups.remove();
    this._mask.addClass('hidden');
  }
};
