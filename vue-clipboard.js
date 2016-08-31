// Copied from https://github.com/xiaokaike/vue-clipboard/blob/master/vue-clipboard.js
;(function() {
  var vueClipboard = {}

  vueClipboard.install = function(Vue) {
    Vue.directive('clipboard', {
      params: ['success', 'error'],
      acceptStatement: true,
      bind: function() {
        //bind callback

        this.arg = this.arg === 'cut' ? 'cut' : 'copy'
        Vue.util.on(this.el, 'click', this.handler.bind(this))
      },

      update: function(data) {
        this.text = data
      },

      unbind: function() {
        Vue.util.off(this.el, 'click', this.handler)
        this.removeFake()
      },

      handler: function() {
        this.selectFake(this.text)
        if (this.arg === 'cut') {
          this.vm[this.expression] = ''
        }
      },

      /**
       * Creates a fake textarea element, sets its value from `text` property,
       * and makes a selection on it.
       */

      selectFake: function(text) {
        var isRTL = document.documentElement.getAttribute('dir') == 'rtl'

        this.removeFake()

        this.fakeHandler = document.body.addEventListener('click', this.removeFake.bind(this))

        this.fakeElem = document.createElement('textarea')
        // Prevent zooming on iOS
        this.fakeElem.style.fontSize = '12pt'
        // Reset box model
        this.fakeElem.style.border = '0'
        this.fakeElem.style.padding = '0'
        this.fakeElem.style.margin = '0'
        // Move element out of screen horizontally
        this.fakeElem.style.position = 'fixed'
        this.fakeElem.style[isRTL ? 'right' : 'left'] = '-9999px'
        // Move element to the same position vertically
        this.fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px'
        this.fakeElem.setAttribute('readonly', '')
        this.fakeElem.value = text

        document.body.appendChild(this.fakeElem)

        this.selectedText = select(this.fakeElem)

        this.copyText()
      },

      /**
       * Only removes the fake element after another click event, that way
       * a user can hit `Ctrl+C` to copy because selection still exists.
       */
      removeFake: function() {
        if (this.fakeHandler) {
          document.body.removeEventListener('click')
          this.fakeHandler = null
        }

        if (this.fakeElem) {
          document.body.removeChild(this.fakeElem)
          this.fakeElem = null
        }
      },

      /**
       * Executes the copy operation based on the current selection.
       */
      copyText: function() {
        var succeeded
        try {
          succeeded = document.execCommand('copy')
        } catch (err) {
          succeeded = false
        }
        this.handleResult(succeeded)
      },
      handleResult: function(succeeded) {
        if (succeeded) {
          this.params.success && this.params.success()
        } else {
          this.params.error && this.params.error()
        }
      }
    })
  }

  function select(element) {
    var selectedText

    if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
      element.focus()
      element.setSelectionRange(0, element.value.length)

      selectedText = element.value
    } else {
      if (element.hasAttribute('contenteditable')) {
        element.focus()
      }

      var selection = window.getSelection()
      var range = document.createRange()

      range.selectNodeContents(element)
      selection.removeAllRanges()
      selection.addRange(range)

      selectedText = selection.toString()
    }

    return selectedText
  }

  if (typeof exports == "object") {
    module.exports = vueClipboard
  } else if (typeof define == "function" && define.amd) {
    define([], function() {
      return vueClipboard
    })
  } else if (window.Vue) {
    window.vueClipboard = vueClipboard
    Vue.use(vueClipboard)
  }

})()
