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
        esriRequest(portal + '/sharing/rest/content/groups/' + groupID, options)
            .then(function (response) {

            // Create table columns and data
            var columns = [
                {
                    title: 'Nome',
                    value: 'Nome'
                }
            ];
        
            var data = [];

            // For each item/service in response
            response.data.items.forEach(function(service) {

                // Create a row and push values into data
                var rows = [];

                rows.push(service.title);
                data.push(rows);
            });

            // Init DataTables plugin with columns and data/rows
            $('#table').DataTable({
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
                    searchPlaceholder: 'Pesquisar...',
                },
                'columns': columns,
                'data': data
            });

            // Hide loading
            $('.loader').hide();

            // Create a CSV file with table data
            var csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURI(data.map(e => e.join(';')).join('\n'));
            var link = document.createElement('a');

            link.setAttribute('href', csvContent);
            link.setAttribute('download', groupID + '.csv');
            document.body.appendChild(link);

            link.click();

        // if errors
        }).catch((e) => {
            
            console.error(e);

            // Hide loading and append a error in alert
            $('.loader').hide();
            $('#error').html('O grupo não existe ou está inacessível. <a href="">Recarregar</a><br><strong>' + e.message + '</strong>');
            $('#error').show();
        });
    });
}