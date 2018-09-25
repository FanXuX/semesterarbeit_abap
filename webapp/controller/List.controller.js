/* global _:true */
sap.ui.define([
    "de/nak/productlist/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/ui/model/Filter',
    'sap/ui/model/Sorter',
    "de/nak/productlist/libs/lodash.min"
], function (BaseController, JSONModel, Filter, Sorter, lodash) {
    "use strict";
    return BaseController.extend("de.nak.productlist.controller.List", {

        _oDialog: null,

        onInit: function () {

            /**
             * find a view component by its id
             * @type {sap.ui.core.Element}
             */
            const fnGetById = function(sId) {
                return this.getView().byId(sId);
            }.bind(this);

            /**
             * retrieve data and filter op from given edit
             * @param oEdit
             * @return {object}
             */
            const fnExtractTextFilterValue = function(oEdit) {
                return {
                    value() {
                        return oEdit.getValue();
                    },
                    op() {
                        return sap.ui.model.FilterOperator.Contains;
                    }
                };
            };

            /**
             * retrieve data and filter op from given edit
             * @param oEdit
             * @return {object}
             */
            const fnExtractComboFilterValue = function(oEdit) {
                return {
                    value() {
                        return oEdit.getSelectedKey();
                    },
                    op() {
                        return sap.ui.model.FilterOperator.Contains;
                    }
                };
            };

            /**
             * retrieve data and filter op from given combo
             * @param oCombo
             * @return {object}
             */
            const fnExtractPriceFilterValue = function(oCombo) {
                return {
                    value() {
                        switch (oCombo.getSelectedKey()) {
                            case "001":
                                return [0, 50];
                            case "002":
                                return [50, 100];
                            case "003":
                                return [100, 500];
                            case "004":
                                return [500, 99999999999];
                            default:
                                return [];
                        }
                    },
                    op() {
                        return sap.ui.model.FilterOperator.BT;
                    }
                };
            };

            this.oProductId = fnGetById('eProductId');
            this.oProductName = fnGetById('eProductName');
            this.oProductCategory = fnGetById('eProductCategory');
            this.oStdPrice = fnGetById('slStdPrice');
            this.oTable = fnGetById('idProductsTable');

            this.mFilterItems = {
                'Matnr': fnExtractTextFilterValue(this.oProductId),
                'Maktx': fnExtractTextFilterValue(this.oProductName),
                'Matkl': fnExtractComboFilterValue(this.oProductCategory),
                'Stprs': fnExtractPriceFilterValue(this.oStdPrice)
            };

            // prepare functions for grouping
            this.mGroupFunctions = {
                Matkl: function(oContext) {
                    const sName = oContext.getProperty("Matkl");
                    return {
                        key: sName,
                        text: sName
                    };
                },
                Stprs: function(oContext) {
                    const sPrice = oContext.getProperty("Stprs");
                    const sCurrencyCode = oContext.getProperty("Waers");
                    let sKey, sText;
                    if (sPrice <= 100) {
                        sKey = "LE100";
                        sText = "{i18n>stdPrice} <= 100";
                    } else if (sPrice <= 1000) {
                        sKey = "BT100-1000";
                        sText = "100 < {i18n>stdPrice} <= 1000";
                    } else {
                        sKey = "GT1000";
                        sText = "{i18n>stdPrice} > 1000";
                    }
                    return {
                        key: sKey,
                        text: sText
                    };
                }
            };

            // create product category data
            this.createProductCategoryModel(function(c) {
                const sName = c.Matkl === "XX" ? this.getText("emptyProductCategory") : c.Matkl;
                return {
                    key: c.Matkl,
                    name: sName
                };
            }.bind(this));
        },

        /**
         * close view and dialog
         */
        onExit : function () {
            if (this._oDialog) {
                this._oDialog.destroy();
            }
        },

        /**
         * Navigate to DetailView
         * @param oEvent
         */
        onItemPress : function(oEvent){
            const oItem = oEvent.getSource();
            const context = oItem.getBindingContext("product");
            this.getRouter().navTo("detail", {
                path : context.getModel().getObject(context.getPath()).Matnr
            });
        },

        /**
         * Execute Sorting with group function
         * @param oEvent
         */
        handleSortConfirm: function(oEvent) {

            const oView = this.getView();
            const oTable = oView.byId("idProductsTable");

            const mParams = oEvent.getParameters();
            const oBinding = oTable.getBinding("items");

            let sPath;
            let bDescending;
            let vGroup;
            const aSorters = [];
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

        },

        /**
         * Open SortDialog
         * @param oEvent
         */
        handleSortDialogButtonPressed: function (oEvent) {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment("de.nak.productlist.view.SortDialog", this);
                this._oDialog.setModel(this.getModel("i18n"), "i18n");
            }
            // toggle compact style
            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
            this._oDialog.open();
        },

        /**
         * reset button resets all filter edits and triggers filtering
         */
        onReset: function() {
            this.oProductId.setValue();
            this.oProductName.setValue();
            this.oProductCategory.setSelectedKey();
            this.oStdPrice.setValue();

            this.onFilterChange();
        },

        /**
         * filter list
         */
        onFilterChange: function() {

            /**
             * triggers the actual filtering from given filter data and ops
             * @type {map}
             */
            const fnDoFilter = function(mFilterValueMap){

                const aFilterList = _.map(mFilterValueMap, function(v, k) {
                    switch (v.op) {
                        case sap.ui.model.FilterOperator.Contains:
                            return new sap.ui.model.Filter(k, v.op, [v.value]);
                        case sap.ui.model.FilterOperator.BT:
                            return new sap.ui.model.Filter({
                                path: k,
                                operator: v.op,
                                value1: v.value[0],
                                value2: v.value[1]
                            });
                    }
                });

                this.oTable.getBinding('items').filter(aFilterList)
            }.bind(this);

            /**
             * compose filter data from filter items map
             * @type {map}
             */
            const fnExtractFilterValues = function(mFilterItemsMap) {
                return _.transform(mFilterItemsMap, function(acc, v, k) {
                    if ((_.isArray(v.value()) && !_.isEmpty(v.value()) || (!_.isArray(v.value()) && v.value()))) {
                        acc[k] = {
                            value: v.value(),
                            op: v.op()
                        };
                    }
                }, {});
            }.bind(this);


            fnDoFilter(fnExtractFilterValues(this.mFilterItems));
        }


    })
});
