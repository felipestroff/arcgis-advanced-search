// Global app variables
var app = {
    url: null,
    portal: null,
    map: null,
    view: null,
    legend: null,
    token: null
};

$(document).ready(function() {

    // Init Bootstrap modal, with static status
    $('#modal').modal({
        backdrop: 'static', 
        keyboard: false
    });
    $('#previewModal').modal('handleUpdate');

    // Init Bootstrap tooltip
    $('body').tooltip({selector: '[data-toggle="tooltip"]'});
});

require(['esri/Map', 'esri/views/MapView', 'esri/widgets/Home'], function(Map, MapView, Home) {

    app.map = new Map({
        basemap: 'streets'
    });

    app.view = new MapView({
        container: 'viewDiv',
        map: app.map,
        center: [-52, -30],
        zoom: 6
    });

    app.view.on('layerview-create', function (event) {

        var layer = event.layer;

        console.info('[LAYER]: ' + layer.title + ' (' + layer.type + ') loaded');
    });

    app.view.on('layerview-create-error', function (event) {
        logError(e);
    });

    app.view.on('layerview-destroy', function (event) {

        var layer = event.layer;

        console.info('[LAYER]: ' + layer.title + ' (' + layer.type + ') removed');
    });

    var homeBtn = new Home({
        view: app.view
    });

    app.view.ui.add(homeBtn, 'top-left');
});

