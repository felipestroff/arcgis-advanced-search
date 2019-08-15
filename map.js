require(['esri/Map','esri/views/MapView', 'esri/widgets/Home'], function(Map, MapView, Home) {

    app.map = new Map({
        basemap: 'streets'
    });

    app.view = new MapView({
        container: 'viewDiv',
        map: app.map,
        zoom: 1
    });

    var homeBtn = new Home({
        view: app.view
    });

    app.view.ui.add(homeBtn, 'top-left');

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
});

function preview(id) {

    require(['esri/portal/Portal', 'esri/layers/Layer'], function(Portal, Layer) {

        $('#loader').show();

        var portal = new Portal({
            url: app.portal
        });
    
        portal.load().then(function() {

            console.info('[PORTAL]: ' + portal.url + ' loaded');

            app.map.removeAll();
            app.view.popup.close();

            loadPortalBasemaps(portal);

            app.view.goTo({
                target: app.view.center,
                zoom: 2
            });

            Layer.fromPortalItem({
                portalItem: {
                    id: id
                }
            })
            .then(function(layer) {

                app.map.add(layer);

                layer.when(function() {

                    createLayerLegend(layer);

                    if (layer.source) {
                        createLayerPopup(layer);
                    }

                    // TODO
                    app.view.goTo(layer.fullExtent);

                    $('#loader').hide();

                    $('#previewModal .modal-title').html(layer.title);
                    $('#previewModal').modal();

                }).catch(function(e) {
                    logError(e);
                });
            }).catch(function(e) {
                logError(e);
            });
        }).catch(function(e) {
            logError(e);
        });
    });
}

function loadPortalBasemaps(portal) {
    
    require(['esri/widgets/BasemapGallery', 'esri/widgets/Expand'], function(BasemapGallery, Expand) {

        app.view.ui.remove(app.basemapExpand);

        app.basemap = portal.useVectorBasemaps ? portal.defaultVectorBasemap : portal.defaultBasemap;

        app.basemapGallery = new BasemapGallery({
            view: app.view
        });

        app.basemapExpand = new Expand({
            view: app.view,
            content: app.basemapGallery
        });

        app.map.basemap = app.basemap;

        app.view.ui.add(app.basemapExpand, 'bottom-left');
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