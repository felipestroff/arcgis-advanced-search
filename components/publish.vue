<template>
    <div class="modal fade" id="publishModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <form onsubmit="publishItem(event);">
                    <div class="modal-header">
                        <h5 class="modal-title">Publicar Item (Camada hospedada)</h5>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <input id="itemTitle" class="form-control form-control-lg" type="text" readonly>
                        </div>
                        <div class="form-group">
                            <input id="itemID" class="form-control form-control-lg" type="hidden" required>
                        </div>
                        <div class="form-group">
                            <input id="fileType" class="form-control form-control-lg" type="hidden" required>
                        </div>
                        <div class="form-group">
                            <input id="itemName" class="form-control form-control-lg" type="text" placeholder="Nome" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success">Publicar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>