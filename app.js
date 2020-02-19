// Global attributes
var app = new Vue({
    data: {
        url: '',
        portal: '',
        token: '',
        search: {
            type: '',
            filter: '',
            query: '',
            start: 0,
            table: null,
            csvData: []
        },
        api: {
            map: null,
            view: null,
            basemap: null,
            basemapGallery: null,
            basemapExpand: null,
            legend: null
        }
    },
    beforeCreate() {
            // Load components
            new Vue({
                el: '#components',
                components: {
                    'navbar': httpVueLoader('components/navbar.vue'),
                    'loader': httpVueLoader('components/loader.vue'),
                    'search': httpVueLoader('components/search.vue'),
                    'group': httpVueLoader('components/group.vue'),
                    'user': httpVueLoader('components/user.vue'),
                    'item': httpVueLoader('components/item.vue'),
                    'preview': httpVueLoader('components/preview.vue'),
                    'publish': httpVueLoader('components/publish.vue'),
                    'paginate': httpVueLoader('components/paginate.vue'),
                    'datatable': httpVueLoader('components/datatable.vue')
                }
            });
    },
    created() {
        // Read config.json
        setTimeout(function() { 

            $.getJSON('config.json', function(data, status) {

                console.log('[' + status.toUpperCase() + '] config.json loaded:', data);

                $('title').html(data.name);

                $('meta[name="description"]').attr('content', data.description);
                $('meta[name="author"]').attr('content', data.author);

                $('link[rel="canonical"]').attr('href', data.url);
                $('link[rel="author"]').attr('href', data.publisher);
                $('link[rel="publisher"]').attr('href', data.publisher);

                $('#group').html(data.name);
                $('#version').html('v' + data.version);
                $('#version').attr('href', 'https://gitlab.com/fstroff/arcgis-portal-search/tree/v' + data.version);
                $('#version').attr('target', '_blank');

                // Init main modal
                $('#searchModal').modal({
                    backdrop: 'static', 
                    keyboard: false
                });

                // Update modals to responsive
                $('#searchModal').modal('handleUpdate');
                $('#groupModal').modal('handleUpdate');
                $('#userModal').modal('handleUpdate');
                $('#itemModal').modal('handleUpdate');
                $('#publishModal').modal('handleUpdate');
                $('#mapModal').modal('handleUpdate');

                // Init tooltip
                $('body').tooltip({selector: '[data-toggle="tooltip"]'});

            }).fail(function(e) {
                
                var error = {
                    name: e.status,
                    message: 'Erro ao ler arquivo de configuração'
                };

                logError(error);
            });
        }, 500);
    }
});

function search(e) {

    e.preventDefault();

    var urlInput = document.getElementById('urlInput').value;
    var query = document.getElementById('query').value;

    if (urlInput !== '') {

        var url = new URL(urlInput);

        app.url = url.origin;
        app.portal = url.href;

        if (app.search.type === 'groups') {

            if (app.search.filter === 'id') {
                searchGroupById(query);
            }
            else {
                searchGroupByName(query);
            }
        }
        else if (app.search.type === 'users') {
            searchUser(query);
        }
        else if (app.search.type === 'content') {
            searchContent(query);
        }
    }
}

function resetSearch() {
    document.getElementById('formSearch').reset();
    $('#filters').hide();
}

function generateToken(username, password) {

    require(['esri/request'], function(esriRequest) {

        var data = new FormData();

        data.append('username', username);
        data.append('password', password);
        data.append('client', 'requestip');
        data.append('f', 'pjson');

        var options = {
            responseType: 'json',
            body: data
        };

        esriRequest(app.portal + '/sharing/rest/generateToken', options).then(function(response) {

            app.token = response.data.token;

            console.info('[TOKEN]:', app.token);
        })
        .catch((e) => {
            logError(e);
        });
    });
}

function setSearchType(type) {

    app.search.type = type.value;

    document.getElementById('groupID').removeAttribute('required');

    $('#filters').hide(500);

    if (type.value === 'groups') {

        document.getElementById('groupID').setAttribute('required', true);

        $('#filters').show(500);
    }
}

