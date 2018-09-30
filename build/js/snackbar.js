"use strict";var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};!function(t,n){"function"==typeof define&&define.amd?define([],function(){return t.Snackbar=n()}):"object"===("undefined"==typeof module?"undefined":_typeof(module))&&module.exports?module.exports=t.Snackbar=n():t.Snackbar=n()}(void 0,function(){var r={current:null},a={text:"Default Text",textColor:"#FFFFFF",width:"auto",showAction:!0,actionText:"Dismiss",actionTextColor:"#4CAF50",showSecondButton:!1,secondButtonText:"",secondButtonTextColor:"#4CAF50",backgroundColor:"#323232",pos:"bottom-left",duration:5e3,customClass:"",onActionClick:function(t){t.style.opacity=0},onSecondButtonClick:function(t){},onClose:function(t){}};r.show=function(t){var o=i(!0,a,t);r.current&&(r.current.style.opacity=0,setTimeout(function(){var t=this.parentElement;t&&t.removeChild(this)}.bind(r.current),500)),r.snackbar=document.createElement("div"),r.snackbar.className="snackbar-container "+o.customClass,r.snackbar.style.width=o.width;var n=document.createElement("p");if(n.style.margin=0,n.style.padding=0,n.style.color=o.textColor,n.style.fontSize="14px",n.style.fontWeight=300,n.style.lineHeight="1em",n.innerHTML=o.text,r.snackbar.appendChild(n),r.snackbar.style.background=o.backgroundColor,o.showSecondButton){var e=document.createElement("button");e.className="action",e.innerHTML=o.secondButtonText,e.style.color=o.secondButtonTextColor,e.addEventListener("click",function(){o.onSecondButtonClick(r.snackbar)}),r.snackbar.appendChild(e)}if(o.showAction){var c=document.createElement("button");c.className="action",c.innerHTML=o.actionText,c.style.color=o.actionTextColor,c.addEventListener("click",function(){o.onActionClick(r.snackbar)}),r.snackbar.appendChild(c)}o.duration&&setTimeout(function(){r.current===this&&(r.current.style.opacity=0,r.current.style.top="-100px",r.current.style.bottom="-100px")}.bind(r.snackbar),o.duration),r.snackbar.addEventListener("transitionend",function(t,n){"opacity"===t.propertyName&&"0"===this.style.opacity&&("function"==typeof o.onClose&&o.onClose(this),this.parentElement.removeChild(this),r.current===this&&(r.current=null))}.bind(r.snackbar)),r.current=r.snackbar,document.body.appendChild(r.snackbar);getComputedStyle(r.snackbar).bottom,getComputedStyle(r.snackbar).top;r.snackbar.style.opacity=1,r.snackbar.className="snackbar-container "+o.customClass+" snackbar-pos "+o.pos},r.close=function(){r.current&&(r.current.style.opacity=0)};var i=function o(){var e={},c=!1,t=0,n=arguments.length;"[object Boolean]"===Object.prototype.toString.call(arguments[0])&&(c=arguments[0],t++);for(var r=function(t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(c&&"[object Object]"===Object.prototype.toString.call(t[n])?e[n]=o(!0,e[n],t[n]):e[n]=t[n])};t<n;t++){r(arguments[t])}return e};return r});