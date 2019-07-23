$(document).ready(function() {

    // Init Bootstrap modal, with static status
    $('#modal').modal({
        backdrop: 'static', 
        keyboard: false
    });

    $('body').tooltip({selector: '[title]'});
});

function search(e) {

    // Prevent page to reload on submit
    e.preventDefault();

    // Get params
    var root = document.getElementById('root').value;
    var rootInput = document.getElementById('rootInput').value;
    var portal = root + '/portal';
    var groupID = document.getElementById('groupID').value;

    if (root === '') {
        root = rootInput;
        portal = rootInput + '/portal';
    }

    if (root !== '') {

        require(['esri/request'], function (esriRequest) {

            // Hide modal and show loading
            $('#modal').modal('hide');
            $('.loader').show();

            // Set the data and response type
            var body = new FormData();

            body.append('f', 'json');

            var options = {
                responseType: 'json',
                body: body
            }

            // * ArcGIS API for REST
            // Request a Portal URL with group ID param
            esriRequest(portal + '/sharing/rest/content/groups/' + groupID, options).then(function (response) {
                
                // Total of items
                var total = response.data.total;

                // Create table columns and data
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

                // For each item/service in response
                response.data.items.forEach(function(service) {

                    // Create a row and push values into data
                    var rows = [];
                    var downloadRows = [];
                    var thumbnail = thumbnail = '<img src="' + service.url + '/info/thumbnail" class="img-thumbnail" style="width: 200px; height: 133px;">';

                    rows.push(service.id);
                    rows.push(service.url);
                    rows.push(thumbnail);
                    rows.push(service.title);
                    rows.push(service.type);
                    data.push(rows);

                    downloadRows.push(service.title);
                    downloadData.push(downloadRows);
                });

                // Init DataTables plugin with columns and data/rows
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

                // Init jQuery contextMenu
                $.contextMenu({
                    selector: '#table tbody tr',
                    callback: function(key, options) {

                        var target = this;

                        switch (key) {
                            case 'portal':

                                var rowData = table.row(target).data();
                                var id = rowData[0];

                                window.open(portal + '/home/item.html?id=' + id, '_blank');

                                break;
                            case 'mapViewer':

                                var rowData = table.row(target).data();
                                var id = rowData[0];

                                window.open(portal + '/home/webmap/viewer.html?useExisting=1&layers=' + id, '_blank');
            
                                break;
                            case 'rest':

                                var rowData = table.row(target).data();
                                var url = rowData[1];

                                window.open(url, '_blank');
                    
                                break;
                            case 'geojson':

                                var rowData = table.row(target).data();
                                var url = rowData[1];
                                var title = rowData[3];

                                downloadGeojson(url, title);

                                break;
                        }
                    },
                    items: {
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

                                if (type === 'AppBuilder Extension' || type === 'Image Service') {
                                    return true;
                                }
                            }
                        }
                    }
                });

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
                $('#refresh').show();
                $('#download').show();

                // Show success alert
                toastr.success('', total + ' itens encontrados', {
                    timeOut: 0, 
                    extendedTimeOut: 0
                });

            // if errors
            }).catch((e) => {
                
                setTimeout(function(){ 

                    console.error(e);

                    // Show modal
                    $('#modal').modal('show');

                    // Hide loading and append a error in alert
                    $('.loader').hide();

                    // Show error alert
                    toastr.error(e.message, e.name);
                }, 500);
            });
        });
    }
}

function verify(el) {

    var target = document.getElementById('rootInput');
    
    if (el.value !== '') {
        target.setAttribute('disabled', true);
        target.value = '';
    }
    else {
        target.removeAttribute('disabled');
    }
}

function downloadGeojson(url, title) {

    toastr.info('Processando download...', 'Aguarde', {
        timeOut: 0, 
        extendedTimeOut: 0
    })

    require(['esri/request'], function(esriRequest) {

        esriRequest(url + '/0/query?where=1=1&f=geojson').then(function(response) {

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
        });
    });
}