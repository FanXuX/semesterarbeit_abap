sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], function (Controller, History) {
    "use strict";
    return Controller.extend("de.nak.productlist.controller.Detail", {

        onInit: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("detail").attachPatternMatched(this._onObjectMatched,
                this);
        },
        _onObjectMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var oView = this.getView();
            var oContext = oView.getModel("product").createBindingContext("/" +
                oArgs.path);
            oView.setBindingContext(oContext, "product");
        },

        onNavButtonPress: function () {
            //check if there is ui5 history
            var history = History.getInstance();
            var previousHash = history.getPreviousHash();

            //if ui5 recorded previous pages, simply go back in history
            if (previousHash !== undefined) {
                window.history.go(-1);
            } else {
                //if there is no ui5 history
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("list", {}, true);
            }
        }
    })
});
