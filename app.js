// Global attributes
var app = {
    type: '',
    filter: '',
    query: '',
    url: '',
    portal: '',
    token: '',
    table: null,
    map: null,
    view: null,
    basemap: null,
    basemapGallery: null,
    basemapExpand: null,
    legend: null,
    csvData: []
};

// Read config.json
$.getJSON('config.json', function(data) {
    $('title').html(data.name);
    $('#group').html(data.name);
    $('#version').html('v' + data.version);
});

$(document).ready(function() {

    // Init Bootstrap modal, with static status
    $('#modal').modal({
        backdrop: 'static', 
        keyboard: false
    });
    // Update then to responsive
    $('#modal').modal('handleUpdate');
    $('#groupModal').modal('handleUpdate');
    $('#publishModal').modal('handleUpdate');
    $('#previewModal').modal('handleUpdate');

    // Init Bootstrap tooltip
    $('body').tooltip({selector: '[data-toggle="tooltip"]'});
});

function search(e) {

    e.preventDefault();

    var urlInput = document.getElementById('urlInput').value;
    var query = document.getElementById('query').value;

    if (urlInput !== '') {

        var url = new URL(urlInput);

        app.url = url.origin;
        app.portal = url.href;

        if (app.type === 'groups') {

            if (app.filter === 'id') {
                searchGroupById(query);
            }
            else {
                searchGroupByName(query);
            }
        }
        else {
            searchContent(query);
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

        $('#types .alert').hide(500);

        $('#filters').show(500);
    }
    else {

        document.getElementById('groupID').removeAttribute('required');

        $('#types .alert').show(500);

        $('#filters').hide(500);
    }
}

function setSearchFilter(el) {

    app.filter = el.value;

    if (el.value === 'name') {
        $('#filters .alert').show(500);
    }
    else {
        $('#filters .alert').hide(500);
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
            className: 'text-center vertical-align-middle width-10',
            searchable: false,
            orderable: false
        },
        // Title
        {
            title: 'Nome'
        },
        // Type
        {
            title: 'Tipo',
            className: 'text-center vertical-align-middle',
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
            className: 'details-control',
            orderable: false,
            data: null,
            defaultContent: ''
        }
    ];
    var data = [];

    itens.forEach(function(item) {

        var rows = [];
        var downloadedRows = [];
        var thumbnail;

        if (item.thumbnail) {
            thumbnail = '<img src="' + app.portal + '/sharing/rest/content/items/' + item.id + '/info/' + item.thumbnail + '" class="img-thumbnail img-item">';
        }
        else {
            thumbnail = '<img src="images/default_thumb.jpg" class="img-thumbnail img-item">';
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

        downloadedRows.push(item.title);
        app.csvData.push(downloadedRows);
    });

    app.table = createDataTable(columns, data);
        
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
        'data': data
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
    '<table class="table table-hidden">'+
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
                disabled: disabledView
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
                        disabled: disabledMapViewer
                    },
                    'sceneViewer': {
                        name: 'ArcGIS Scene Viewer',
                        icon: 'fas fa-layer-group',
                        disabled: disabledSceneViewer
                    },
                    'dashboard': {
                        name: 'ArcGIS Operations Dashboard',
                        icon: 'fas fa-tachometer-alt',
                        disabled: disabledDashboard 
                    }
                }
            },
            'url': {
                name: 'URL',
                icon: 'fas fa-link',
                disabled: disabledUrl
            },
            'metadata': {
                name: 'Metadados',
                icon: 'far fa-file-alt',
                disabled: disabledMetadata
            },
            'publish': {
                name: 'Publicar',
                icon: 'fas fa-cloud-upload-alt',
                disabled: disabledPublish
            },
            'download': {
                name: 'Baixar',
                icon: 'fas fa-cloud-download-alt',
                items: {
                    'geojson': {
                        name: 'GeoJSON',
                        icon: 'fas fa-globe',
                        disabled: disabledGeojson
                    },
                    'file': {
                        name: 'Arquivo',
                        icon: 'far fa-save',
                        disabled: disabledFile
                    }
                },
                disabled: disabledDownload
            }
        },
        events: {
            preShow: function(options) {

                console.log(options);
            }
        }
    });

    return contextMenu;
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

function contextMenuCallback(key) {

    var target = this;
    var rowData = app.table.row(target).data();
    var id = rowData[0];
    var url = rowData[1];
    var title = rowData[3];
    var type = rowData[4];

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

            extractData(url, 'KML');

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

function disabledView() {

    var target = this;
    var rowData = app.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Feature Collection':
        case 'Feature Service':
        case 'Image Service':
        case 'KML':
        case 'Map Service':
        case 'Scene Service':
        case 'WMS':
            return false;
        default:
            return true;
    }
}

function disabledMapViewer() {

    var target = this;
    var rowData = app.table.row(target).data();
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
            return false;
        default:
            return true;
    }
}

function disabledSceneViewer() {

    var target = this;
    var rowData = app.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Scene Service':
        case 'Vector Tile Service':
        case 'Web Scene':  
            return false;
        default:
            return true;
    }
}

function disabledDashboard() {

    var target = this;
    var rowData = app.table.row(target).data();
    var type = rowData[4];

    if (type !== 'Dashboard') {
        return true;
    }
}

function disabledUrl() {

    var target = this;
    var rowData = app.table.row(target).data();
    var url = rowData[1];

    if (url) {
        return false;
    }
    else {
        return true;
    }
}

function disabledMetadata() {

    var target = this;
    var rowData = app.table.row(target).data();
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
            return false;
        default:
            return true;
    }
}

function disabledPublish() {

    var target = this;
    var rowData = app.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Shapefile':
            return false;
        default:
            return true;
    }
}

function disabledGeojson() {

    var target = this;
    var rowData = app.table.row(target).data();
    var type = rowData[4];

    switch(type) {
        case 'Feature Service':
        case 'Map Service':
            return false;
        default:
            return true;
    }
}

function disabledFile() {

    var target = this;
    var rowData = app.table.row(target).data();
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
            return false;
        default:
            return true;
    }
}

function disabledDownload() {

    var target = this;
    var rowData = app.table.row(target).data();
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
            return false;
        default:
            return true;
    }
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