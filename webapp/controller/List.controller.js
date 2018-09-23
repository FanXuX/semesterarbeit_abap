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

            const fnGetById = function(id) {
                return this.getView().byId(id);
            }.bind(this);

            const fnExtractTextFilterValue = function(edit) {
                return {
                    value() {
                        return edit.getValue();
                    },
                    op() {
                        return sap.ui.model.FilterOperator.Contains;
                    }
                };
            };

            const fnExtractPriceFilterValue = function(combo) {
                return {
                    value() {
                        switch (combo.getSelectedKey()) {
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

            this.filterItems = {
                'Matnr': fnExtractTextFilterValue(this.oProductId),
                'Maktx': fnExtractTextFilterValue(this.oProductName),
                'Matkl': fnExtractTextFilterValue(this.oProductCategory),
                'Stprs': fnExtractPriceFilterValue(this.oStdPrice)
            };

            // prepare functions for grouping
            this.mGroupFunctions = {
                Matkl: function(oContext) {
                    var name = oContext.getProperty("Matkl");
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
                        text = "{i18n>stdPrice} <= 100";
                    } else if (price <= 1000) {
                        key = "BT100-1000";
                        text = "100 < {i18n>stdPrice} <= 1000";
                    } else {
                        key = "GT1000";
                        text = "{i18n>stdPrice} > 1000";
                    }
                    return {
                        key: key,
                        text: text
                    };
                }
            };

            // create product category data
            const productCategoryModel = new JSONModel({
               categories: []
            });
            this.setModel(productCategoryModel, "productCategory");

            const productModel = this.getOwnerComponent().getModel("product");

            productModel.read("/WarengruppeSet", { success: function(data) {
                const categories = data.results.map(function(c) {
                    const name = c.Matkl === "XX" ? this.getText("emptyProductCategory") : c.Matkl;
                    return {
                        key: c.Matkl,
                        name: name
                    };
                }.bind(this));

                this.getModel("productCategory").setProperty("/categories", categories);

            }.bind(this)});
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
            var oItem = oEvent.getSource();
            let context = oItem.getBindingContext("product");
            this.getRouter().navTo("detail", {
                path : context.getModel().getObject(context.getPath()).Matnr
            });
        },

        /**
         * Execute Sorting with group function
         * @param oEvent
         */
        handleSortConfirm: function(oEvent) {

            var oView = this.getView();
            var oTable = oView.byId("idProductsTable");

            var mParams = oEvent.getParameters();
            var oBinding = oTable.getBinding("items");

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

        onReset: function() {
            this.oProductId.setValue();
            this.oProductName.setValue();
            this.oProductCategory.setValue();
            this.oStdPrice.setValue();

            this.onFilterChange();
        },

        /**
         * filter list
         */
        onFilterChange: function() {

            const fnDoFilter = function(filterValueMap){

                const filterList = _.map(filterValueMap, function(v, k) {
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

                this.oTable.getBinding('items').filter(filterList)
            }.bind(this);

            const fnExtractFilterValues = function(filterItemsMap) {
                return _.transform(filterItemsMap, function(acc, v, k) {
                    if ((_.isArray(v.value()) && !_.isEmpty(v.value()) || (!_.isArray(v.value()) && v.value()))) {
                        acc[k] = {
                            value: v.value(),
                            op: v.op()
                        };
                    }
                }, {});
            }.bind(this);


            fnDoFilter(fnExtractFilterValues(this.filterItems));
        },

        onWarengruppeReceived: function(event) {
            const values = event.getParameters().data.results;

            values.map
        }
    })
});
