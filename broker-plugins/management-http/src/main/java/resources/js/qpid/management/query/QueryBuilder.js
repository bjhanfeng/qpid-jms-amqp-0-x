/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */
define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/parser",
        "dojo/dom-construct",
        "dojo/json",
        "dojo/text!query/QueryBuilder.html",
        "dojox/html/entities",
        "dgrid/Grid",
        "dgrid/Keyboard",
        "dgrid/Selection",
        "dgrid/extensions/Pagination",
        "dgrid/Selector",
        "dstore/Memory",
        'dstore/legacy/DstoreAdapter',
        "qpid/management/query/DropDownSelect",
        "qpid/management/query/WhereExpression",
        "dojo/Evented",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dijit/form/FilteringSelect",
        "dijit/form/ComboBox",
        "dijit/form/Button",
        "dijit/form/ComboButton",
        "dijit/form/CheckBox",
        "dijit/form/DropDownButton",
        "dijit/form/NumberTextBox",
        "dijit/form/ValidationTextBox",
        "dijit/form/Select",
        "dijit/form/SimpleTextarea",
        "dijit/Menu",
        "dijit/MenuItem",
        "dijit/Toolbar",
        "dijit/TooltipDialog",
        "dijit/Dialog",
        "dojo/Deferred",
        "dojo/json"
        ],
        function(declare,
                 lang,
                 parser,
                 domConstruct,
                 json,
                 template,
                 entities,
                 Grid,
                 Keyboard,
                 Selection,
                 Pagination,
                 Selector,
                 Memory,
                 DstoreAdapter,
                 DropDownSelect,
                 WhereExpression
                 )
        {
             var selectExpressionToArray =  function(value)
                                            {
                                              var columns = [];
                                              if (value)
                                              {
                                                var attributes = value.split(",");
                                                for (var i in attributes)
                                                {
                                                   var attribute = attributes[i].replace(/^\s+|\s+$/gm,'');
                                                   columns.push(attribute);
                                                }
                                              }
                                              return columns;
                                            };

             var arrayToSelectExpression =  function(value)
                                            {
                                              var expression = "";
                                              if (lang.isArray(value))
                                              {
                                                for(var i=0; i<value.length ;i++)
                                                {
                                                  var selection = value[i] && value[i].hasOwnProperty("attributeName") ?
                                                                  value[i].attributeName : value[i];
                                                  expression = expression + (i > 0 ? "," : "") + selection;
                                                }
                                              }
                                              return expression;
                                            };
             var predefinedCategories =     [ {id: "queue", name: "queue"},  {id: "connection", name: "connection"} ];

            return declare( "qpid.management.query.QueryBuilder",
                            [dijit._Widget, dijit._TemplatedMixin, dijit._WidgetsInTemplateMixin],
                            {
                                 //Strip out the apache comment header from the template html as comments unsupported.
                                templateString:    template.replace(/<!--[\s\S]*?-->/g, ""),

                                /**
                                 * Fields from template
                                 **/
                                scope:null,
                                categoryName: null,
                                advancedSearch: null,
                                selectExpression: null,
                                whereExpression: null,
                                standardSearch: null,
                                selectColumnsButton: null,
                                selectWhereButton: null,
                                searchButton: null,
                                modeButton: null,
                                whereExpressionBuilder: null,
                                queryResultGrid: null,

                                /**
                                 * constructor parameter
                                 */
                                _management: null,

                                /**
                                 * Inner fields
                                 */
                                _standardMode: true,
                                _standardModeLastWhereExpression: null,
                                _standardModeLastSelectExpression: null,
                                _scopeModelObjects: {},
                                _categorySelector: null,
                                _searchScopeSelector: null,
                                _lastCategory: null,
                                _lastSearchQuery: null,

                                constructor: function(args)
                                             {
                                               this._management = args.management;
                                               this.inherited(arguments);
                                             },
                                postCreate:  function()
                                             {
                                               this.inherited(arguments);
                                               this._postCreate();
                                             },
                                _postCreate: function()
                                             {
                                               var promise = this._createScopeList();
                                               promise.then(lang.hitch(this, this. _postCreateScope));
                                             },
                                _postCreateScope: function()
                                             {
                                               this._createCategoryList();

                                               // advanced mode widgets
                                               this.selectExpression.on("change", lang.hitch(this, this._advancedModeSelectChanged));
                                               this.whereExpression.on("change", lang.hitch(this, this._advancedModeWhereChanged));
                                               this.selectExpression.on("keyUp", lang.hitch(this, this._advancedModeKeyPressed));
                                               this.whereExpression.on("keyUp", lang.hitch(this, this._advancedModeKeyPressed));

                                               // standard mode widgets
                                               this.selectColumnsButton.on("change", lang.hitch(this, this._standardModeSelectChanged));
                                               this.selectColumnsButton.startup();
                                               this.selectWhereButton.startup();
                                               this.whereExpressionBuilder.set("whereFieldsSelector", this.selectWhereButton );
                                               this.whereExpressionBuilder.startup();
                                               this.whereExpressionBuilder.on("change", lang.hitch(this, this._standardModeWhereChanged));

                                               // search & mode buttons
                                               this.searchButton.on("click", lang.hitch(this, this.search));
                                               this.modeButton.on("click", lang.hitch(this, this._modeChanged));

                                               this._categoryChanged();
                                               this._toggleSearchButton();
                                             },
                                search:      function()
                                             {
                                               var select, where;
                                               if (this._standardMode)
                                               {
                                                  select = this._standardModeLastSelectExpression;
                                                  where = this._standardModeLastWhereExpression;
                                               }
                                               else
                                               {
                                                 select = this.selectExpression.value;
                                                 where = this.whereExpression.value;
                                                 this._resetStandardSearchWidgetsIfAdvancedChanged();
                                               }

                                               var category = this._categorySelector.value.toLowerCase();
                                               if (select && category)
                                               {
                                                 var scope = this._searchScopeSelector.value;
                                                 this._lastSearchQuery = {scope:scope, select: select, where: where, category: category};
                                                 var modelObj = this._scopeModelObjects[scope];
                                                 this._doSearch( modelObj, category, select, where);
                                               }
                                             },
                                _doSearch:   function(modelObj, category, select, where)
                                             {
                                               var that = this;
                                               var result = this._management.query({select: select,
                                                                                    where: where,
                                                                                    parent: modelObj,
                                                                                    category: category,
                                                                                    transformIntoObjects: true});
                                               result.then(function(data)
                                                           {
                                                             that._showResults(data, select);
                                                           },
                                                           function(error)
                                                           {
                                                             if (error && error.response && error.response.status == 404)
                                                             {
                                                               that._showResults([], select);
                                                             }
                                                             else
                                                             {
                                                               alert(error.message ? error.message: error);
                                                             }
                                                           });
                                             },
                                _advancedModeWhereChanged:  function()
                                             {
                                               if (this._standardModeLastWhereExpression && !this._standardMode)
                                               {
                                                 dijit.showTooltip("On switching into Standard Mode where expression"
                                                                 + " will be erased. Copying of where expression from "
                                                                 + " Advanced Mode into Standard Mode is unsupported!",
                                                                 this.whereExpression.domNode,
                                                                 this.whereExpression.get("tooltipPosition"),
                                                                 !this.whereExpression.isLeftToRight());
                                               }
                                             },
                                _advancedModeSelectChanged: function()
                                             {
                                               this._toggleSearchButton(this.selectExpression.value);
                                             },
                                _toggleSearchButton: function(select)
                                             {
                                               var criteriaNotSet = !select;
                                               this.searchButton.set("disabled",criteriaNotSet);
                                               this.searchButton.set("title", criteriaNotSet?"Please, choose fields to display in order to enable search":"Search");
                                             },
                                _standardModeSelectChanged: function(result)
                                             {
                                               this._standardModeLastSelectExpression = arrayToSelectExpression(result);
                                               this.selectExpression.set("value", this._standardModeLastSelectExpression);
                                               this.search();
                                             },
                                _standardModeWhereChanged: function(result)
                                             {
                                                this._standardModeLastWhereExpression = result;
                                                this.whereExpression.set("value", result);
                                                this.search();
                                             },
                                _resetStandardSearchWidgetsIfAdvancedChanged: function()
                                             {
                                               if (this._standardModeLastWhereExpression && this._standardModeLastWhereExpression != this.whereExpression.value)
                                               {
                                                 this._standardModeLastWhereExpression = "";
                                                 this.whereExpressionBuilder.clearWhereCriteria();
                                               }

                                               if (this._standardModeLastSelectExpression != this.selectExpression.value)
                                               {
                                                 this._standardModeLastSelectExpression = this.selectExpression.value;
                                                 this.selectColumnsButton.set("data", {selected: selectExpressionToArray(this.selectExpression.value)});
                                                 var promise = this.selectColumnsButton.get("selectedItems");
                                                 dojo.when(promise,
                                                           lang.hitch(this,
                                                                      function(selectedItems)
                                                                      {
                                                                        var val = arrayToSelectExpression(selectedItems);
                                                                        this._standardModeLastSelectExpression = val;
                                                                      }));
                                               }
                                             },
                                _showResults:function(data, select)
                                             {
                                               var store = new Memory({data: data, idProperty: 'id'});
                                               if (!this._resultsGrid)
                                               {
                                                 if (select)
                                                 {
                                                   this._buildGrid(store, select);
                                                 }
                                               }
                                               else
                                               {
                                                 this._resultsGrid.set("collection", store);
                                                 this._resultsGrid.set("columns", this._getColumns(select));
                                                 this._resultsGrid.refresh();
                                               }
                                             },
                                _buildGrid:  function(store, select)
                                             {
                                                var CustomGrid = declare([ Grid, Keyboard, Selection, Pagination ]);
                                                var grid = new CustomGrid({
                                                                              columns: this._getColumns(select),
                                                                              collection: store,
                                                                              rowsPerPage: 100,
                                                                              selectionMode: 'single',
                                                                              cellNavigation: false,
                                                                              className: 'dgrid-autoheight'
                                                                          },
                                                                          this.queryResultGrid);
                                                this._resultsGrid = grid;
                                                this._resultsGrid.startup();
                                                this._resultsGrid.on('.dgrid-row:dblclick', lang.hitch(this, this._onRowClick));
                                             },
                                _onRowClick: function (event)
                                             {
                                               var row = this._resultsGrid.row(event);
                                               var promise = this._management.get({url:"service/structure"});
                                               var that = this;
                                               promise.then(function (data)
                                                            {
                                                              var findObject = function findObject(structure, parent, type)
                                                              {
                                                                  var item = {id:structure.id,
                                                                             name: structure.name,
                                                                             type: type,
                                                                             parent: parent};
                                                                  if (item.id == row.id)
                                                                  {
                                                                    return item;
                                                                  }
                                                                  else
                                                                  {
                                                                      for(var fieldName in structure)
                                                                      {
                                                                          var fieldValue = structure[fieldName];
                                                                          if (lang.isArray(fieldValue))
                                                                          {
                                                                             var fieldType = fieldName.substring(0, fieldName.length - 1);
                                                                             for (var i = 0; i < fieldValue.length; i++)
                                                                             {
                                                                                var object = fieldValue[i];
                                                                                var result = findObject(object, item, fieldType);
                                                                                if (result != null)
                                                                                {
                                                                                    return result;
                                                                                }
                                                                             }
                                                                          }
                                                                      }
                                                                      return null;
                                                                  }
                                                              };

                                                              var item = findObject(data, null, "broker");
                                                              if (item != null)
                                                              {
                                                               that.controller.show(item.type, item.name, item.parent, item.id);
                                                              }
                                                            });
                                             },
                                _getColumns: function(select)
                                             {
                                               var columns = {};
                                               if (select)
                                               {
                                                  var attributes = select.split(",");
                                                  for (var i in attributes)
                                                  {
                                                     var attribute = attributes[i].replace(/^\s+|\s+$/gm,'');
                                                     columns[attribute] = attribute;
                                                  }
                                               }
                                               return columns;
                                             },
                                _createScopeList: function()
                                             {
                                               var that = this;
                                               var result = this._management.query({select: "$parent.name, name, id",
                                                                                   category : "virtualhost",
                                                                                   transformIntoObjects: true});
                                               var deferred = new dojo.Deferred();
                                               result.then(function(data)
                                                           {
                                                             try
                                                             {
                                                               that._scopeDataReceived(data);
                                                             }
                                                             finally
                                                             {
                                                               deferred.resolve(that._searchScopeSelector);
                                                             }
                                                           },
                                                           function(error)
                                                           {
                                                             deferred.reject(null);
                                                             console.error(error.message ? error.message : error);
                                                           });
                                               return deferred.promise;
                                             },
                                _scopeDataReceived: function(data)
                                             {
                                               this._scopeModelObjects = {};
                                               var defaultValue = undefined;
                                               var items = [{id:undefined, name: "Broker"}];
                                               for(var i =0 ; i<data.length;i++)
                                               {
                                                 var name = data[i].name;
                                                 var parentName = data[i]["$parent.name"];
                                                 items.push({id: data[i].id,  name: "VH:" + parentName + "/" + name});
                                                 this._scopeModelObjects[data[i].id] = {name: name,
                                                                                        type: "virtualhost",
                                                                                        parent: {name: parentName,
                                                                                                 type: "virtualhostnode",
                                                                                                 parent: {type: "broker"}
                                                                                                }
                                                                                       };
                                                 if (this.parentModelObj &&
                                                     this.parentModelObj.type == "virtualhost" &&
                                                     this.parentModelObj.name == name &&
                                                     this.parentModelObj.parent &&
                                                     this.parentModelObj.parent.name == parentName)
                                                 {
                                                   defaultValue = data[i].id;
                                                 }
                                               }

                                               var scopeStore = new DstoreAdapter (new Memory({data: items,
                                                                                               idProperty: 'id'}));
                                               this._searchScopeSelector = new dijit.form.FilteringSelect({ name: "scope",
                                                                                                            placeHolder: "Select search scope",
                                                                                                            store: scopeStore,
                                                                                                            value: defaultValue,
                                                                                                            required: false,
                                                                                                            "class": "queryDefaultField"
                                                                                                          },
                                                                                                          this.scope);
                                               this._searchScopeSelector.startup();
                                            },
                                _createCategoryList: function()
                                            {
                                              var categoryStore = new DstoreAdapter(new Memory({idProperty: "id",
                                                                                                data: predefinedCategories}));
                                              var categoryList = new dijit.form.ComboBox({name: "category",
                                                                                          placeHolder: "Select Category",
                                                                                          store: categoryStore,
                                                                                          value: this._category || "queue",
                                                                                          required: true,
                                                                                          invalidMessage: "Invalid category specified",
                                                                                          "class": "queryDefaultField"
                                                                                         },
                                                                                         this.categoryName);
                                              categoryList.startup();
                                              categoryList.on("change", lang.hitch(this, this._categoryChanged));
                                              this._categorySelector = categoryList;
                                            },
                                _categoryChanged: function()
                                            {
                                              var metadata = this._getCategoryMetadata(this._categorySelector.value);
                                              var disableMetadataDependant = !metadata;
                                              this.selectWhereButton.set("disabled", disableMetadataDependant);
                                              this.selectColumnsButton.set("disabled", disableMetadataDependant);
                                              this.searchButton.set("disabled", disableMetadataDependant);
                                              if (disableMetadataDependant)
                                              {
                                                dijit.showTooltip(
                                                  this._categorySelector.get("invalidMessage"),
                                                  this._categorySelector.domNode,
                                                  this._categorySelector.get("tooltipPosition"),
                                                  !this._categorySelector.isLeftToRight()
                                                );
                                              }
                                              else
                                              {
                                                if (this._lastCategory != this._categorySelector.value)
                                                {
                                                  this._standardModeLastWhereExpression = "";
                                                  this._lastCategory = this._categorySelector.value;
                                                  this.selectExpression.set("value", "");
                                                  this.whereExpression.set("value", "");
                                                  this.whereExpressionBuilder.clearWhereCriteria();
                                                  var columns = this._extractFieldsFromMetadata(metadata);
                                                  this.selectColumnsButton.set("data", {items: columns,
                                                                                       idProperty: "id",
                                                                                       selected:[],
                                                                                       nameProperty: "attributeName"});
                                                  this.selectWhereButton.set("data", {items: columns,
                                                                                      selected:[],
                                                                                      idProperty: "id",
                                                                                      nameProperty: "attributeName"});
                                                  this._showResults([], "");
                                                }
                                              }
                                            },
                                _advancedModeKeyPressed:function(evt)
                                            {
                                              var key = evt.keyCode;
                                              if (key == dojo.keys.ENTER && this.selectExpression.value)
                                              {
                                                this.search();
                                              }
                                            },
                                _modeChanged: function()
                                            {
                                              this._standardMode = !this._standardMode
                                              if (!this._standardMode)
                                              {
                                                this.modeButton.set("label", "Standard");
                                                this.modeButton.set("title", "Switch to 'Standard' search");
                                                this.selectExpression.set("disabled", false);
                                                this.whereExpression.set("disabled", false);
                                                this.standardSearch.style.display = "none";
                                                this.whereExpressionBuilder.domNode.style.display = "none";
                                                this.advancedSearch.style.display = "";
                                                if (this._lastSearchQuery &&
                                                     (this._lastSearchQuery.select != this.selectExpression.value ||
                                                      this._lastSearchQuery.where != this.whereExpression.value ||
                                                      this._lastSearchQuery.category != this._categorySelector.value ||
                                                      this._lastSearchQuery.scope != this._searchScopeSelector.value))
                                                {
                                                  this.search();
                                                }
                                              }
                                              else
                                              {
                                                this.modeButton.set("label", "Advanced");
                                                this.modeButton.set("title", "Switch to 'Advanced' search using SQL-like expressions");
                                                this.selectExpression.set("disabled", true);
                                                this.whereExpression.set("disabled", true);
                                                this.standardSearch.style.display = "";
                                                this.whereExpressionBuilder.domNode.style.display = "";
                                                this.advancedSearch.style.display = "none";

                                                if (this._lastSearchQuery &&
                                                     (this._lastSearchQuery.select != this._standardModeLastSelectExpression ||
                                                      this._lastSearchQuery.where != this._standardModeLastWhereExpression ||
                                                      this._lastSearchQuery.category != this._categorySelector.value ||
                                                      this._lastSearchQuery.scope != this._searchScopeSelector.value))
                                                {
                                                  this.search();
                                                }
                                              }
                                            },
                                _getCategoryMetadata: function(value)
                                            {
                                              if (value)
                                              {
                                                var category = value.charAt(0).toUpperCase() + value.substring(1);
                                                return this._management.metadata.metadata[category];
                                              }
                                              else
                                              {
                                                return undefined;
                                              }
                                            },
                                _extractFieldsFromMetadata: function(metadata)
                                            {
                                              var columns = [];
                                              var helper = {};
                                              var validTypes = [];
                                              var typeAttribute = null;
                                              for(var i in metadata)
                                              {
                                                validTypes.push(i);
                                                var categoryType = metadata[i];
                                                var attributes = categoryType.attributes;
                                                for(var name in attributes)
                                                {
                                                  var attribute = attributes[name];
                                                  if (!(name in helper))
                                                  {
                                                    helper[name] = true;
                                                    var attributeData = {id: name,
                                                                         attributeName: name,
                                                                         type: attribute.type,
                                                                         validValues: attribute.validValues,
                                                                         description: attribute.description,
                                                                         columnType: "attribute"};
                                                    if (name === "type")
                                                    {
                                                      typeAttribute = attributeData;
                                                    }
                                                    columns.push(attributeData );
                                                  }
                                                }

                                                var statistics = categoryType.statistics;
                                                for(var name in statistics)
                                                {
                                                  var statistic = statistics[name];
                                                  if (!(name in helper))
                                                  {
                                                    helper[name] = true;
                                                    columns.push( {id: name,
                                                                   attributeName: name,
                                                                   type: statistic.type,
                                                                   description: statistic.description,
                                                                   columnType: "statistics"});
                                                  }
                                                }
                                              }
                                              if (typeAttribute != null && !typeAttribute.validValues)
                                              {
                                                typeAttribute.validValues = validTypes;
                                              }
                                              return columns;
                                            }
                            });
        });