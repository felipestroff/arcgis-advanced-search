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