sap.ui.define([
    "de/nak/productlist/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (BaseController, JSONModel, History) {
    "use strict";
    return BaseController.extend("de.nak.productlist.controller.Detail", {

        /**
         * initialize detail view with delay function
         */
        onInit: function () {

            var iOriginalBusyDelay,
                oViewModel = new JSONModel({
                    busy : true,
                    delay : 0
                });

            const editModeModel = new JSONModel({
                editing: false,
                productId: null,
                data: {}
            });

            this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched,
                this);

            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
            this.setModel(oViewModel, "detailView");
            this.setModel(editModeModel, "editModeView");
            this.getOwnerComponent().getModel("product").metadataLoaded().then(function () {
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                    this.getModel("product").setUseBatch(true)
                }.bind(this)
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

                // bind edit mode
                this.getModel("editModeView").setProperty("/productId", sPath);
            }.bind(this));
        },

        /**
         * handles displaying loading view while data being loaded
         *
         * @param sObjectPath
         * @private path in model
         */
        _bindView : function (sObjectPath) {
            const oDataModel = this.getModel("product");

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oDataModel.metadataLoaded().then(function () {
                            // show loading
                            this._setBusy(true)
                        }.bind(this));
                    }.bind(this),
                    dataReceived: function () {
                        // loading finished
                        this._setBusy(false)
                    }.bind(this)
                }
            });
        },

        /**
         * handle data change
         * @private
         */
        _onBindingChange : function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding("product");

            // No data found
            if (!oElementBinding.getBoundContext()) {
                // TODO handle missing data
                // this.getRouter().getTargets().display("notFound");
                console.log("no data!");
                return;
            }

            // data found
            this._setBusy(false)
        },

        /**
         * navigate back to list view
         */
        onNavButtonPress: function () {
            //check if there is ui5 history
            var history = History.getInstance();
            var previousHash = history.getPreviousHash();

            if (previousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("list", {}, true);
            }
        },

        _setBusy: function(isBusy) {
            const model = this.getModel("detailView");

            model.setProperty("/busy", isBusy);
        },

        _getBusy: function() {
            const model = this.getModel("detailView");

            return model.getProperty("/busy");
        },

        _setEditMode: function(isEdit) {
            const editModeModel = this.getModel("editModeView");

            editModeModel.setProperty("/editing", isEdit);
        },

        _getEditMode: function() {
            const editModeModel = this.getModel("editModeView");

            return editModeModel.getProperty("/editing");
        },

        onEdit: function () {
            if (this._getEditMode()) {
                this.onAbort();
            } else {
                this._setEditMode(true)
            }

        },

        onInputChange: function(event) {
            const re = /^.+edit_([a-zA-Z]{5})$/;

            const elementId = event.getParameters().id;
            const value = event.getParameters().value;

            const match = re.exec(elementId);
            if (!match) {
                return;
            }
            const prop = match[1];

            const editModel = this.getModel("editModeView");
            const data = editModel.getProperty("/data");

            data[prop] = value;

            editModel.setProperty("/data", data);
        },

        onSave: function() {
            const fnSuccess = function (oData, res) {
                // this._setBusy(false);
                // MessageToast.show(this._getText("changesSentMessage"));
                this._setEditMode(false);
            }.bind(this);

            const fnError = function (oError) {
                // this._setBusy(false);
                this._setEditMode(false);
                // MessageBox.error(oError.message);
            }.bind(this);

            const editModel = this.getModel("editModeView");

            const productId = editModel.getProperty("/productId");
            const changedData = editModel.getProperty("/data");

            this.getModel("product").update("/ProduktSet('" + productId + "')", changedData, {
                success: fnSuccess,
                error: fnError
            });

        },

        onAbort: function() {
            const editModel = this.getModel("editModeView");
            this.getModel("product").resetChanges();

            const changedData = editModel.setProperty("/data", {});
            this._setEditMode(false);
        },
    })
});
