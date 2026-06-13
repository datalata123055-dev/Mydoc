(function () {
  "use strict";

  if (typeof NodeList !== "undefined" && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  if (typeof Element !== "undefined" && !Element.prototype.remove) {
    Element.prototype.remove = function () {
      if (this.parentNode) this.parentNode.removeChild(this);
    };
  }

  if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
      return this.indexOf(search, start || 0) !== -1;
    };
  }

  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (search, position) {
      position = position || 0;
      return this.substr(position, search.length) === search;
    };
  }

  if (!String.prototype.repeat) {
    String.prototype.repeat = function (count) {
      count = Math.floor(count || 0);
      if (count < 0 || count === Infinity) throw new RangeError("Invalid count value");
      var result = "";
      var value = String(this);
      while (count) {
        if (count & 1) result += value;
        count >>= 1;
        if (count) value += value;
      }
      return result;
    };
  }

  if (!String.prototype.padStart) {
    String.prototype.padStart = function (targetLength, padString) {
      targetLength = targetLength >> 0;
      padString = String(padString === undefined ? " " : padString);
      if (this.length >= targetLength) return String(this);
      targetLength -= this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(Math.ceil(targetLength / padString.length));
      }
      return padString.slice(0, targetLength) + String(this);
    };
  }

  if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement, fromIndex) {
      return this.indexOf(searchElement, fromIndex || 0) !== -1;
    };
  }
})();
