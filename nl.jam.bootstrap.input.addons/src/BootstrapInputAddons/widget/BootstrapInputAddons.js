/*global logger*/
/*
    BootstrapInputAddons
    ========================

    @file      : BootstrapInputAddons.js
    @version   : 1.0.0
    @author    : Martijn Raats
    @date      : Mon, 25 Apr 2016 09:29:56 GMT
    @copyright : JAM-IT B.V.
    @license   : Apache V2

    Documentation
    ========================
    This widget gives the possibility to use bootstrap input add-ons on normal fields.
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/_base/event",

    "BootstrapInputAddons/lib/jquery-1.11.2",
    "dojo/text!BootstrapInputAddons/widget/template/BootstrapInputAddons.html"
], function (declare, _WidgetBase, _TemplatedMixin, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoHtml, dojoEvent, _jQuery, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("BootstrapInputAddons.widget.BootstrapInputAddons", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        inputNodes: null,
        inputNode: null,
        formGroupNode: null,

        // Parameters configured in the Modeler.
        showLabel: "",
        labelCaption: "",
        showLeftAddon: "",
        leftAddonCaption: "",
        showRightAddon: "",
        rightAddonCaption: "",
        isRequired: "",
        requiredMessage: "",
        mfToExecute: "",
        messageString: "",
        fieldAttribute: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _formValidateListener: null,
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _leftAddonSpan: null,
        _rightAddonSpan: null,
        _labelNode: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
            logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
            logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
            if (this._formValidateListener) {
                this.mxform.unlisten(this._formValidateListener);
            }
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");

            this.connect(this.inputNode, "change", function (e) {
                // Check for required
                if (this._isValid()) {
                    this._contextObj.set(this.fieldAttribute, this.inputNode.value);
                } else {
                    this._addValidation(this.requiredMessage);
                }
            });
        },

        // Rerender the interface.
        _updateRendering: function () {
            logger.debug(this.id + "._updateRendering");
            this.inputNode.disabled = this.readOnly;
            
            // Show label
            if (this.showLabel) {
                dojoConstruct.destroy(this._labelNode);
                this._labelNode = dojoConstruct.create("label", {
                    "class": "control-label",
                    "innerHTML": this.labelCaption
                });
                dojoConstruct.place(this._labelNode, this.formGroupNode, "first");
            }

            // Show left add-on
            if (this.showLeftAddon) {
                dojoConstruct.destroy(this._leftAddonSpan);
                this._leftAddonSpan = dojoConstruct.create("span", {
                    "class": "input-group-addon",
                    "innerHTML": this.leftAddonCaption
                });
                dojoConstruct.place(this._leftAddonSpan, this.inputNodes, "first");
            }
            
            // Show right add-on
            if (this.showRightAddon) {
                dojoConstruct.destroy(this._rightAddonSpan);
                this._rightAddonSpan = dojoConstruct.create("span", {
                    "class": "input-group-addon",
                    "innerHTML": this.rightAddonCaption
                });
                dojoConstruct.place(this._rightAddonSpan, this.inputNodes, "last");
            }

            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");

                var colorValue = this._contextObj.get(this.fieldAttribute);

                this.inputNode.value = colorValue;
            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.fieldAttribute);

            if (this.readOnly) {
                validation.removeAttribute(this.fieldAttribute);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.fieldAttribute);
            }
        },

        // Clear validations.
        _clearValidations: function () {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
            dojoClass.remove(this.formGroupNode, "has-error");
        },

        // Show an error message.
        _showError: function (message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.formGroupNode, "last");
            dojoClass.add(this.formGroupNode, "has-error");
        },

        // Check if validates
        _isValid: function () {
            logger.debug(this.id + "._isValid");
            return !(this.isRequired && (!this.inputNode.value || 0 === this.inputNode.value.trim().length));
        },

        // Add a validation.
        _addValidation: function (message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            if (this._formValidateListener) {
                this.mxform.unlisten(this._formValidateListener);
            }

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this._formValidateListener = this.mxform.listen("validate", dojoLang.hitch(this, function (callback, error) {
                    logger.debug(this.id + ".validate");
                    if (this._isValid()) {
                        callback();
                    }
                }));

                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.fieldAttribute,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [objectHandle, attrHandle, validationHandle];
            }
        }
    });
});

require(["BootstrapInputAddons/widget/BootstrapInputAddons"], function () {
    "use strict";
});