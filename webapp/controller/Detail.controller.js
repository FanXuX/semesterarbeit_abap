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

            this.generalForm = this.getView().byId("generalForm");
            this.technicalForm = this.getView().byId("technicalForm");

            this._initInputs();

            var iOriginalBusyDelay,
                oViewModel = new JSONModel({
                    busy : true,
                    delay : 0
                });

            const editModeModel = new JSONModel({
                editing: false,
                changed: false,
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

            this._onViewMode();
        },

        _initInputs: function() {
            this.inputs = _({
                edit_Maktx: {mandatory: true},
                edit_Wrkst: {mandatory: false},
                edit_Spart: {mandatory: true},
                edit_Matkl: {mandatory: true},
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

        _clearForms: function() {
            _([this.generalForm, this.technicalForm])
                .forEach(function(form) {
                    form.destroyContent();
                });
        },

        _createTitle: function(i18n) {
            return new sap.ui.core.Title({
                level: "H3",
                text: "{i18n>" + i18n + "}"
            });
        },

        _createText: function(text) {
            let value = text;
            if (!text.startsWith("{")) {
                value = "{product>" + text + "}";
            }

            return new sap.m.Text({
                text: value
            });
        },

        _createLabel: function(i18n, labelFor) {
            const label = new sap.m.Label({
                text: "{i18n>" + i18n + "}"
            });

            if (labelFor) {
                label.setLabelFor("edit_" + labelFor);
            }

            return label;
        },

        _createCombo: function(prop, bind, key) {
            const id = 'edit_' + prop;

            const combo = new sap.m.ComboBox(id);
            const settings = {
                change: this.onInputChange.bind(this),
                selectedKey: "{product>" + prop + "}",
                items: {
                    path: bind,
                    template: new sap.ui.core.Item({
                        key: "{product>" + key + "}",
                        text: "{product>" + key + "}"
                    }),
                    events: {
                        dataReceived: function(ev) {
                            combo.setBusy(false);
                        }
                    },
                    sorter: {
                        path: key
                    }
                },
                busy: true
            };

            combo.applySettings(settings);

            this.inputs[id].input = combo;
            this.inputs[id].type = "combo";
            return combo;
        },

        _createNumberInput: function(prop, conf) {
            const id = 'edit_' + prop;

            const value = {
                path: 'product>' + prop,
            };

            const settings = {
                valueLiveUpdate: true,
                liveChange: this.onInputChange.bind(this),
                value: value,
                editable: '{= ${product>' + conf.description + '} !== ""}'
            };

            settings['description'] = "{product>" + conf.description + "}";

            const input = new sap.m.Input(id, settings);

            this.inputs[id].input = input;
            this.inputs[id].type = "number";
            this.inputs[id].constraints = conf.constraints;

            return input;
        },

        _createInput: function(prop, conf) {
            const id = 'edit_' + prop;

            const value = {
                path: 'product>' + prop,
            };

            const settings = {
                valueLiveUpdate: true,
                liveChange: this.onInputChange.bind(this),
                value: value
            };

            if (conf) {
                if (conf.type) {
                    settings['type'] = conf.type;
                }
                if (conf.description) {
                    settings['description'] = conf.description
                }
                if (conf.value) {
                    const v = conf.value;
                    if (v.type) {
                        value['type'] = v.type;
                    }
                    if (v.constraints) {
                        value['constraints'] = v.constraints;
                    }
                }
            }

            const input = new sap.m.Input(id, settings);

            this.inputs[id].input = input;
            this.inputs[id].type = "text";

            return input;
        },

        _addToForm: function(form) {
            return function(content) {
                form.addContent(content);
            };
        },

        _setForms: function(generalContent, technicalContent) {
            // remove everything
            this._clearForms();

            const addToGeneral = this._addToForm(this.generalForm);
            const addToTechnical = this._addToForm(this.technicalForm);

            _(generalContent)
                .forEach(addToGeneral);

            _(technicalContent)
                .forEach(addToTechnical);
        },

        _onViewMode: function() {

            const generalContent = [
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

            const technicalContent = [
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

            this._setForms(generalContent, technicalContent);
        },

        _onEditMode: function() {
            this._initInputs();

            const generalContent = [
                this._createTitle("description"),
                this._createLabel("productName", "Maktx"),
                this._createInput("Maktx", {
                    value: {
                        type : 'sap.ui.model.type.String',
                        constraints : {
                            maxLength: 40
                        }
                    }
                }),

                this._createTitle("materialInfo"),
                this._createLabel("materialType"),
                this._createText("Mtart"),
                this._createLabel("basicMaterial", "Wrkst"),
                this._createInput("Wrkst", {
                    value: {
                        type : 'sap.ui.model.type.String',
                        constraints : {
                            maxLength: 40
                        }
                    }
                }),

                this._createTitle("organizationStructure"),
                this._createLabel("branche"),
                this._createText("Mbrsh"),
                this._createLabel("sector", "Spart"),
                this._createCombo("Spart", "product>/SparteSet", "Name"),

                this._createTitle("purchasingData"),
                this._createLabel("procurement"),
                this._createText("Beskz"),
                this._createLabel("productCategory", "Matkl"),
                this._createCombo("Matkl", "product>/WarengruppeSet", "Name"),
            ];

            const technicalContent = [
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

            this._setForms(generalContent, technicalContent);
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
            // this._onViewMode();
            this._setBusy(false)
        },

        /**
         * navigate back to list view
         */
        onNavButtonPress: function () {
            this.onAbort(function() {
                //check if there is ui5 history
                var history = History.getInstance();
                var previousHash = history.getPreviousHash();

                if (previousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    oRouter.navTo("list", {}, true);
                }
            }.bind(this));
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
            editModeModel.setProperty("/changed", false);

            if (isEdit) {
                this._onEditMode();
            } else {
                this._onViewMode();
            }
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

        _validate: function(input, isMandatory, type, constraints) {
            const valueBinding = input.getBinding("value");
            const value = input.getValue();

            let isValid = false;

            if (!isMandatory || (isMandatory && value)) {
                try {
                    switch (type) {
                        case "text":
                            valueBinding.getType().validateValue(value);
                            isValid = true;
                            break;
                        case "combo":
                            const values = input.getKeys();
                            isValid = values.includes(value);
                            break;
                        case "number":
                            const num = Number(value);
                            if (!isNaN(num)) {
                                if (typeof constraints.minimum !== 'undefined' && num < constraints.minimum) {
                                    break;
                                }
                                if (typeof constraints.maximum !== 'undefined' && num > constraints.maximum) {
                                    break;
                                }
                                if (typeof constraints.precision !== 'undefined' && constraints.precision >= 0) {

                                    const regex = new RegExp("^\\d+(\\.\\d{0," + constraints.precision + "})?$");
                                    const match = regex.exec(value);
                                    if (!match) {
                                        break;
                                    }
                                }
                                isValid = true;
                            }
                            break;
                        default:
                            // unknown type => auto fail
                    }
                } catch (e) {
                    // Error found => fail
                }
            }

            input.setValueState(isValid ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
            return isValid;
        },

        onInputChange: function(event) {
            const re = /^.*edit_([a-zA-Z]{5})$/;
            const editModel = this.getModel("editModeView");

            editModel.setProperty("/changed", true);

            const elementId = event.getParameters().id;
            const value = event.getParameters().value;

            const match = re.exec(elementId);
            if (!match) {
                return;
            }
            const prop = match[1];
            const input = event.getSource();
            const validationSettings = this.inputs["edit_" + prop];

            if (!this._validate(input, validationSettings.mandatory, validationSettings.type, validationSettings.constraints)) {
                // found an error
                return;
            }


            const data = editModel.getProperty("/data");

            data[prop] = value;

            editModel.setProperty("/data", data);
        },

        onSave: function() {
            const fnSuccess = function (oData, res) {
                this._setBusy(false);
                this._setEditMode(false);
                MessageToast.show(this.getText("productSaved"));
            }.bind(this);

            const fnError = function (oError) {
                this._setBusy(false);
                this._setEditMode(false);
                MessageBox.error(oError.message);
            }.bind(this);

            this._setBusy(true);

            // validate
            const isValid = _(this.inputs)
                .values()
                .map(function(v) {
                    const input = v.input;
                    const isMandatory = v.mandatory;
                    const type = v.type;
                    const constraints = v.constraints;
                    return this._validate(input, isMandatory, type, constraints);
                }.bind(this))
                .every(function (value) {
                    return value;
                });

            if (!isValid) {
                MessageBox.error(this.getText("formInvalid"));
                this._setBusy(false);
                return;
            }

            const editModel = this.getModel("editModeView");

            const productId = editModel.getProperty("/productId");
            const changedData = editModel.getProperty("/data");

            this.getModel("product").update("/ProduktSet('" + productId + "')", changedData, {
                success: fnSuccess,
                error: fnError
            });

        },

        onAbort: function(exec) {
            const editModel = this.getModel("editModeView");

            const isChanged = editModel.getProperty("/changed");

            if (isChanged) {
                MessageBox.confirm(this.getText("abortEdit"), {
                    title: this.getText("abortEditTitle"),
                    onClose: this.handleAbortClose(exec).bind(this)
                });
            } else {
                this._onAbort(exec);
            }
        },

        handleAbortClose(exec) {

            return function(event) {
                switch (event) {
                    case MessageBox.Action.OK:
                        this._onAbort(exec);
                        break;
                    case MessageBox.Action.Cancel:
                        // do nothing
                        break;

                    default:
                    //not handled
                }
            };
        },

        _onAbort: function(exec) {
            const editModel = this.getModel("editModeView");
            this.getModel("product").resetChanges();

            const changedData = editModel.setProperty("/data", {});
            this._setEditMode(false);

            if (typeof exec === "function") {
                exec();
            }
        },
    })
});
