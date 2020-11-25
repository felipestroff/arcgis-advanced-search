<template>
    <div class="modal fade" id="mapModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-xl" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"></h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="viewDiv"></div>
                </div>
                <div class="modal-footer">
                    Clique na feição para visualizar seus atributos
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    #viewDiv {
        padding: 0;
        margin: 0;
        height: 80vh;
    }
</style>