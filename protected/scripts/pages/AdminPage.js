function AdminPage() {
    this._containerSelector = '#usersTreeContainer';
    this.createButton = $("#createUserButton");
    this._treeReference = null;
    this._treeNodeHelper = new TreeNodeHelper();
    this._contextMenu = new TreeContextMenu();
    this.data = null;
    this._bindEvents();
}


AdminPage.prototype._bindEvents = function () {
    this.createButton.on("click", this.showCreateUser.bind(this));
    $("#userTypeSelect").on("change", function () {
        if (this.value == "user") {
            $("#register-organizations").show();
        } else {
            $("#register-organizations").hide();
        }
    });

    var addButton = $("#register-organizations-add");

    function addOrganization(count) {
        var value = $("#register-organizations-select").val();
        var name = $("#register-organizations-select option[value=" + value + "]").text();
        $("#register-organizations-select option[value=" + value + "]").attr('disabled', 'disabled');

        var row = $('<div class="form-inline organizationRow"></div>');
        row.append('<label class="checkbox-inline">' + name + '</label');
        row.append('<label class="checkbox-inline"><input type="checkbox" name="' + value + '" value="read">Read</label><label class="checkbox-inline"><input type="checkbox" name="' + value + '" value="upload">Upload</label><label class="checkbox-inline"><input type="checkbox" name="' + value + '" value="edit">Edit</label>');

        var btn = $('<span class="glyphicon glyphicon-remove deleteRowButton"></span>');
        btn.on("click", function () {
            this.parentElement.remove();
            $("#register-organizations-select option[value=" + value + "]").removeAttr('disabled');
            if ($("#register-organizations-list").children().length < count) {
                addButton.removeClass("disabled");
            }
        });

        row.append(btn);
        $("#register-organizations-list").append(row);

        if ($("#register-organizations-list").children().length == count) {
            addButton.addClass("disabled");
        }
        $('#register-organizations-select').children('option:enabled').eq(0).prop('selected', true);
    }

    TOTEM.model.getOrganizations(function (orgs) {
        var count = Object.keys(orgs).length;
        var organizationSelect = $('#register-organizations-select');
        for (var i in orgs) {
            organizationSelect.append('<option value="' + orgs[i]._id + '">' + orgs[i].name + '</option>')
        }

        addButton.on("click", addOrganization.bind(this, count));
    }.bind(this));


    $("#register-form").submit(function (e) {
        var elementId = "#register-form";
        e.preventDefault();
        var data = $(elementId + " :input").serializeArray();
        this.createUser(data);
    }.bind(this));
};

AdminPage.prototype.update = function () {
    this.updateView();

    TOTEM.model.getUsers(function (users) {
        this.data = {
            "admins": {},
            "users": {}
        };

        if (users) {
            for (var i in users) {
                if (users[i].isAdmin) {
                    this.data["admins"][users[i]._id] = users[i];
                } else {
                    this.data["users"][users[i]._id] = users[i];
                }
            }
        }
        this.removeExistingTree();
        this._initializeTree();
    }.bind(this));
}

AdminPage.prototype.updateView = function () {
    var userContainer = $('#userContainer');
    userContainer.empty();
}

AdminPage.prototype.removeExistingTree = function () {
    this._treeReference = null;
    $(this._containerSelector).jstree('destroy')
}

AdminPage.prototype._sortFunction = function (a, b) {
    return (a.username > b.username) ? 1 : -1;
};

AdminPage.prototype._initializeTree = function () {
    $(this._containerSelector).outerHeight($('#leftContainerUsers').height() - $('#createUserButton').height());

    var that = this;

    var tree = {
        'core': {
            'multiple': false,
            'animation': 0,
            'check_callback': function (operation, node, parent, position, more) {
                if (operation === 'move_node') {
                    return false;
                }

                return true;
            },
            'worker': false,
            'data': this._loadTreeNode.bind(this)
        },
        'types': {
            '#': {
                'valid_children': ['role']
            },
            'role': {
                'valid_children': ['user']
            },
            'user': {
                'valid_children': []
            }
        },
        'contextmenu': {
            'items': this._contextMenu.adminContextMenu.bind(this._contextMenu),
            select_node: false
        },
        'sort': this._sortFunction.bind(this),
        'plugins': ['contextmenu', 'types', 'wholerow', 'sort']
    };

    $(this._containerSelector).jstree(tree);
    this._treeReference = $(this._containerSelector).jstree(true);

    this._bindTreeEvents();
}

