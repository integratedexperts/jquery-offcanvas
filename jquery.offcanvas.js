/**
 * @file
 * jQuery Plugin for Off-canvas panels.
 * Author: Alex Skrypnyk <alex.designworks@gmail.com>
 */
;
(function ($, window, document, undefined) {
  var pluginName = "offCanvas",
    defaults = {
      panels: [],
      prefix: 'js-offcanvas-',
      swipe: true,
      hideEmpty: true
    };

  // The actual plugin constructor.
  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  }

  $.extend(Plugin.prototype, {
    init: function () {
      var _this = this;
      // Init main container.
      this.$element.addClass(this.mainClass());
      // Init panels.
      for (var panel in this.settings.panels) {
        $(this.settings.panels[panel][0]).addClass(this.panelClass(panel));
      }

      // Bind to 'mousemove' event.
      var prevX = 0;
      var prevY = 0;
      $('html').on('mousemove', function (e) {
        var currentData = {
          event: 'mousemove',
          currentX: e.pageX,
          currentY: e.pageY,
          velocityX: e.pageX - prevX,
          velocityY: e.pageY - prevY
        };

        if (!_this.isOpened('any')) {
          _this.processTriggers(currentData);
        }

        prevX = e.pageX;
        prevY = e.pageY;
      });

      if (this.settings.swipe && typeof jQuery.event.special.swipe != 'undefined') {
        $('html').on('swiperight swipeleft swipeup swipedown', function (e) {

          var currentData = {
            event: e.type
          };

          if (!_this.isOpened('any')) {
            _this.processTriggers(currentData);
          }
        });
      }

      return this;
    },
    mainClass: function () {
      return this.settings.prefix + 'main';
    },
    mainPanelClass: function (panel) {
      return this.mainClass() + '-' + panel;
    },
    panelClass: function (panel) {
      return this.settings.prefix + panel;
    },
    panelOpenedClass: function (panel) {
      return this.settings.prefix + 'opened-' + panel;
    },
    panelExists: function (panel) {
      return $('.' + this.panelClass(panel)).length > 0;
    },
    overlayClass: function () {
      return this.settings.prefix + 'overlay';
    },
    noscrollClass: function () {
      return this.settings.prefix + 'noscroll';
    },
    open: function (panel) {
      if (!this.panelExists(panel) || this.isOpened(panel)) {
        return;
      }

      if (this.hasNoContent(panel)) {
        return;
      }

      // Remove panel classes from main container to reset state.
      this.$element.removeClassRegex(new RegExp('^' + this.mainPanelClass('')));
      this.$element.addClass(this.mainPanelClass(panel));
      $('.' + this.panelClass(panel)).addClass(this.panelOpenedClass(panel));
      this.showOverlay();

      $(document).trigger('offcanvas.open' + panel.toLowerCase());

      return this;
    },
    close: function (panel) {
      panel = panel == 'all' ? '' : panel;
      this.$element.removeClassRegex(new RegExp('^' + this.mainPanelClass(panel)));
      $('*[class*="' + this.panelClass('') + '"]').removeClassRegex(new RegExp('^' + this.panelOpenedClass(panel)));
      this.hideOverlay();

      return this;
    },
    toggle: function (panel) {
      if (this.isOpened(panel)) {
        this.close(panel);
      }
      else {
        this.open(panel);
      }

      return this;
    },
    isOpened: function (panel) {
      if (panel == 'any') {
        return this.$element.filter('[class*="' + this.mainPanelClass('') + '"]').length > 0;
      }

      return this.$element.hasClass(this.mainPanelClass(panel));
    },
    hasNoContent: function (panel) {
      var isEmpty = false;
      if (!this.settings.hideEmpty) {
        return isEmpty;
      }
      // Panel's children considered to have no content if they are empty or
      // hidden.
      $('.' + this.panelClass(panel)).children(':not(.' + this.settings.prefix + 'content-ignore' + ')').each(function () {
        if (!$(this).is(':empty') && !$(this).is(':hidden')) {
          isEmpty = false;
          return false;
        }
        isEmpty = true;
      });

      return isEmpty;
    },
    showOverlay: function () {
      var _this = this;
      if (this.$element.find('.' + this.overlayClass()).length == 0) {
        $('<div/>')
          .addClass(this.overlayClass())
          .on('click', function () {
            _this.close('all');
          })
          .prependTo(this.$element);
      }
      $('body').addClass(this.noscrollClass());

      return this;
    },
    hideOverlay: function () {
      this.$element.find(this.overlayClass()).remove();
      $('body').removeClass(this.noscrollClass());

      return this;
    },
    processTriggers: function (currentData) {
      for (var panel in this.settings.panels) {
        if (this.panelExists(panel)) {
          var triggers = this.settings.panels[panel].slice(1);
          for (var i in triggers) {
            if ($.isFunction(triggers[i])) {
              var triggerData = triggers[i].call(this);
              // Trigger is activated by mousemove event.
              if (currentData.event == triggerData.event) {
                var matched = currentData.event == 'mousemove' ? this.matchZone(panel, currentData, triggerData) : true;
                if (matched) {
                  this.open(panel);
                  return;
                }
              }
            }
          }
        }
      }
    },
    matchZone: function (panel, currentData, triggerData) {
      // Validate params.
      if (!$.isPlainObject(triggerData)) {
        return false;
      }

      var matched = processed = 0;
      // Match horizontally.
      if ('startX' in triggerData) {
        if (currentData.currentX > triggerData.startX && currentData.currentX < triggerData.finishX && currentData.velocityX > triggerData.velocityX) {
          matched++;
        }
        processed++;
      }

      // Match vertically.
      if ('startY' in triggerData) {
        if (currentData.currentY > triggerData.startY && currentData.currentY < triggerData.finishY && currentData.velocityY > triggerData.velocityY) {
          matched++;
        }
        processed++;
      }

      return matched == processed;
    }
  });

  $.fn[pluginName] = function (options) {
    this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });

    return this;
  };

  // Helper to remove classes that match regex.
  $.fn.removeClassRegex = function (regex) {
    return $(this).removeClass(function (index, classes) {
      return classes.split(/\s+/).filter(function (c) {
        return regex.test(c);
      }).join(' ');
    });
  };
}(jQuery, window, document));