function searchGroupById(id) {

    require(['esri/request', 'esri/config'], function (esriRequest, esriConfig) {

        var server = app.url.replace(/^https?\:\/\//i, '');
        var navContent = document.getElementById('navigation');
        var groupContent = document.getElementById('group');
        var userContent = document.getElementById('user');

        esriConfig.request.trustedServers.push(server);
        esriConfig.portalUrl = app.portal;

        app.search.query = id;

        $('#searchModal').modal('hide');
        $('#loader').show();

        var options = {
            query: {
                f: 'pjson'
            }
        };

        esriRequest(app.portal + '/sharing/rest/community/groups/' + id, options).then(function (group) {

            var username = group.data.userMembership ? group.data.userMembership.username : '';

            if (username !== '') {

                var data = new FormData();
                var password = document.getElementById('dijit_form_ValidationTextBox_1').value;

                data.append('username', username);
                data.append('password', password);
                data.append('client', 'requestip');
                data.append('f', 'json');

                options = {
                    query: {
                        f: 'pjson',
                    },
                    body: data
                };

                generateToken(username, password);

                userContent.innerHTML = username;
            }
            else {
                userContent.innerHTML = 'Anônimo';
            }

            groupContent.innerHTML = '<i class="fas fa-search"></i> ' + group.data.title + ' (' + app.portal + ')';
            groupContent.href = app.portal;
            groupContent.target = '_blank';

            esriRequest(app.portal + '/sharing/rest/content/groups/' + id, options).then(function (response) {

                $('.navbar-nav').show();

                var itens = response.data.items;

                if (itens.length) {

                    toastr.clear();

                    if (group.data.thumbnail) {

                        var icon = app.portal + '/sharing/rest/community/groups/' + group.data.id + '/info/' + group.data.thumbnail + '?token=' + app.token;
                        
                        navContent.style.backgroundImage = 'url(' + icon + ')';
                        groupContent.style.paddingLeft = '50px';
                    }
    
                    createItens(itens);
    
                    $('#loader').hide();
    
                    toastr.success('', itens.length + ' itens encontrados');
                }
                else {
                    logInfo('Nenhum resultado obtido', true);
                }
            }).catch((e) => {
                logError(e);
            });
        }).catch((e) => {   
            logError(e, true);
        });
    });
}

function searchGroupByName(name) {

    require(['esri/request', 'esri/config'], function (esriRequest, esriConfig) {

        var server = app.url.replace(/^https?\:\/\//i, '');
        var navContent = document.getElementById('navigation');
        var groupContent = document.getElementById('group');
        var userContent = document.getElementById('user');

        esriConfig.request.trustedServers.push(server);
        esriConfig.portalUrl = app.portal;

        app.search.query = name;

        $('#searchModal').modal('hide');
        $('#loader').show();

        var options = {
            query: {
                f: 'pjson',
                q: name,
            }
        };

        esriRequest(app.portal + '/sharing/rest/community/groups', options).then(function (result) {

            $('#loader').hide();

            if (result.data.results.length) {

                var groups = result.data.results;

                options = {
                    query: {
                        f: 'pjson',
                    }
                };

                toastr.clear();

                groups.forEach(function(group, i) {

                    $('#groupModal .modal-body').append(
                        '<div class="custom-control custom-radio custom-control-inline">' +
                            '<input class="custom-control-input" type="radio" name="groupSelect" id="groupSelect_' + i + '" value="' + group.id + '">' +
                            '<label class="custom-control-label" for="groupSelect_' + i + '">' + group.title + ' (<a href="' + app.portal + '/home/user.html?user=' + group.owner + '" target="_blank">' + group.owner + '</a>)</label>' + 
                        '</div>'
                    );

                    $('#groupSelect_' + i).click(function() {

                        $('#groupModal').modal('hide');
                        $('#loader').show();

                        esriRequest(app.portal + '/sharing/rest/content/groups/' + group.id, options).then(function (response) {

                            var itens = response.data.items;

                            groupContent.innerHTML = '<i class="fas fa-search"></i> ' + group.title + ' (' + app.portal + ')';
                            groupContent.href = app.portal;
                            groupContent.target = '_blank';
                            userContent.innerHTML = 'Anônimo';

                            if (group.thumbnail) {   
                                navContent.style.backgroundImage = 'url(' + app.portal + '/sharing/rest/community/groups/' + group.id + '/info/' + group.thumbnail + ')';
                                groupContent.style.paddingLeft = '50px';
                            }

                            $('.navbar-nav').show();

                            createItens(itens);

                            $('#loader').hide();

                            toastr.clear();
                            toastr.success('', itens.length + ' itens encontrados');

                        }).catch((e) => {
                            logError(e);
                        });
                    });
                });

                $('#groupModal').modal({
                    backdrop: 'static', 
                    keyboard: false
                });
            }
            else {
                logInfo('Nenhum resultado obtido', true);
            }
        }).catch((e) => {    
            logError(e, true);
        });
    });
}

function searchUser(query) {

    require(['esri/request', 'esri/config', 'esri/portal/Portal'], function (esriRequest, esriConfig, Portal) {

        var portal = new Portal({
            url: app.portal,
        });

        var server = app.url.replace(/^https?\:\/\//i, '');
        var groupContent = document.getElementById('group');
        var userContent = document.getElementById('user');

        esriConfig.request.trustedServers.push(server);
        esriConfig.portalUrl = app.portal;

        app.search.query = query;

        groupContent.innerHTML = '<i class="fas fa-search"></i> ' + query + ' (' + app.portal + ')';
        groupContent.href = app.portal;
        groupContent.target = '_blank';

        $('#searchModal').modal('hide');
        $('#loader').show();

        var options = {
            query: {
                f: 'pjson',
                q: query,
                sortField: 'modified',
                sortOrder: 'desc',
                num: 100
            }
        };

        esriRequest(app.portal + '/sharing/rest/community/users', options).then(function (result) {

            $('#loader').hide();

            if (result.data.results.length) {

                var usernameInput = document.getElementById('dijit_form_ValidationTextBox_0');
                var username = usernameInput ? usernameInput.value : '';
                var users = result.data.results;

                if (username !== '') {

                    var data = new FormData();
                    var password = document.getElementById('dijit_form_ValidationTextBox_1').value;

                    data.append('username', username);
                    data.append('password', password);
                    data.append('client', 'requestip');
                    data.append('f', 'json');

                    options = {
                        query: {
                            f: 'pjson',
                        },
                        body: data
                    };

                    generateToken(username, password);

                    userContent.innerHTML = username;
                }
                else {

                    options = {
                        query: {
                            f: 'pjson',
                        }
                    };

                    userContent.innerHTML = 'Anônimo';
                }     

                users.forEach(function(user, i) {

                    var queryParameters = {
                        query: "username:" + user.username
                    };

                    portal.queryUsers(queryParameters).then(function(queryResults) {
                        var userThumb = queryResults.results[0].thumbnailUrl;

                        if (userThumb) {
                            var navContent = document.getElementById('navigation');

                            navContent.style.backgroundImage = 'url(' + userThumb + ')';
                            groupContent.style.paddingLeft = '50px';
                        }
                        else {
                            userThumb = './images/no-user-thumb.jpg';
                        }

                        $('#userModal .modal-body').append(
                            '<div class="custom-control custom-radio custom-control-inline">' +
                                '<img src="' + userThumb + '" class="thumb">' +
                                '<input class="custom-control-input" type="radio" name="userSelect" id="userSelect_' + i + '" value="' + user.id + '">' +                    
                                '<label class="custom-control-label" for="userSelect_' + i + '">' + user.fullName + ' (<a href="' + app.portal + '/home/user.html?user=' + user.username + '" target="_blank">' + user.username + '</a>)</label>' + 
                            '</div>'
                        );

                        $('#userSelect_' + i).click(function() {

                            $('#userModal').modal('hide');
                            $('#loader').show();
    
                            esriRequest(app.portal + '/sharing/rest/content/users/' + user.username, options).then(function (response) {
    
                                $('#loader').hide();
                                $('.navbar-nav').show();
    
                                var itens = response.data.items;
                                var folders = response.data.folders;
    
                                if (itens.length + folders.length) {
                                
                                    if (itens.length) {
    
                                        $('#itemModal .modal-body').append(
                                            '<div class="custom-control custom-radio custom-control-inline">' +
                                                '<input class="custom-control-input" type="radio" name="itemSelect" id="itemSelect">' +
                                                '<label class="custom-control-label" for="itemSelect">itens</label>' + 
                                            '</div>'
                                        );
    
                                        $('#itemSelect').click(function() {
    
                                            createItens(itens);
            
                                            $('#itemModal').modal('hide');
                            
                                            toastr.clear();
                                            toastr.success('', itens.length + ' itens encontrados');
                                        });
                                    }
                                    
                                    if (folders.length) {
    
                                        $('#itemModal .modal-body').append(
                                            '<fieldset>' +
                                                '<legend class="text-center">Pastas</legend>' +
                                            '</fieldset>'
                                        );
    
                                        folders.forEach(function(folder, i) {
    
                                            $('#itemModal .modal-body fieldset').append(
                                                '<div class="custom-control custom-radio custom-control-inline">' +
                                                    '<input class="custom-control-input" type="radio" name="folderSelect" id="folderSelect_' + i + '" value="' + folder.id + '">' +
                                                    '<label class="custom-control-label" for="folderSelect_' + i + '">' + folder.title + '</label>' + 
                                                '</div>'
                                            );
    
                                            $('#folderSelect_' + i).click(function() {
    
                                                $('#itemModal').modal('hide');
                                                $('#loader').show();
    
                                                esriRequest(app.portal + '/sharing/rest/content/users/' + user.username + '/' + folder.id, options).then(function (response) {
    
                                                    itens = response.data.items;
    
                                                    if (itens.length) {
    
                                                        createItens(itens);
            
                                                        $('#loader').hide();
                                        
                                                        toastr.clear();
                                                        toastr.success('', itens.length + ' itens encontrados');
                                                    }
                                                    else {
                                                        logInfo('Nenhum resultado obtido');
                                                    }
                                                }).catch((e) => {
                                                    logError(e);
                                                });
                                            });
                                        });
                                    }
                                    
                                    $('#itemModal').modal({
                                        backdrop: 'static', 
                                        keyboard: false
                                    });
                                }
                                else {
    
                                    logInfo('Nenhum resultado obtido');
    
                                    setTimeout(function() { 
    
                                        $('#userModal').modal('show');
                            
                                    }, 500);
                                }
    
                            }).catch((e) => {
                                logError(e);
                            });
                        });
                    });
                });

                $('#userModal').modal({
                    backdrop: 'static', 
                    keyboard: false
                });
            }
            else {
                logInfo('Nenhum resultado obtido', true);
            }
        }).catch((e) => {
            logError(e, true);
        });
    });
}

function searchContent(query) {

    require(['esri/request', 'esri/config'], function (esriRequest, esriConfig) {

        var server = app.url.replace(/^https?\:\/\//i, ''),
            groupContent = document.getElementById('group'),
            userContent = document.getElementById('user');

        esriConfig.request.trustedServers.push(server);
        esriConfig.portalUrl = app.portal;

        app.search.query = query;

        groupContent.innerHTML = '<i class="fas fa-search"></i> ' + query + ' (' + app.portal + ')';
        groupContent.href = app.portal;
        groupContent.target = '_blank';

        userContent.innerHTML = 'Anônimo';

        $('#searchModal').modal('hide');
        $('#loader').show();

        var options = {
            query: {
                f: 'pjson',
                q: query,
                sortField: 'modified',
                sortOrder: 'desc',
                num: 100
            }
        };

        esriRequest(app.portal + '/sharing/rest/search', options).then(function (response) {

            $('.navbar-nav').show();

            var itens = response.data.results;

            total = response.data.total;
            app.search.start = response.data.nextStart;

            if (itens.length) {

                toastr.clear();

                createItens(itens);

                $('#loader').hide();

                if (total > 100) {
                    $('#paginateBtns').show();
                }

                toastr.success('', itens.length + ' itens encontrados de ' + total);
            }
            else {
                logInfo('Nenhum resultado obtido', true);
            }
        }).catch((e) => {
            logError(e, true);
        });
    });
}

function paginateContent() {

    require(['esri/request', 'esri/config'], function (esriRequest) {

        $('#table').DataTable().destroy();
        $('#table').empty();
        $('#loader').show();

        var options = {
            query: {
                f: 'pjson',
                q: app.search.query,
                sortField: 'modified',
                sortOrder: 'desc',
                num: 100,
                start: app.search.start
            }
        };

        esriRequest(app.portal + '/sharing/rest/search', options).then(function (response) {

            var itens = response.data.results;

            app.search.start = response.data.nextStart;

            if (itens.length) {

                toastr.clear();

                createItens(itens);

                $('#loader').hide();

                toastr.success('', itens.length + ' itens encontrados');
            }
            else {
                logInfo('Nenhum resultado obtido');
            }
        });
    });
}

function createItens(itens) {

    var data = [];
    var columns = [
        // ID
        {
            visible: false,
            searchable: false,
            orderable: false
        },
        // URL
        {
            visible: false,
            searchable: false,
            orderable: false
        },
        // Thumbnail
        {
            className: 'text-center vertical-align-middle width-5',
            searchable: false,
            orderable: false
        },
        // Title
        {
            title: 'Nome',
            className: 'vertical-align-middle width-75'
        },
        // Type
        {
            title: 'Tipo',
            className: 'text-center vertical-align-middle width-15',
        },
        // Description
        {
            visible: false
        },
        // Profile
        {
            visible: false
        },
        // Tags
        {
            visible: false
        },
        // Action
        {
            className: 'details-control width-5',
            orderable: false,
            data: null,
            defaultContent: ''
        }
    ];

    app.search.csvData = [];

    itens.forEach(function(item) {

        var rows = [];
        var downloadedRows = [];
        var thumbnail;

        if (item.thumbnail) {

            if (app.token) {
                thumbnail = '<img src="' + app.portal + '/sharing/rest/content/items/' + item.id + '/info/' + item.thumbnail + '?token=' + app.token + '" class="img-thumbnail img-item">';
            }
            else {
                thumbnail = '<img src="' + app.portal + '/sharing/rest/content/items/' + item.id + '/info/' + item.thumbnail + '" class="img-thumbnail img-item">';
            }
        }
        else {
            thumbnail = '<img src="images/default.jpg" class="img-thumbnail img-item">';
        }

        rows.push(item.id);
        rows.push(item.url);
        rows.push(thumbnail);
        rows.push(item.title);
        rows.push(item.type);
        rows.push(item.description);
        rows.push(item.owner);
        rows.push(item.tags);

        data.push(rows);

        downloadedRows.push(item.id);
        downloadedRows.push(item.title);
        downloadedRows.push(item.type);
        downloadedRows.push(item.owner);
        downloadedRows.push(item.url);

        app.search.csvData.push(downloadedRows);
    });

    app.search.table = createDataTable(columns, data);
        
    createContextMenu();
}

function createDataTable(columns, data) {

    var table = $('#table').DataTable({
        'lengthMenu': [[10, 50, 100, -1], [10, 50, 100, 'Tudo']],
        'language': {
            'lengthMenu': 'Mostrar _MENU_ registros/página',
            'zeroRecords': 'Nada encontrado',
            'info': 'Página _PAGE_ de _PAGES_',
            'infoEmpty': 'Nenhum registro encontrado',
            'infoFiltered': '(filtrado de _MAX_ registros)',
            'search': '',
            'paginate': {
                'next': '→',
                'previous': '←'
            },
            'searchPlaceholder': 'Pesquisar...',
        },
        'order': [],
        'columns': columns,
        'data': data,
        responsive: true,
        autoWidth: true,
    });

    $('#table tbody').on('click', 'td.details-control', function() {

        var tr = $(this).closest('tr');
        var row = table.row(tr);
 
        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            row.child(format(row.data())).show();
            tr.addClass('shown');
        }
    });

    return table;
}

function format(data) {

    var description = data[5] ? data[5] : 'Uma descrição detalhada do item não está disponível.';
    var owner = data[6];
    var tags = data[7];
    var tagsContent = [];

    tags.forEach(function(tag) {
        tagsContent.push(
            ' <a href="' + app.portal + '/home/search.html?t=content&q=tags:' + tag + '" target="_blank">' + tag + '</a>'
        );
    });

    var table = 
    '<table class="table table-hidden" style="width: 100%;">'+
        '<tr>'+
            '<td style="width: 10%; vertical-align: middle;">Descrição:</td>'+
            '<td style="width: 90%;"><small class="text-muted">' + description + '</small></td>'+
        '</tr>'+
        '<tr>'+
            '<td style="width: 10%; vertical-align: middle;">Proprietário(a):</td>'+
            '<td style="width: 90%;"><a href="' + app.portal + '/home/user.html?user=' + owner + '" target="_blank">' + owner + '</a></td>'+
        '</tr>'+
        '<tr>'+
            '<td style="width: 10%; vertical-align: middle;">Tags:</td>'+
            '<td style="width: 90%;">' + tagsContent + '</td>'+
        '</tr>'+
    '</table>';

    return table;
}

function createContextMenu() {

    var contextMenu = $.contextMenu({
        selector: '#table tbody tr',
        callback: contextMenuCallback,
        items: {
            'view': {
                name: 'Visualizar',
                icon: 'fas fa-map-marker-alt',
                visible: visibleView
            },
            'open': {
                name: 'Abrir no',
                icon: 'fas fa-external-link-alt',
                items: {
                    'portal': {
                        name: 'ArcGIS Portal', 
                        icon: 'fas fa-globe-americas'
                    },
                    'mapViewer': {
                        name: 'ArcGIS Map Viewer',
                        icon: 'fas fa-map-marked-alt',
                        visible: visibleMapViewer
                    },
                    'sceneViewer': {
                        name: 'ArcGIS Scene Viewer',
                        icon: 'fas fa-layer-group',
                        visible: visibleSceneViewer
                    },
                    'dashboard': {
                        name: 'ArcGIS Operations Dashboard',
                        icon: 'fas fa-tachometer-alt',
                        visible: visibleDashboard 
                    },
                    'survey': {
                        name: 'Survey123 Web',
                        icon: 'far fa-file-alt',
                        visible: visibleSurvey
                    },
                    'workforce': {
                        name: 'Workforce for ArcGIS',
                        icon: 'fas fa-hard-hat',
                        visible: visibleWorkforce
                    }
                }
            },
            'url': {
                name: 'URL',
                icon: 'fas fa-link',
                visible: visibleUrl
            },
            'metadata': {
                name: 'Metadados',
                icon: 'far fa-file-alt',
                visible: visibleMetadata
            },
            'publish': {
                name: 'Publicar',
                icon: 'fas fa-cloud-upload-alt',
                visible: visiblePublish
            },
            'download': {
                name: 'Download',
                icon: 'fas fa-cloud-download-alt',
                items: {
                    'geojson': {
                        name: 'GeoJSON',
                        icon: 'fas fa-globe',
                        visible: visibleGeojson
                    },
                    'kml': {
                        name: 'KML',
                        icon: 'fas fa-globe',
                        visible: visibleKml
                    },
                    'file': {
                        name: 'Arquivo',
                        icon: 'far fa-save',
                        visible: visibleFile
                    }
                },
                visible: visibleDownload
            }
        }
    });

    return contextMenu;
}

function downloadCSV() {

    var data = [
        ['ID', 'Nome', 'Tipo', 'Proprietário(a)', 'URL']
    ];

    app.search.csvData.map(function(item) {
        data.push(item);
    });

    var csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURI(data.map(e => e.join(';')).join('\n'));
    var link = document.createElement('a');

    link.setAttribute('href', csvContent);
    link.setAttribute('download', app.search.query + '.csv');

    document.body.appendChild(link);

    link.click();
}

function downloadGeojson(url, title) {

    $('#loader').show();

    require(['esri/request'], function(esriRequest) {

        var data = new FormData();

        data.append('where', '1=1');
        data.append('outFields', '*');
        data.append('f', 'geojson');

        var options = {
            body: data,
            authMode: 'no-prompt'
        };

        esriRequest(url + '/0/query', options).then(function(response) {

            $('#loader').hide();

            var name = title.replace(/ /g, '_');
            var data = JSON.stringify(response.data);
            var link = document.createElement('a');
            var file = new Blob([data], { type: 'application/json' });
            var dataUrl = URL.createObjectURL(file);

            link.href = dataUrl;
            link.download =  name + '.geojson';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        }).catch((e) => {
            logError(e);
        });
    });
}

// TODO
function extractData(layerUrl, format) {

    require(['esri/tasks/Geoprocessor', 'esri/request'], function(Geoprocessor, esriRequest) {

        var data = new FormData();
        var inputLayers = [
            {
                url: layerUrl + '/0'
            }
        ];
        var url = app.url + '/server/rest/services/System/SpatialAnalysisTools/GPServer/ExtractData';

        data.append('inputLayers', JSON.stringify(inputLayers));
        data.append('dataFormat', format);
        data.append('f', 'json');

        var geoprocessor = new Geoprocessor({
            url: url,
            requestOptions: {
                body: data
            }
        });

        toastr.clear();
        toastr.info('Processando download...', 'Aguarde', {
            timeOut: 0, 
            extendedTimeOut: 0
        });

        console.log('url:', url);
        console.log('inputLayers:', JSON.stringify(inputLayers));
        console.log('dataFormat:', format);
        console.log('f:', 'pjson');

        geoprocessor.submitJob().then(function(result) {

            var options = {
                query: {
                    f: 'pjson'
                }
            };

            console.log('Job result:', result);

            if (result.jobStatus === 'job-succeeded') {
                    
                esriRequest(url + '/jobs/' + result.jobId + '/results/contentID', options).then(function(response) {

                    console.log('Job succeeded:', response);
                });
            }
            else {

                toastr.clear();

                result.messages.forEach(function(msg) {

                    console.error('Job failed:', msg);

                    if (msg.type === 'informative') {

                        toastr.info('', msg.description, {
                            timeOut: 0, 
                            extendedTimeOut: 0,
                            newestOnTop: false
                        });
                    }
                    else if (msg.type === 'error') {

                        toastr.error('', msg.description, {
                            timeOut: 0, 
                            extendedTimeOut: 0,
                            newestOnTop: false
                        });
                    }
                });
            }
        }).catch((e) => {
            logError(e);
        });
    });
}

function contextMenuCallback(key) {

    var target = this,
        rowData = app.search.table.row(target).data(),
        id = rowData[0],
        url = rowData[1],
        title = rowData[3],
        type = rowData[4];

    switch (key) {
        case 'view':

            preview(id);

            break;

        case 'portal':

            window.open(app.portal + '/home/item.html?id=' + id, '_blank');

            break;

        case 'mapViewer':

            window.open(app.portal + '/home/webmap/viewer.html?useExisting=1&layers=' + id, '_blank');

            break;

        case 'sceneViewer':

            if (type === 'Vector Tile Service' || type === 'Scene Service') {
                window.open(app.portal + '/home/webscene/viewer.html?layers=' + id, '_blank');
            }
            else {
                window.open(app.portal + '/home/webscene/viewer.html?webscene=' + id, '_blank');
            }

            break;

        case 'dashboard':

            window.open(app.portal + '/apps/opsdashboard/index.html#/' + id, '_blank');

            break;

        case 'survey':

            window.open('https://survey123.arcgis.com/share/' + id + '?portalUrl=' + app.portal, '_blank');
    
            break;

        case 'workforce':

            window.open(app.portal + '/apps/workforce/#/projects/' + id, '_blank');

            break;

        case 'url':

            window.open(url, '_blank');

            break;

        case 'metadata':

            window.open(app.portal + '/sharing/rest/content/items/' + id + '/info/metadata/metadata.xml?format=default&output=html', '_blank');

            break;

        case 'publish':

            document.getElementById('itemID').value = id;
            document.getElementById('fileType').value = type.toLowerCase();
            document.getElementById('itemTitle').value = title;
            document.getElementById('itemName').value = '';

            $('#publishModal').modal('show');

            break;

        case 'geojson':

            downloadGeojson(url, title);

            break;

        case 'kml':

            window.open(url + '/0/query?where=1=1&outFields=*&f=kmz', '_self');

            break;

        case 'file':

            if (type === 'Image') {
                window.open(app.portal + '/sharing/rest/content/items/' + id + '/data', '_blank');
            }
            else {
                window.open(app.portal + '/sharing/rest/content/items/' + id + '/data', '_self');
            }

            break;
    }
}

function publishItem(e) {

    e.preventDefault();

    var itemID = document.getElementById('itemID').value;
    var fileType = document.getElementById('fileType').value;
    var itemName = document.getElementById('itemName').value;

    if (itemName !== '') {

        $('#publishModal').modal('hide');

        toastr.clear();
        toastr.info('Processando publicação...', 'Aguarde', {
            timeOut: 0, 
            extendedTimeOut: 0
        });

        require(['esri/request'], function(esriRequest) {

            var data = new FormData();
            var publishParameters = {
                name: itemName,
                title: itemName
            };

            data.append('itemid', itemID);
            data.append('filetype', fileType);
            data.append('publishParameters', JSON.stringify(publishParameters));
            data.append('f', 'json');

            var options = {
                body: data
            };

            esriRequest(app.portal + '/sharing/rest/content/users/publish', options).then(function() {
                // TODO
            }).catch(() => {
                
                var username = document.getElementById('dijit_form_ValidationTextBox_0').value;
                var userContent = document.getElementById('user');

                userContent.innerHTML = username;

                esriRequest(app.portal + '/sharing/rest/content/users/' + username + '/publish', options).then(function(response) {

                    toastr.clear();

                    var error = response.data.services[0].error;

                    if (error) {
                        logError(error);
                    }
                    else {

                        var id = response.data.services[0].serviceItemId;
                        
                        toastr.success('Clique para acessar', 'Item publicado!', {
                            timeOut: 0, 
                            extendedTimeOut: 0,
                            onclick: function () {
                                window.open(app.portal + '/home/item.html?id=' + id, '_blank');
                            }
                        });
                    }

                }).catch((e) => {
                    logError(e);
                });
            });
        });
    }
}

function visibleView() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Feature Collection':
        case 'Feature Service':
        case 'Image Service':
        case 'KML':
        case 'Map Service':
        case 'Scene Service':
        case 'WMS':
            return true;
        default:
            return false;
    }
}

function visibleMapViewer() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Feature Collection':
        case 'Feature Service':
        case 'Image Service':
        case 'KML':
        case 'Map Service':
        case 'Vector Tile Service':
        case 'WFS':
        case 'WMS':
        case 'Web Map':   
            return true;
        default:
            return false;
    }
}

