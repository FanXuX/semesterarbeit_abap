sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Sorter'
], function (Controller, Sorter) {
    "use strict";
    return Controller.extend("de.nak.productlist.controller.List", {

        _oDialog: null,

        onInit: function () {

            this.mGroupFunctions = {
                Maktx: function(oContext) {
                    var name = oContext.getProperty("Maktx");
                    return {
                        key: name,
                        text: name
                    };
                },
                Stprs: function(oContext) {
                    var price = oContext.getProperty("Stprs");
                    var currencyCode = oContext.getProperty("Waers");
                    var key, text;
                    if (price <= 100) {
                        key = "LE100";
                        text = "100 " + currencyCode + " or less";
                    } else if (price <= 1000) {
                        key = "BT100-1000";
                        text = "Between 100 and 1000 " + currencyCode;
                    } else {
                        key = "GT1000";
                        text = "More than 1000 " + currencyCode;
                    }
                    return {
                        key: key,
                        text: text
                    };
                }
            };
        },

        onExit : function () {
            if (this._oDialog) {
                this._oDialog.destroy();
            }
        },

        onItemPress : function(oEvent){
            var oItem = oEvent.getSource();
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("detail", {
                path : oItem.getBindingContext("product").getPath().substr(1)
            });
        },

        handleSortDialogButtonPressed: function (oEvent) {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment("de.nak.productlist.fragment.SortDialog", this);
            }
            // toggle compact style
            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
            this._oDialog.open();
        },

        handleConfirm: function(oEvent) {

            var oView = this.getView();
            var oTable = oView.byId("idProductsTable");

            var mParams = oEvent.getParameters();
            var oBinding = oTable.getBinding("items");

            // apply sorter to binding
            // (grouping comes before sorting)
            var sPath;
            var bDescending;
            var vGroup;
            var aSorters = [];
            if (mParams.groupItem) {
                sPath = mParams.groupItem.getKey();
                bDescending = mParams.groupDescending;
                vGroup = this.mGroupFunctions[sPath];
                aSorters.push(new Sorter(sPath, bDescending, vGroup));
            }
            sPath = mParams.sortItem.getKey();
            bDescending = mParams.sortDescending;
            aSorters.push(new Sorter(sPath, bDescending));
            oBinding.sort(aSorters);

        }


    })
});