AdminPage.prototype._loadTreeNode = function (node, callback) {
    if (node.id === '#') {
        callback(this._loadRootNode());
    } else if (node.type === 'role') {
        callback(this._loadUserNode(node.id));
    }
}

AdminPage.prototype._loadRootNode = function () {
    var childrenToAdd = [];

    var adminsNode = {
        id: "admins",
        text: "Admins",
        type: 'role',
        children: true,
        state: {
            opened: true,
            checkbox_disabled: true
        }
    };

    var usersNode = {
        id: "users",
        text: "Users",
        type: 'role',
        children: true,
        state: {
            opened: true,
            checkbox_disabled: true
        }
    };

    childrenToAdd.push(adminsNode);
    childrenToAdd.push(usersNode);
    return childrenToAdd;
}

AdminPage.prototype._loadUserNode = function (roleId) {
    var childrenToAdd = [];

    for (var userId in this.data[roleId]) {
        childrenToAdd.push(this._treeNodeHelper.createUserNode(this.data[roleId][userId]));
    }

    return childrenToAdd;
}

AdminPage.prototype._bindTreeEvents = function () {
    this._onTreeNodeSelected = function (evt, data) {
        this._selectedId = data.node.id;
        switch (data.node.type) {
            case 'user':
                this._onUserSelected(data.node.id);
                break;
            default:
                break;
        }
    }.bind(this);

    $(this._containerSelector).on("select_node.jstree", this._onTreeNodeSelected);
}

AdminPage.prototype._addNewNode = function (parentNode, newNode, select, edit) {
    var newlyCreatedNode = this._treeReference.create_node(parentNode, newNode);

    if (select === true) {
        this._treeReference.deselect_all();
        this._treeReference.select_node(newlyCreatedNode);
    }

    if (edit === true) {
        this._treeReference.open_node(newlyCreatedNode);
        this._treeReference.edit(newlyCreatedNode);
    }
}