function visibleSceneViewer() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Scene Service':
        case 'Vector Tile Service':
        case 'Web Scene':  
            return true;
        default:
            return false;
    }
}

function visibleDashboard() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    if (type === 'Dashboard') {
        return true;
    }
    else {
        return false;
    }
}

function visibleSurvey() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    if (type === 'Form') {
        return true;
    }
    else {
        return false;
    }
}

function visibleWorkforce() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    if (type === 'Workforce Project') {
        return true;
    }
    else {
        return false;
    }
}

function visibleUrl() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var url = rowData[1];

    if (url) {
        return true;
    }
    else {
        return false;
    }
}

function visibleMetadata() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Feature Collection':
        case 'Feature Service':
        case 'Image Service':
        case 'Map Service':
        case 'Service Definition':
        case 'Scene Service':
        case 'WFS':
        case 'WMS':
            return true;
        default:
            return false;
    }
}

function visiblePublish() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'CSV':
        case 'GeoJson':
        case 'Shapefile':
            return true;
        default:
            return false;
    }
}

function visibleGeojson() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Feature Service':
        case 'Map Service':
            return true;
        default:
            return false;
    }
}

function visibleKml() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Map Service':
            return true;
        default:
            return false;
    }
}

function visibleFile() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case '360 VR Experience':
        case 'ArcGIS Pro Add In':
        case 'Basemap Package':
        case 'CAD Drawing':
        case 'Code Attachment':
        case 'Code Sample':
        case 'CSV':
        case 'CSV Collection':
        case 'Desktop Add In':
        case 'Desktop Application':
        case 'Desktop Application Template':
        case 'Desktop Style':
        case 'Deep Learning Package':
        case 'File Geodatabase':
        case 'GeoJson':
        case 'GeoPackage':
        case 'Geoprocessing Package':
        case 'Geoprocessing Sample':
        case 'Image':
        case 'Layer':
        case 'Layer Package':
        case 'Layout':
        case 'Locator Package':
        case 'Map Package':
        case 'Map Template':
        case 'Microsoft Excel':
        case 'Microsoft Powerpoint':
        case 'Microsoft Word':
        case 'Mobile Map Package':
        case 'Mobile Scene Package':
        case 'Notebook':
        case 'KML':
        case 'KML Collection':
        case 'Pro Map':
        case 'Project Template':
        case 'Project Package':
        case 'Raster function template':
        case 'Rule Package':
        case 'Scene Package':
        case 'Service Definition':
        case 'Shapefile':
        case 'Style':
        case 'Tile Package':
        case 'Vector Tile Package':
        case 'Web Mapping Application':
        case 'Windows Mobile Package':
            return true;
        default:
            return false;
    }
}

