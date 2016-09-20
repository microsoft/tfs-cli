"use strict";
var composer_1 = require("./targets/Microsoft.VisualStudio.Services/composer");
var composer_2 = require("./targets/Microsoft.VisualStudio.Services.Integration/composer");
var composer_3 = require("./targets/Microsoft.VisualStudio.Offer/composer");
var trace = require("../../../lib/trace");
var ComposerFactory = (function () {
    function ComposerFactory() {
    }
    ComposerFactory.GetComposer = function (settings, targets) {
        var composers = [];
        // @TODO: Targets should be declared by the composer
        targets.forEach(function (target) {
            switch (target.id) {
                case "Microsoft.VisualStudio.Services":
                case "Microsoft.VisualStudio.Services.Cloud":
                    composers.push(new composer_1.VSSExtensionComposer(settings));
                    break;
                case "Microsoft.VisualStudio.Services.Integration":
                    composers.push(new composer_2.VSSIntegrationComposer(settings));
                    break;
                case "Microsoft.VisualStudio.Offer":
                    composers.push(new composer_3.VSOfferComposer(settings));
                    break;
                default:
                    trace.warn("'" + target.id + "' is not a recognized target. Defualting to Microsoft.VisualStudio.Services.");
                    break;
            }
        });
        if (composers.length === 0) {
            if (targets.length === 0) {
                throw "No recognized targets found. Ensure that your manifest includes a target property. E.g. \"targets\":[{\"id\":\"Microsoft.VisualStudio.Services\"}],...";
            }
            else {
                composers.push(new composer_1.VSSExtensionComposer(settings));
            }
        }
        // Build a new type of composer on the fly that is the
        // concatenation of all of the composers necessary for 
        // this extension.
        var PolyComposer = (function () {
            function PolyComposer(settings) {
                this.settings = settings;
            }
            PolyComposer.prototype.getBuilders = function () {
                return composers.reduce(function (p, c) {
                    return p.concat(c.getBuilders());
                }, []);
            };
            PolyComposer.prototype.validate = function (components) {
                return Promise.all(composers.reduce(function (p, c) {
                    return p.concat(c.validate(components));
                }, [])).then(function (multi) {
                    // flatten
                    return multi.reduce(function (p, c) { return p.concat(c); }, []);
                });
            };
            return PolyComposer;
        })();
        return new PolyComposer(settings);
    };
    return ComposerFactory;
}());
exports.ComposerFactory = ComposerFactory;