AdminPage.prototype._onUserSelected = function (userId) {
    TOTEM.model.getUser(userId, function (user) {
        this.updateView();

        var panel = $('<div class="panel panel-default" id="panel-' + userId + '"></div>').appendTo(userContainer);
        var panelBody = $('<div id="user-edit" class="panel-body customScrollbar">' + +'</div>').appendTo(panel);

        $('<p><b>Name:</b> ' + user.username + '</p>').appendTo(panelBody);
        $('<p><b>Email:</b> ' + user.email + '</p>').appendTo(panelBody);
        $('<p><b>Activated:</b> ' + user.activated + '</p>').appendTo(panelBody);

        var organizationContainer = $('<div></div>');
        var role = $('<p class="form-inline"><b>Role:</b></p>');
        if (user.isMaster) {
            role.append(" Master Admin");
        } else if (user.isAdmin && TOTEM.model.userPermissions.master != true) {
            role.append(" Admin");
        } else {
            var roleSelect = $('<select name="type" class="form-control"><option value="admin">Admin</option><option value="user">User</option></select>');
            roleSelect.val((user.isAdmin ? 'admin' : 'user'));
            roleSelect.appendTo(role);
            roleSelect.on("change", function () {
                if (this.value == "user") {
                    organizationContainer.show();
                } else {
                    organizationContainer.hide();
                }
            })
        }
        role.appendTo(panelBody);

        organizationContainer.appendTo(panelBody);

        if (user.isAdmin) {
            organizationContainer.hide();
        } else {
            organizationContainer.show();
        }

        $('<p><b>Organizations:</b></p>').appendTo(organizationContainer);

        var organizationList = $('<div></div>');
        var organizations = $('<div class="form-inline organizationRow"></div>');
        var organizationSelect = $('<select class="form-control"></select>');
        var addButton = $('<span class="glyphicon glyphicon-plus-sign addRowButton"></span>');
        organizations.append(organizationSelect);
        organizations.append(addButton);
        organizations.appendTo(organizationContainer);
        organizationList.appendTo(organizationContainer);

        function addOrganization(count) {
            var value = organizationSelect.val();
            var name = organizationSelect.find("option[value=" + value + "]").text();
            organizationSelect.find("option[value=" + value + "]").attr('disabled', 'disabled');

            var row = $('<div class="form-inline organizationRow"></div>');
            row.append('<label class="checkbox-inline">' + name + '</label');
            row.append('<label class="checkbox-inline"><input type="checkbox" name="' + value + '" value="read">Read</label><label class="checkbox-inline"><input type="checkbox" name="' + value + '" value="upload">Upload</label><label class="checkbox-inline"><input type="checkbox" name="' + value + '" value="edit">Edit</label>');

            var btn = $('<span class="glyphicon glyphicon-remove deleteRowButton"></span>');
            btn.on("click", function () {
                this.parentElement.remove();
                organizationSelect.find("option[value=" + value + "]").removeAttr('disabled');
                if (organizationList.children().length < count) {
                    addButton.removeClass("disabled");
                }
            });

            row.append(btn);
            organizationList.append(row);

            if (organizationList.children().length == count) {
                addButton.addClass("disabled");
            }
            organizationSelect.children('option:enabled').eq(0).prop('selected', true);
        }

        TOTEM.model.getOrganizations(function (orgs) {
            var count = Object.keys(orgs).length;
            for (var i in orgs) {
                if (user.organizations[i]) {
                    organizationSelect.append('<option value="' + orgs[i]._id + '" disabled="disabled">' + orgs[i].name + '</option>')
                } else {
                    organizationSelect.append('<option value="' + orgs[i]._id + '">' + orgs[i].name + '</option>')
                }
            }

            addButton.on("click", addOrganization.bind(this, count));

            for (var i in user.organizations) {
                if (!orgs[i]) {
                    continue;
                }
                var name = orgs[i].name;
                var value = i;
                var row = $('<div class="form-inline organizationRow"></div>');
                row.append('<label class="checkbox-inline">' + name + '</label');
                var upload = (user.organizations[i].upload ? 'checked' : '');
                var edit = (user.organizations[i].edit ? 'checked' : '');

                row.append('<label class="checkbox-inline"><input type="checkbox" checked name="' + value + '" value="read">Read</label>'
                    + '<label class="checkbox-inline"><input type="checkbox" ' + upload + ' name="' + value + '" value="upload">Upload</label>'
                    + '<label class="checkbox-inline"><input type="checkbox" ' + edit + ' name="' + value + '" value="edit">Edit</label>');

                var btn = $('<span class="glyphicon glyphicon-remove deleteRowButton"></span>');
                btn.on("click", function () {
                    this.parentElement.remove();
                    organizationSelect.find("option[value=" + value + "]").removeAttr('disabled');
                    if (organizationList.children().length < count) {
                        addButton.removeClass("disabled");
                    }
                });

                row.append(btn);
                organizationList.append(row);

                if (organizationList.children().length == count) {
                    addButton.addClass("disabled");
                }
                organizationSelect.children('option:enabled').eq(0).prop('selected', true);
            }

            if ((!user.isMaster && TOTEM.model.userPermissions.master == true) || !user.isAdmin) {
                var saveButton = $('<input type="button" name="save-changes" class="btn btn-primary" value="Save Changes">');
                saveButton.appendTo(panelBody);

                saveButton.click(function (e) {
                    var result = confirm("Are you sure you want to Save the Changes to this User?");
                    if (result) {
                        var elementId = "#user-edit";
                        var data = $(elementId + " :input").serializeArray();
                        this.updateUser(user._id, data);
                    } else {
                        return;
                    }
                }.bind(this));
            }
        }.bind(this));
    }.bind(this));
};