function search(e) {

    // Prevent page to reload on submit
    e.preventDefault();

    // Get params
    var urlSelect = document.getElementById('urlSelect').value;
    var urlInput = document.getElementById('urlInput').value;
    var groupID = document.getElementById('groupID').value;

    if (urlSelect !== '') {
        app.url = urlSelect;
    }
    else {
        app.url = urlInput;
    }

    if (app.url !== '') {

        app.portal = app.url + '/portal';

        require(['esri/request', 'esri/config'], function (esriRequest, esriConfig) {

            esriConfig.portalUrl = app.portal;

            // Hide modal and show loading
            $('#modal').modal('hide');
            $('.loader').show();

            // Set the data and response type
            var body = new FormData();

            body.append('f', 'json');

            var options = {
                query: {
                    f: 'json'
                },
                responseType: 'json',
                body: body
            };

            // * ArcGIS API for REST
            // Request a Portal URL with group ID param
            esriRequest(app.portal + '/sharing/rest/content/groups/' + groupID, options).then(function (response) {

                generateToken();

                var total = response.data.total;
                var columns = [
                    {
                        title: 'ID'
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
                ];
                var data = [];
                var downloadData = [];

                response.data.items.forEach(function(service) {

                    var rows = [];
                    var downloadRows = [];
                    var thumbnail = '<img src="' + service.url + '/info/thumbnail" class="img-thumbnail img-item" crossorigin="anonymous">';

                    rows.push(service.id);
                    rows.push(service.url);
                    rows.push(thumbnail);
                    rows.push(service.title);
                    rows.push(service.type);

                    data.push(rows);

                    downloadRows.push(service.title);
                    downloadData.push(downloadRows);
                });

                // Init jQuery DataTable
                var table = createDataTable(columns, data);

                // Init jQuery contextMenu
                createContextMenu(table);

                $('#download').on('click', function () {

                    // Create a CSV file with table data
                    var csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURI(downloadData.map(e => e.join(';')).join('\n'));
                    var link = document.createElement('a');

                    link.setAttribute('href', csvContent);
                    link.setAttribute('download', groupID + '.csv');
                    document.body.appendChild(link);

                    link.click();
                });

                // Hide loading
                $('.loader').hide();

                // Show actions
                $('.actions-btn').show();

                // Show success alert
                toastr.success('', total + ' itens encontrados');

            // if errors
            }).catch((e) => {
                
                setTimeout(function() { 

                    logError(e);

                    $('#modal').modal('show');
                    $('.loader').hide();

                }, 500);
            });
        });
    }
}

function verifyInput(el) {

    var target = document.getElementById('urlInput');
    
    if (el.value !== '') {

        target.setAttribute('disabled', true);
        target.value = '';
    }
    else {
        target.removeAttribute('disabled');
    }
}

function generateToken() {

    require(['esri/request'], function(esriRequest) {

        var data = new FormData();
        var username = document.getElementById('dijit_form_ValidationTextBox_0').value;
        var password = document.getElementById('dijit_form_ValidationTextBox_1').value;

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

// TODO
function extractData(layerUrl, format) {

    require(['esri/tasks/Geoprocessor', 'esri/request'], function(Geoprocessor, esriRequest) {

        var data = new FormData();
        var inputLayers = [
            {
                url: layerUrl + '/0'
            }
        ];
        var options = {
            responseType: 'json'
        };
        var url = app.url + '/server/rest/services/System/SpatialAnalysisTools/GPServer/ExtractData';

        data.append('inputLayers', JSON.stringify(inputLayers));
        data.append('dataFormat', format);
        data.append('f', 'pjson');

        console.log(JSON.stringify(inputLayers));
        console.log(format);

        var geoprocessor = new Geoprocessor({
            url: url,
            requestOptions: {
                responseType: 'json',
                body: data
            }
        });

        toastr.clear();
        toastr.info('Processando download...', 'Aguarde', {
            timeOut: 0, 
            extendedTimeOut: 0
        });

        geoprocessor.submitJob().then(function(result) {

            console.log(result);

            if (result.jobStatus === 'job-succeeded') {
                    
                esriRequest(url + '/jobs/' + result.jobId + '/results/contentID?f=json', options).then(function(response) {

                    console.log(response);
                });
            }
            else {

                toastr.clear();

                result.messages.forEach(function(msg) {

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

function downloadGeojson(url, title) {

    toastr.clear();
    toastr.info('Processando download...', 'Aguarde', {
        timeOut: 0, 
        extendedTimeOut: 0
    });

    require(['esri/request'], function(esriRequest) {

        var options = {
            query: {
                where: '1=1',
                f: 'geojson'
            },
            responseType: 'json'
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
                'targets': [0, 1],
                'visible': false
            },
            {
                'targets': [0, 1, 2],
                'searchable': false,
                'orderable': false
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
            var url = rowData[1];
            var title = rowData[3];

            switch (key) {
                case 'view':

                    preview(id, title);

                    break;

                case 'portal':

                    window.open(app.portal + '/home/item.html?id=' + id, '_blank');

                    break;

                case 'mapViewer':

                    window.open(app.portal + '/home/webmap/viewer.html?useExisting=1&layers=' + id, '_blank');

                    break;

                case 'rest':

                    window.open(url, '_blank');
        
                    break;

                case 'metadata':

                    window.open(app.portal + '/sharing/rest/content/items/' + id + '/info/metadata/metadata.xml?format=default&output=html', '_blank');

                    break;

                case 'geojson':

                    downloadGeojson(url, title);

                    break;
            }
        },
        items: {
            'view': {
                name: 'Visualizar',
                icon: 'fas fa-map-marker-alt'
            },
            'open': {
                name: 'Abrir no',
                icon: 'fas fa-link',
                items: {
                    'portal': {
                        name: 'ArcGIS Portal', 
                        icon: 'fas fa-globe-americas'
                    },
                    'mapViewer': {
                        name: 'ArcGIS Map Viewer',
                        icon: 'fas fa-map-marked-alt',
                        disabled: function() { 

                            var target = this;
                            var rowData = table.row(target).data();
                            var type = rowData[4];

                            if (type === 'AppBuilder Extension') {
                                return true;
                            }
                        }
                    },
                    'rest': {
                        name: 'ArcGIS REST',
                        icon: 'fas fa-external-link-alt'
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
                        icon: 'fas fa-globe'
                    }
                },
                disabled: function() { 

                    var target = this;
                    var rowData = table.row(target).data();
                    var type = rowData[4];

                    if (type === 'AppBuilder Extension' ||
                        type === 'Image Service' ||
                        type === 'WMS') {
                        return true;
                    }
                }
            }
        }
    });
}

function preview(id, title) {

    require(['esri/layers/Layer'], function(Layer) {

        app.map.removeAll();
        app.view.popup.close();

        Layer.fromPortalItem({
            portalItem: {
                id: id
            }
        })
        .then(function(layer) {

            $('.loader').show();
    
            app.map.add(layer);

            layer.when(function() {
    
                createLayerLegend(layer);
                createLayerPopup(layer);

                app.view.goTo(layer.fullExtent);

                $('.loader').hide();

                $('#previewModal .modal-title').html(title);
                $('#previewModal').modal();
            });
        })
        .catch(function(e) {
            logError(e);
        });
    });
}

function createLayerLegend(layer) {

    require(['esri/widgets/Legend'], function(Legend) {

        app.view.ui.remove(app.legend);

        app.legend = new Legend({
            view: app.view,
            layerInfos: [
                {
                    layer: layer
                }
            ]
        });

        app.view.ui.add(app.legend, 'bottom-right');
    });
}

function createLayerPopup(layer) {

    var fields = layer.source.layerDefinition.fields;
    var layerFields = [];

    fields.forEach(function(field) {

        layerFields.push({
            fieldName: field.name,
            label: field.alias,
            visible: true
        });
    });

    var template = {
        title: layer.title,
        content: [{
            type: 'fields',
            fieldInfos: layerFields
        }]
    };
        
    layer.popupTemplate = template;
}

function logError(e) {

    console.error(e);

    $('.loader').hide();

    toastr.clear();
    toastr.error(e.message, e.name);
}