var app = {
    type: '',
    filter: '',
    query: '',
    url: '',
    portal: '',
    token: '',
    map: null,
    view: null,
    basemap: null,
    basemapGallery: null,
    basemapExpand: null,
    legend: null,
    csvData: []
};

$(document).ready(function() {

    // Init Bootstrap modal, with static status
    $('#modal').modal({
        backdrop: 'static', 
        keyboard: false
    });
    // Update then to responsive
    $('#modal').modal('handleUpdate');
    $('#groupModal').modal('handleUpdate');
    $('#previewModal').modal('handleUpdate');

    // Init Bootstrap tooltip
    $('body').tooltip({selector: '[data-toggle="tooltip"]'});
});

function search(e) {

    e.preventDefault();

    var urlInput = document.getElementById('urlInput');
    var query = document.getElementById('query');

    if (urlInput.value !== '') {

        var url = new URL(urlInput.value);

        app.url = url.origin;
        app.portal = url.href;

        if (app.type === 'groups') {

            if (app.filter === 'id') {
                searchGroupById(query.value);
            }
            else {
                searchGroupByName(query.value);
            }
        }
        else {
            searchContent(query.value);
        }
    }
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

    app.type = type.value;

    if (type.value === 'groups') {

        document.getElementById('groupID').setAttribute('required', true);

        $('#types .alert').hide();

        $('#filters').show();
    }
    else {

        document.getElementById('groupID').removeAttribute('required');

        $('#types .alert').show();

        $('#filters').hide();
    }
}

