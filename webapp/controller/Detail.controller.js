sap.ui.define([
    "de/nak/productlist/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (BaseController, JSONModel, History) {
    "use strict";
    return BaseController.extend("de.nak.productlist.controller.Detail", {

        /**
         * Initialize DetailView with delay function
         */
        onInit: function () {

            var iOriginalBusyDelay,
                oViewModel = new JSONModel({
                    busy : true,
                    delay : 0
                });

            this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched,
                this);

            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
            this.setModel(oViewModel, "detailView");
            this.getOwnerComponent().getModel("product").metadataLoaded().then(function () {
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                }
            );
        },

        /**
         * finds id from url path and binds it to model
         * @param oEvent
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sPath =  oEvent.getParameter("arguments").path;
            this.getModel("product").metadataLoaded().then( function() {
                var sKey = this.getModel("product").createKey("ProduktSet", {
                    Matnr :  sPath
                });
                this._bindView("product>/" + sKey);
            }.bind(this));
        },

        /**
         * handles displaying loading view while data being loaded
         *
         * @param sObjectPath
         * @private path in model
         */
        _bindView : function (sObjectPath) {
            var oViewModel = this.getModel("detailView"),
                oDataModel = this.getModel("product");

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oDataModel.metadataLoaded().then(function () {
                            // show loading
                            oViewModel.setProperty("/busy", true);
                        });
                    },
                    dataReceived: function () {
                        // loading finished
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        /**
         * handle data change
         * @private
         */
        _onBindingChange : function () {
            var oView = this.getView(),
                oViewModel = this.getModel("detailView"),
                oElementBinding = oView.getElementBinding("product");

            // No data found
            if (!oElementBinding.getBoundContext()) {
                // TODO handle missing data
                // this.getRouter().getTargets().display("notFound");
                console.log("no data!");
                return;
            }

            // data found
            oViewModel.setProperty("/busy", false);
        },

        /**
         * navigate back to list view
         */
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
