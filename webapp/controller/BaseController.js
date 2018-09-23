sap.ui.define([
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
    ], function (Controller, JSONModel) {
        "use strict";

        return Controller.extend("de.nak.productlist.controller.BaseController", {
            /**
             * Convenience method for accessing the router.
             * @public
             * @returns {sap.ui.core.routing.Router} the router for this component
             */
            getRouter: function () {
                return sap.ui.core.UIComponent.getRouterFor(this);
            },

            /**
             * Convenience method for getting the view model by name.
             * @public
             * @param {string} [sName] the model name
             * @returns {sap.ui.model.Model} the model instance
             */
            getModel: function (sName) {
                return this.getView().getModel(sName);
            },

            /**
             * Convenience method for setting the view model.
             * @public
             * @param {sap.ui.model.Model} oModel the model instance
             * @param {string} sName the model name
             * @returns {sap.ui.mvc.View} the view instance
             */
            setModel: function (oModel, sName) {
                return this.getView().setModel(oModel, sName);
            },

            /**
             * Getter for the resource bundle.
             * @public
             * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
             */
            getResourceBundle: function () {
                return this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            getText: function (code) {
                return this.getView().getModel("i18n").getResourceBundle().getText(code);
            },

            createProductCategoryModel(mapFunc) {
                const productCategoryModel = new JSONModel({
                    categories: []
                });
                this.setModel(productCategoryModel, "productCategory");

                const productModel = this.getOwnerComponent().getModel("product");

                productModel.read("/WarengruppeSet", { success: function(data) {
                        const categories = data.results
                            .map(mapFunc);

                        this.getModel("productCategory").setProperty("/categories", categories);

                    }.bind(this)});

            }
        });

    }
);