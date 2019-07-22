$(document).ready(function() {
    // Init Bootstrap modal, with static status
    $('#modal').modal({
        backdrop: 'static', 
        keyboard: false
    });
});

function search(e) {

    // Prevent page to load
    e.preventDefault();

    // Get params
    var portal = document.getElementById('portal').value;
    var groupID = document.getElementById('groupID').value;

    // Hide modal and loading
    $('#modal').modal('hide');
    $('.loader').show();

    require(['esri/request'], function (esriRequest) {

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

            // Create table columns and data
            var columns = [
                {
                    title: 'ID'
                },
                {
                    title: '',
                },
                {
                    title: 'Nome'
                }
            ];
        
            var data = [];
            var downloadData = [];

            // For each item/service in response
            response.data.items.forEach(function(service) {

                // Create a row and push values into data
                var rows = [];
                var downloadRows = [];
                var thumbnail = '<img src="' + service.url + '/info/thumbnail" class="img-thumbnail" style="width: 200px; height: 133px;">';

                rows.push(service.id);
                rows.push(thumbnail);
                rows.push(service.title);
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
                        'targets': [0],
                        'visible': false
                    },
                    {
                        'targets': [0, 1],
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
                                icon: 'fas fa-map-marked-alt'
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

        // if errors
        }).catch((e) => {
            
            console.error(e);

            // Hide loading and append a error in alert
            $('.loader').hide();
            $('#error').html(e.name + '<br><strong>' + e.message + '</strong>');
            $('#error').show();

            // Show actions
            $('#refresh').show();
        });
    });
}