AdminPage.prototype.showCreateUser = function (roleType) {
    if (roleType == "admins") {
        $("#userTypeSelect").val("admin");
        $("#register-organizations").hide();
    } else if (roleType == "users") {
        $("#userTypeSelect").val("user");
        $("#register-organizations").show();
    }
    $("#createUserModal").modal('show');
};

AdminPage.prototype.createUser = function (data) {
    var dataObject = {};
    dataObject.organizations = {};

    for (var i = 0; i < data.length; i++) {
        if (data[i]['value'] == "read" || data[i]['value'] == "upload" || data[i]['value'] == "edit") {
            if (!dataObject.organizations[data[i]['name']]) {
                dataObject.organizations[data[i]['name']] = {};
            }
            dataObject.organizations[data[i]['name']][data[i]['value']] = true;
        } else {
            dataObject[data[i]['name']] = data[i]['value'];
        }
    }

    if (dataObject["password"].length < 6) {
        alert('Please select a password longer than 6 characters.');
        return;
    }
    if (dataObject["password"] != dataObject["confirm-password"]) {
        alert('Entered passwords do not match.');
        return;
    }

    dataObject.isAdmin = false;
    if (dataObject["type"] == "admin") {
        dataObject.isAdmin = true;
        dataObject.organizations = {};
    } else {
        if (Object.keys(dataObject.organizations).length == 0) {
            alert('Please add at least 1 Organization to the User.');
            return;
        }
    }

    delete dataObject["type"];
    delete dataObject["confirm-password"];

    TOTEM.model.createUser(dataObject, function (data) {
        if (data.isAdmin) {
            this.data["admins"][data._id] = data;
            var rootNode = this._treeReference.get_node('admins');
        } else {
            this.data["users"][data._id] = data;
            var rootNode = this._treeReference.get_node('users');
        }

        var userNode = this._treeNodeHelper.createUserNode(data);
        this._addNewNode(rootNode, userNode, true, false);
        $("#createUserModal").modal('hide');
    }.bind(this));
};

AdminPage.prototype.updateUser = function (id, data) {
    var dataObject = {};
    dataObject.organizations = {};

    for (var i = 0; i < data.length; i++) {
        if (data[i]['value'] == "read" || data[i]['value'] == "upload" || data[i]['value'] == "edit") {
            if (!dataObject.organizations[data[i]['name']]) {
                dataObject.organizations[data[i]['name']] = {};
            }
            dataObject.organizations[data[i]['name']][data[i]['value']] = true;
        } else {
            dataObject[data[i]['name']] = data[i]['value'];
        }
    }

    dataObject.isAdmin = false;
    if (dataObject["type"] == "admin") {
        dataObject.isAdmin = true;
        dataObject.organizations = {};
    } else {
        if (Object.keys(dataObject.organizations).length == 0) {
            alert('Please add at least 1 Organization to the User.');
            return;
        }
    }

    delete dataObject["type"];

    TOTEM.model.updateUser(id, dataObject, function (user) {
        if (user) {
            if (user.isAdmin) {
                this.data["admins"][user._id] = user;
                var rootNode = this._treeReference.get_node('admins');
            } else {
                this.data["users"][user._id] = user;
                var rootNode = this._treeReference.get_node('users');
            }

            this._deselect(user._id);
            this._treeReference.delete_node(user._id);
            var userNode = this._treeNodeHelper.createUserNode(user);
            this._addNewNode(rootNode, userNode, true, false);
        }
    }.bind(this));
};

AdminPage.prototype.deleteUser = function (userId) {
    var result = confirm("Are you sure you want to Delete this User?");
    if (result) {
        TOTEM.model.deleteUser(userId, function () {
            this._deselect(userId);
            this._treeReference.delete_node(userId);
        }.bind(this));
    } else {
        return;
    }
};

AdminPage.prototype._deselect = function (id) {
    if (this._selectedId == id) {
        this.updateView();
        this._selectedId = null;
    }
};