function setSearchFilter(el) {

    app.filter = el.value;

    if (el.value === 'name') {
        $('#filters .alert').show();
    }
    else {
        $('#filters .alert').hide();
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

        app.query = id;

        $('#modal').modal('hide');
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

            groupContent.innerHTML = group.data.title + ' (' + app.portal + ')';
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

        app.query = name;

        $('#modal').modal('hide');
        $('#loader').show();

        var options = {
            query: {
                f: 'pjson',
                q: name,
            }
        };

        esriRequest(app.portal + '/sharing/rest/community/groups', options).then(function (result) {

            if (result.data.results.length) {

                var groups = result.data.results;

                options = {
                    query: {
                        f: 'pjson',
                    }
                };

                toastr.clear();

                $('#groupModal').modal({
                    backdrop: 'static', 
                    keyboard: false
                });

                groups.forEach(function(group, i) {

                    $('#groupModal .modal-body').append(
                        '<div class="custom-control custom-radio custom-control-inline">' +
                            '<input class="custom-control-input" type="radio" name="groupSelect" id="groupSelect_' + i + '" value="' + group.id + '">' +
                            '<label class="custom-control-label" for="groupSelect_' + i + '">' + group.title + ' (<a href="' + app.portal + '/home/user.html?user=' + group.owner + '" target="_blank">' + group.owner + '</a>)</label>' + 
                        '</div>'
                    );

                    $('#groupSelect_' + i).click(function() {

                        $('#groupModal').modal('hide');

                        esriRequest(app.portal + '/sharing/rest/content/groups/' + group.id, options).then(function (response) {

                            groupContent.innerHTML = group.title + ' (' + app.portal + ')';
                            groupContent.href = app.portal;
                            groupContent.target = '_blank';
                            userContent.innerHTML = 'Anônimo';

                            if (group.thumbnail) {   
                                navContent.style.backgroundImage = 'url(' + app.portal + '/sharing/rest/community/groups/' + group.id + '/info/' + group.thumbnail + ')';
                                groupContent.style.paddingLeft = '50px';
                            }
        
                            $('.navbar-nav').show();

                            var itens = response.data.items;

                            if (itens.length) {

                                toastr.clear();

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
                    });
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

        var server = app.url.replace(/^https?\:\/\//i, '');
        var groupContent = document.getElementById('group');
        var userContent = document.getElementById('user');

        esriConfig.request.trustedServers.push(server);
        esriConfig.portalUrl = app.portal;

        app.query = query;

        groupContent.innerHTML = query + ' (' + app.portal + ')';
        groupContent.href = app.portal;
        groupContent.target = '_blank';

        userContent.innerHTML = 'Anônimo';

        $('#modal').modal('hide');
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

            if (itens.length) {

                toastr.clear();

                createItens(itens);

                $('#loader').hide();

                toastr.success('', itens.length + ' itens encontrados');
            }
            else {
                logInfo('Nenhum resultado obtido', true);
            }
        }).catch((e) => {
            logError(e, true);
        });
    });
}

function createItens(itens) {

    var columns = [
        {
            title: 'ID'
        },
        {
            title: 'Title'
        },
        {
            title: 'URL'
        },
        {
            title: '',
        },
        {
            title: 'Nome'
        },
        {
            title: 'Tipo'
        },
        {
            title: 'Proprietário(a)'
        }
    ];
    var data = [];

    itens.forEach(function(item) {

        var rows = [];
        var downloadedRows = [];
        var thumbnail;
        var description;
        var profile = '<a href="' + app.portal + '/home/user.html?user=' + item.owner + '" target="_blank">' + item.owner + '</a>';

        if (item.thumbnail) {
            thumbnail = '<img src="' + app.portal + '/sharing/rest/content/items/' + item.id + '/info/' + item.thumbnail + '" class="img-thumbnail img-item">';
        }
        else {
            thumbnail = '<img src="images/default_thumb.jpg" class="img-thumbnail img-item">';
        }

        if (item.description) {
            description = 
                '<p>' + item.title + '</p>' +
                '<small class="text-muted">' + reduceDescription(item.description, 100) + '</small>';
        }
        else {
            description = item.title;
        }

        rows.push(item.id);
        rows.push(item.title);
        rows.push(item.url);
        rows.push(thumbnail);
        rows.push(description);
        rows.push(item.type);
        rows.push(profile);

        data.push(rows);

        downloadedRows.push(item.title);
        app.csvData.push(downloadedRows);
    });

    var table = createDataTable(columns, data);
        
    createContextMenu(table);
}

function reduceDescription(text, number) {
    if (text.length > number) {
        return text.substring(0, number - 5) + '...';
    }
    else {
        return text;
    }
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
        'columnDefs': [
            {
                'targets': [0, 1, 2],
                'visible': false
            },
            {
                'targets': [0, 1, 2, 3],
                'searchable': false,
                'orderable': false
            },
            {
                'targets': [3, 5, 6],
                'className': 'text-center'
            }
        ],
        'columns': columns,
        'data': data
    });

    return table;
}

function createContextMenu(table) {

    $.contextMenu({
        selector: '#table tbody tr',
        callback: function(key) {

            var target = this;
            var rowData = table.row(target).data();
            var id = rowData[0];
            var title = rowData[1];
            var url = rowData[2];

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

                    window.open(app.portal + '/home/webscene/viewer.html?webscene=' + id, '_blank');

                    break;

                case 'url':

                    window.open(url, '_blank');
        
                    break;

                case 'metadata':

                    window.open(app.portal + '/sharing/rest/content/items/' + id + '/info/metadata/metadata.xml', '_blank');

                    break;

                case 'geojson':

                    downloadGeojson(url, title);

                    break;

                case 'kml':

                    extractData(url, 'KML');

                    break;

                case 'file':

                    window.open(app.portal + '/sharing/rest/content/items/' + id + '/data');

                    break;
            }
        },
        items: {
            'view': {
                name: 'Visualizar',
                icon: 'fas fa-map-marker-alt',
                visible : function() {

                    var target = this;
                    var rowData = table.row(target).data();
                    var type = rowData[5];

                    switch(type) {
                        case 'Feature Collection':
                        case 'Feature Service':
                        case 'Image Service':
                        case 'Map Service':
                        case 'WMS':
                            return true;
                        default:
                            return false;
                    }
                }
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
                        visible : function() {

                            var target = this;
                            var rowData = table.row(target).data();
                            var type = rowData[5];
    
                            switch(type) {
                                case 'Feature Collection':
                                case 'Feature Service':
                                case 'Image Service':
                                case 'Map Service':
                                case 'WFS':
                                case 'WMS':
                                case 'Web Map':   
                                    return true;
                                default:
                                    return false;
                            }
                        }
                    },
                    'sceneViewer': {
                        name: 'ArcGIS Scene Viewer',
                        icon: 'fas fa-layer-group',
                        visible : function() {

                            var target = this;
                            var rowData = table.row(target).data();
                            var type = rowData[5];
    
                            switch(type) {
                                case 'Web Scene':   
                                    return true;
                                default:
                                    return false;
                            }
                        }
                    }
                }
            },
            'url': {
                name: 'URL',
                icon: 'fas fa-link',
                visible : function() {

                    var target = this;
                    var rowData = table.row(target).data();
                    var url = rowData[2];

                    if (url) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            'metadata': {
                name: 'Metadados',
                icon: 'far fa-file-alt'
            },
            'download': {
                name: 'Baixar',
                icon: 'fas fa-cloud-download-alt',
                items: {
                    'geojson': {
                        name: 'GeoJSON',
                        icon: 'fas fa-globe',
                        visible : function() { 

                            var target = this;
                            var rowData = table.row(target).data();
                            var type = rowData[5];
    
                            switch(type) {
                                case 'Feature Service':
                                case 'Map Service':
                                    return true;
                                default:
                                    return false;
                            }
                        }
                    },
                    'file': {
                        name: 'Arquivo',
                        icon: 'far fa-save',
                        visible : function() { 

                            var target = this;
                            var rowData = table.row(target).data();
                            var type = rowData[5];
    
                            switch(type) {
                                case 'Code Attachment':
                                case 'Microsoft Excel':
                                case 'Shapefile':
                                case 'Style':
                                case 'Windows Mobile Package':
                                    return true;
                                default:
                                    return false;
                            }
                        }
                    }
                },
                visible : function() { 

                    var target = this;
                    var rowData = table.row(target).data();
                    var type = rowData[5];

                    switch(type) {
                        case 'Code Attachment':
                        case 'Feature Service':
                        case 'Map Service':
                        case 'Microsoft Excel':
                        case 'Shapefile':
                        case 'Style':
                        case 'Windows Mobile Package':
                            return true;
                        default:
                            return false;
                    }
                }
            }
        }
    });
}

function downloadCSV() {

    var csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURI(app.csvData.map(e => e.join(';')).join('\n'));
    var link = document.createElement('a');

    link.setAttribute('href', csvContent);
    link.setAttribute('download', app.query + '.csv');

    document.body.appendChild(link);

    link.click();
}

function downloadGeojson(url, title) {

    toastr.clear();
    toastr.info('Processando download...', 'Aguarde', {
        timeOut: 0, 
        extendedTimeOut: 0
    });

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

            toastr.clear();

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

function logInfo(msg, back) {

    $('#loader').hide();

    toastr.clear();
    toastr.info('', msg);

    if (back) {

        setTimeout(function() { 

            $('#modal').modal('show');

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

            $('#modal').modal('show');

        }, 500);
    }
}