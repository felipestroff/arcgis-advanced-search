require(['esri/Map','esri/views/MapView', 'esri/widgets/Home'], function(Map, MapView, Home) {

    app.api.map = new Map({
        basemap: 'streets'
    });

    app.api.view = new MapView({
        container: 'viewDiv',
        map: app.api.map,
        zoom: 1
    });

    var homeBtn = new Home({
        view: app.api.view
    });

    app.api.view.ui.add(homeBtn, 'top-left');

    app.api.view.on('layerview-create', function (event) {

        var layer = event.layer;

        console.info('[LAYER]: ' + layer.title + ' (' + layer.type + ') loaded');
    });

    app.api.view.on('layerview-create-error', function (event) {
        logError(e);
    });

    app.api.view.on('layerview-destroy', function (event) {

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

            app.api.map.removeAll();
            app.api.view.popup.close();

            loadPortalBasemaps(portal);

            app.api.view.goTo({
                target: app.api.view.center,
                zoom: 2
            });

            Layer.fromPortalItem({
                portalItem: {
                    id: id
                }
            })
            .then(function(layer) {

                app.api.map.add(layer);

                layer.when(function() {

                    createLayerLegend(layer);

                    if (layer.source) {
                        createLayerPopup(layer);
                    }

                    // TODO
                    app.api.view.goTo(layer.fullExtent);

                    $('#loader').hide();

                    $('#mapModal .modal-title').html(layer.title);
                    $('#mapModal').modal();

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

        app.api.view.ui.remove(app.api.basemapExpand);

        app.api.basemap = portal.useVectorBasemaps ? portal.defaultVectorBasemap : portal.defaultBasemap;

        app.api.basemapGallery = new BasemapGallery({
            view: app.api.view
        });

        app.api.basemapExpand = new Expand({
            view: app.api.view,
            content: app.api.basemapGallery
        });

        app.api.map.basemap = app.api.basemap;

        app.api.view.ui.add(app.api.basemapExpand, 'bottom-left');
    });
}

function createLayerLegend(layer) {

    require(['esri/widgets/Legend'], function(Legend) {

        app.api.view.ui.remove(app.api.legend);

        app.api.legend = new Legend({
            view: app.api.view,
            layerInfos: [
                {
                    layer: layer
                }
            ]
        });

        app.api.view.ui.add(app.api.legend, 'bottom-right');
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