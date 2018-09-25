/* global _:true */
sap.ui.define([
    "de/nak/productlist/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "de/nak/productlist/libs/lodash.min",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, History, lodash, MessageBox, MessageToast) {
    "use strict";
    return BaseController.extend("de.nak.productlist.controller.Detail", {

        /**
         * initialize detail view with delay function
         */
        onInit: function () {

            // find changeable froms
            this.oGeneralForm = this.getView().byId("generalForm");
            this.oTechnicalForm = this.getView().byId("technicalForm");

            this._initInputs();

            // setup additional models
            const oViewModel = new JSONModel({
                    busy : true,
                    delay : 0
                });

            const oEditModeModel = new JSONModel({
                editing: false,
                changed: false,
                productId: null,
                data: {}
            });

            this.getRouter().getRoute("detail").attachPatternMatched(this._onObjectMatched,
                this);

            const iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
            this.setModel(oViewModel, "detailView");
            this.setModel(oEditModeModel, "editModeView");

            // trigger data load
            this.getOwnerComponent().getModel("product").metadataLoaded().then(function () {
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                    this.getModel("product").setUseBatch(true)
                }.bind(this)
            );

            // setup product categories
            this.createProductCategoryModel(function(c) {
                if (c.Matkl === "XX") {
                    return  {
                        key: "",
                        name: ""
                    };
                }
                return {
                    key: c.Matkl,
                    name: c.Matkl
                };
            }.bind(this));

            this._onViewMode();
        },

        /**
         * create default inputs config
         * @private
         */
        _initInputs: function() {
            this.mInputs = _({
                edit_Maktx: {mandatory: true},
                edit_Wrkst: {mandatory: false},
                edit_Spart: {mandatory: false},
                edit_Matkl: {mandatory: false},
                edit_Laeng: {mandatory: false},
                edit_Breit: {mandatory: false},
                edit_Hoehe: {mandatory: false},
                edit_Brgew: {mandatory: false},
                edit_Ntgew: {mandatory: false},
            })
                .mapValues(function(v, k) {
                    return {
                        input: null,
                        type: null,
                        constraints: null,
                        mandatory: v.mandatory
                    }
                })
                .value();
        },

        /**
         * finds id from url path and binds it to model
         * @param oEvent
         * @private
         */
        _onObjectMatched: function (oEvent) {
            const sPath = oEvent.getParameter("arguments").path;
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
         * delete everything in the changeable forms
         * @private
         */
        _clearForms: function() {
            _([this.oGeneralForm, this.oTechnicalForm])
                .forEach(function(form) {
                    form.destroyContent();
                });
        },

        /**
         * creates a title view component
         * @param i18n
         * @return {sap.ui.core.Title}
         * @private
         */
        _createTitle: function(i18n) {
            return new sap.ui.core.Title({
                level: "H3",
                text: "{i18n>" + i18n + "}"
            });
        },

        /**
         * create a text view component
         * @param sText
         * @return {sap.m.Text}
         * @private
         */
        _createText: function(sText) {
            let sValue = sText;
            if (!sText.startsWith("{")) {
                sValue = "{product>" + sText + "}";
            }

            return new sap.m.Text({
                text: sValue
            });
        },

        /**
         * create a label view component
         * @param i18n
         * @param sLabelFor
         * @return {sap.m.Label}
         * @private
         */
        _createLabel: function(i18n, sLabelFor) {
            const oLabel = new sap.m.Label({
                text: "{i18n>" + i18n + "}"
            });

            if (sLabelFor) {
                oLabel.setLabelFor("edit_" + sLabelFor);
            }

            return oLabel;
        },

        /**
         * create a combo for product categories
         * @param sProp
         * @return {sap.m.ComboBox}
         * @private
         */
        _createProductCategoryCombo: function(sProp) {
            const sId = 'edit_' + sProp;

            const oCombo = new sap.m.ComboBox(sId);
            const oSettings = {
                change: this.onInputChange.bind(this),
                selectedKey: "{product>Matkl}",
                items: {
                    path: "productCategory>/categories",
                    template: new sap.ui.core.Item({
                        key: "{productCategory>key}",
                        text: "{productCategory>name}"
                    }),
                    sorter: {
                        path: "key"
                    }
                }
            };

            oCombo.applySettings(oSettings);

            this.mInputs[sId].input = oCombo;
            this.mInputs[sId].type = "combo";
            return oCombo;
        },

        /**
         * create a combo box
         * @param sProp product prop
         * @param sBind bind for values
         * @param sKey key to show as value
         * @return {sap.m.ComboBox}
         * @private
         */
        _createCombo: function(sProp, sBind, sKey) {
            const sId = 'edit_' + sProp;

            const oCombo = new sap.m.ComboBox(sId);
            const oSettings = {
                change: this.onInputChange.bind(this),
                selectedKey: "{product>" + sProp + "}",
                items: {
                    path: sBind,
                    template: new sap.ui.core.Item({
                        key: "{product>" + sKey + "}",
                        text: "{product>" + sKey + "}"
                    }),
                    events: {
                        dataReceived: function(ev) {
                            oCombo.setBusy(false);
                        }
                    },
                    sorter: {
                        path: sKey
                    }
                },
                busy: true
            };

            oCombo.applySettings(oSettings);

            this.mInputs[sId].input = oCombo;
            this.mInputs[sId].type = "combo";
            return oCombo;
        },

        /**
         * create a number input
         * @param sProp product prop
         * @param oConf field config
         * @return {sap.m.Input}
         * @private
         */
        _createNumberInput: function(sProp, oConf) {
            const sId = 'edit_' + sProp;

            const oValue = {
                path: 'product>' + sProp,
            };

            const oSettings = {
                valueLiveUpdate: true,
                liveChange: this.onInputChange.bind(this),
                value: oValue,
                editable: '{= ${product>' + oConf.description + '} !== ""}'
            };

            oSettings['description'] = "{product>" + oConf.description + "}";

            const oInput = new sap.m.Input(sId, oSettings);

            this.mInputs[sId].input = oInput;
            this.mInputs[sId].type = "number";
            this.mInputs[sId].constraints = oConf.constraints;

            return oInput;
        },

        /**
         * create a general input field
         * @param sProp product prop
         * @param oConf config
         * @return {sap.m.Input}
         * @private
         */
        _createInput: function(sProp, oConf) {
            const sId = 'edit_' + sProp;

            const oValue = {
                path: 'product>' + sProp,
            };

            const oSettings = {
                valueLiveUpdate: true,
                liveChange: this.onInputChange.bind(this),
                value: oValue,
                valueStateText: this.getText(oConf.errorText)
            };

            if (oConf) {
                if (oConf.type) {
                    oSettings['type'] = oConf.type;
                }
                if (oConf.description) {
                    oSettings['description'] = oConf.description
                }
                if (oConf.value) {
                    const v = oConf.value;
                    if (v.type) {
                        oValue['type'] = v.type;
                    }
                    if (v.constraints) {
                        oValue['constraints'] = v.constraints;
                    }
                }
            }

            const oInput = new sap.m.Input(sId, oSettings);

            this.mInputs[sId].input = oInput;
            this.mInputs[sId].type = "text";

            return oInput;
        },

        /**
         * 'curried' function to add a content to a form
         * @param form
         * @return {Function}
         * @private
         */
        _addToForm: function(form) {
            return function(content) {
                form.addContent(content);
            };
        },

        /**
         * add the given stuff to the changeable forms
         * @param aGeneralContent
         * @param aTechnicalContent
         * @private
         */
        _setForms: function(aGeneralContent, aTechnicalContent) {
            // remove everything
            this._clearForms();

            const addToGeneral = this._addToForm(this.oGeneralForm);
            const addToTechnical = this._addToForm(this.oTechnicalForm);

            _(aGeneralContent)
                .forEach(addToGeneral);

            _(aTechnicalContent)
                .forEach(addToTechnical);
        },

        /**
         * setup view mode
         * @private
         */
        _onViewMode: function() {

            const aGeneralContent = [
                this._createTitle("description"),
                this._createLabel("productName"),
                this._createText("Maktx"),

                this._createTitle("materialInfo"),
                this._createLabel("materialType"),
                this._createText("Mtart"),
                this._createLabel("basicMaterial"),
                this._createText("Wrkst"),

                this._createTitle("organizationStructure"),
                this._createLabel("branche"),
                this._createText("Mbrsh"),
                this._createLabel("sector"),
                this._createText("Spart"),

                this._createTitle("purchasingData"),
                this._createLabel("procurement"),
                this._createText("Beskz"),
                this._createLabel("productCategory"),
                this._createText("Matkl"),
            ];

            const aTechnicalContent = [
                this._createTitle("dimensions"),
                this._createLabel("length"),
                this._createText("{product>Laeng} {product>Meabm}"),
                this._createLabel("width"),
                this._createText("{product>Breit} {product>Meabm}"),
                this._createLabel("height"),
                this._createText("{product>Hoehe} {product>Meabm}"),

                this._createTitle("weight"),
                this._createLabel("grossWeight"),
                this._createText("{product>Brgew} {product>Gewei}"),
                this._createLabel("netWeight"),
                this._createText("{product>Ntgew} {product>Gewei}"),
            ];

            this._setForms(aGeneralContent, aTechnicalContent);
        },

        /**
         * setup edit mode
         * @private
         */
        _onEditMode: function() {
            this._initInputs();

            const aGeneralContent = [
                this._createTitle("description"),
                this._createLabel("productName", "Maktx"),
                this._createInput("Maktx", {
                    value: {
                        type : 'sap.ui.model.type.String',
                        constraints : {
                            maxLength: 40
                        }
                    },
                    errorText: this.getText('productNameValidation')
                }),

                this._createTitle("materialInfo"),
                this._createLabel("materialType"),
                this._createText("Mtart"),
                this._createLabel("basicMaterial", "Wrkst"),
                this._createInput("Wrkst", {
                    value: {
                        type : 'sap.ui.model.type.String',
                        constraints : {
                            maxLength: 48
                        }
                    },
                    errorText: this.getText('basicMaterialValidation')
                }),

                this._createTitle("organizationStructure"),
                this._createLabel("branche"),
                this._createText("Mbrsh"),
                this._createLabel("sector", "Spart"),
                this._createCombo("Spart", "product>/SparteSet", "Spart"),

                this._createTitle("purchasingData"),
                this._createLabel("procurement"),
                this._createText("Beskz"),
                this._createLabel("productCategory", "Matkl"),
                this._createProductCategoryCombo("Matkl"),
            ];

            const aTechnicalContent = [
                this._createTitle("dimensions"),
                this._createLabel("length", "Laeng"),
                this._createNumberInput("Laeng", {
                    description: "Meabm",
                    constraints : {
                        minimum: 0,
                        maximum: 99999999,
                        precision: 3
                    }
                }),
                this._createLabel("width", "Breit"),
                this._createNumberInput("Breit", {
                    description: "Meabm",
                    constraints : {
                        minimum: 0,
                        maximum: 99999999,
                        precision: 3
                    }
                }),
                this._createLabel("height", "Hoehe"),
                this._createNumberInput("Hoehe", {
                    description: "Meabm",
                    constraints : {
                        minimum: 0,
                        maximum: 99999999,
                        precision: 3
                    }
                }),

                this._createTitle("weight"),
                this._createLabel("grossWeight", "Brgew"),
                this._createNumberInput("Brgew", {
                    description: "Gewei",
                    constraints : {
                        minimum: 0,
                        maximum: 99999999,
                        precision: 3
                    }
                }),
                this._createLabel("netWeight", "Ntgew"),
                this._createNumberInput("Ntgew", {
                    description: "Gewei",
                    constraints : {
                        minimum: 0,
                        maximum: 99999999,
                        precision: 3
                    }
                }),
            ];

            this._setForms(aGeneralContent, aTechnicalContent);
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
            const oView = this.getView(),
                oElementBinding = oView.getElementBinding("product");

            // No data found
            if (!oElementBinding.getBoundContext()) {
                // TODO handle missing data
                // this.getRouter().getTargets().display("notFound");
                console.log("no data!");
                return;
            }

            // data found
            // this._onViewMode();
            this._setBusy(false)
        },

        /**
         * navigate back to list view
         */
        onNavButtonPress: function () {
            this.onAbort(function() {
                //check if there is ui5 history
                const history = History.getInstance();
                const previousHash = history.getPreviousHash();

                if (previousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("list", {}, true);
                }
            }.bind(this));
        },

        /**
         * set busy mode
         * @param bIsBusy
         * @private
         */
        _setBusy: function(bIsBusy) {
            const oModel = this.getModel("detailView");

            oModel.setProperty("/busy", bIsBusy);
        },

        /**
         * get busy state
         * @return {boolean}
         * @private
         */
        _getBusy: function() {
            const oModel = this.getModel("detailView");

            return oModel.getProperty("/busy");
        },

        /**
         * set edit mode or not
         * @param bIsEdit
         * @private
         */
        _setEditMode: function(bIsEdit) {
            const oEditModeModel = this.getModel("editModeView");

            oEditModeModel.setProperty("/editing", bIsEdit);
            oEditModeModel.setProperty("/changed", false);
            oEditModeModel.setProperty("/data", {});

            if (bIsEdit) {
                this._onEditMode();
            } else {
                this._onViewMode();
            }
        },

        /**
         * get current edit mode
         * @return {boolean}
         * @private
         */
        _getEditMode: function() {
            const oEditModeModel = this.getModel("editModeView");

            return oEditModeModel.getProperty("/editing");
        },

        /**
         * edit clicked
         */
        onEdit: function () {
            if (this._getEditMode()) {
                this.onAbort();
            } else {
                this._setEditMode(true)
            }

        },

        /**
         * validate an input
         * @param oInput
         * @param bIsMandatory
         * @param sType
         * @param oConstraints
         * @return {boolean}
         * @private
         */
        _validate: function(oInput, bIsMandatory, sType, oConstraints) {
            const oValueBinding = oInput.getBinding("value");
            const sValue = sType === "combo" ? oInput.getSelectedKey() : oInput.getValue();

            let bIsValid = false;

            if (!bIsMandatory || (bIsMandatory && sValue)) {
                try {
                    switch (sType) {
                        case "text":
                            oValueBinding.getType().validateValue(sValue);
                            bIsValid = true;
                            break;
                        case "combo":
                            const values = oInput.getKeys();
                            bIsValid = values.includes(sValue) || (!bIsMandatory && !sValue);
                            break;
                        case "number":
                            const fNum = Number(sValue);
                            if (!isNaN(fNum)) {
                                if (typeof oConstraints.minimum !== 'undefined' && fNum < oConstraints.minimum) {
                                    break;
                                }
                                if (typeof oConstraints.maximum !== 'undefined' && fNum > oConstraints.maximum) {
                                    break;
                                }
                                if (typeof oConstraints.precision !== 'undefined' && oConstraints.precision >= 0) {

                                    const rRegex = new RegExp("^\\d+(\\.\\d{0," + oConstraints.precision + "})?$");
                                    const aMatch = rRegex.exec(sValue);
                                    if (!aMatch) {
                                        break;
                                    }
                                }
                                bIsValid = true;
                            }
                            break;
                        default:
                            // unknown type => auto fail
                    }
                } catch (e) {
                    // Error found => fail
                }
            }

            oInput.setValueState(bIsValid ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
            return bIsValid;
        },

        /**
         * handle input change
         * @param oEvent
         */
        onInputChange: function(oEvent) {
            const rRe = /^.*edit_([a-zA-Z]{5})$/;
            const oEditModel = this.getModel("editModeView");

            oEditModel.setProperty("/changed", true);

            const sElementId = oEvent.getParameters().id;
            // why is this the text instead of the key on combo boxes?!
            let sValue = oEvent.getParameters().value;

            const aMatch = rRe.exec(sElementId);
            if (!aMatch) {
                return;
            }
            const sProp = aMatch[1];
            const oInput = oEvent.getSource();
            const mValidationSettings = this.mInputs["edit_" + sProp];

            if (!this._validate(oInput, mValidationSettings.mandatory, mValidationSettings.type, mValidationSettings.constraints)) {
                // found an error
                return;
            }

            if (mValidationSettings.type === "combo") {
                sValue = oInput.getSelectedKey();
            }


            const oData = oEditModel.getProperty("/data");

            oData[sProp] = sValue;

            oEditModel.setProperty("/data", oData);
        },

        /**
         * save clicked
         */
        onSave: function() {
            const fnSuccess = function (oData, res) {
                this._setBusy(false);
                this._setEditMode(false);
                MessageToast.show(this.getText("productSaved"));
            }.bind(this);

            const fnError = function (oError) {
                this._setBusy(false);

                let sErrorMsg = this.getText("genericError");

                try {
                    sErrorMsg = JSON.parse(oError.responseText).error.message.value;
                } catch (e) {
                    console.error("unable to retrieve backend server error message", e);
                }

                MessageBox.error(sErrorMsg);
            }.bind(this);

            this._setBusy(true);

            // validate
            const bIsValid = _(this.mInputs)
                .values()
                .map(function(v) {
                    const oInput = v.input;
                    const bIsMandatory = v.mandatory;
                    const sType = v.type;
                    const oConstraints = v.constraints;
                    return this._validate(oInput, bIsMandatory, sType, oConstraints);
                }.bind(this))
                .every(function (value) {
                    return value;
                });

            if (!bIsValid) {
                MessageBox.error(this.getText("formInvalid"));
                this._setBusy(false);
                return;
            }

            const oEditModel = this.getModel("editModeView");
            const oProductModel = this.getModel("product");

            const sProductId = oEditModel.getProperty("/productId");
            const sPath = "/ProduktSet('" + sProductId + "')";
            const oOriginalData = Object.assign({}, oProductModel.getData(sPath));
            const oChanges = oEditModel.getProperty("/data");
            const oChangedData = Object.assign(oOriginalData, oChanges);


            this.getModel("product").update(sPath, oChangedData, {
                success: fnSuccess,
                error: fnError,
                merge: false
            });

        },

        /**
         * handle abort
         *
         * @param {Function} fnExec
         */
        onAbort: function(fnExec) {
            const oEditModel = this.getModel("editModeView");

            const bIsChanged = oEditModel.getProperty("/changed");

            if (bIsChanged) {
                MessageBox.confirm(this.getText("abortEdit"), {
                    title: this.getText("abortEditTitle"),
                    onClose: this._handleAbortClose(fnExec).bind(this)
                });
            } else {
                this._onAbort(fnExec);
            }
        },

        /**
         * creates callback to handle abort dialog
         * @param fnExec
         * @return {Function}
         * @private
         */
        _handleAbortClose(fnExec) {

            return function(oEvent) {
                switch (oEvent) {
                    case MessageBox.Action.OK:
                        this._onAbort(fnExec);
                        break;
                    case MessageBox.Action.Cancel:
                        // do nothing
                        break;

                    default:
                    //not handled
                }
            };
        },

        /**
         * actual abort
         * @param fnExec
         * @private
         */
        _onAbort: function(fnExec) {
            const oEditModel = this.getModel("editModeView");
            this.getModel("product").resetChanges();

            oEditModel.setProperty("/data", {});
            this._setEditMode(false);

            if (typeof fnExec === "function") {
                fnExec();
            }
        },
    })
});