function visibleDownload() {

    var target = this;
    var rowData = app.search.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case '360 VR Experience':
        case 'ArcGIS Pro Add In':
        case 'Basemap Package':
        case 'CAD Drawing':
        case 'Code Attachment':
        case 'Code Sample':
        case 'CSV':
        case 'CSV Collection':
        case 'Desktop Add In':
        case 'Desktop Application':
        case 'Desktop Application Template':
        case 'Desktop Style':
        case 'Deep Learning Package':
        case 'Feature Service':
        case 'File Geodatabase':
        case 'GeoJson':
        case 'GeoPackage':
        case 'Geoprocessing Package':
        case 'Geoprocessing Sample':
        case 'Image':
        case 'Layer':
        case 'Layer Package':
        case 'Layout':
        case 'Locator Package':
        case 'KML':
        case 'KML Collection':
        case 'Map Package':
        case 'Map Service':
        case 'Map Template':
        case 'Microsoft Excel':
        case 'Microsoft Powerpoint':
        case 'Microsoft Word':
        case 'Mobile Map Package':
        case 'Mobile Scene Package':
        case 'Notebook':
        case 'Pro Map':
        case 'Project Template':
        case 'Project Package':
        case 'Raster function template':
        case 'Rule Package':
        case 'Scene Package':
        case 'Service Definition':
        case 'Shapefile':
        case 'Style':
        case 'Tile Package':
        case 'Vector Tile Package':
        case 'Web Mapping Application':
        case 'Windows Mobile Package':
            return true;
        default:
            return false;
    }
}

function logInfo(msg, back) {

    $('#loader').hide();

    toastr.clear();
    toastr.info('', msg);

    if (back) {

        setTimeout(function() { 

            $('#searchModal').modal('show');

        }, 500);
    }
}

function logError(e, back) {

    console.error(e);

    $('#loader').hide();

    toastr.clear();
    toastr.error(e.message, e.name);

    if (back) {

        setTimeout(function() { 

            $('#searchModal').modal('show');

        }, 500);
    }
}