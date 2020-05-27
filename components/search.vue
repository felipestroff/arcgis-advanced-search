<template>
    <div class="modal fade" id="searchModal" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static" data-keyboard="false">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <form id="formSearch" onsubmit="search(event);">
                    <div class="modal-header">
                        <h5 class="modal-title">Pesquisa</h5>
                        <a href="#">
                            <i class="fas fa-info-circle" title="Pesquise itens públicos ou privados do ArcGIS Online e Enterprise" data-toggle="tooltip"></i>
                        </a>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <fieldset>
                                <legend class="text-center">Local</legend>
                                <input id="urlInput" type="url" list="urlSelect" placeholder="Selecione ou digite uma URL válida" class="form-control form-control-lg" aria-describedby="urlHelp" required>
                                <datalist id="urlSelect">
                                    <option value="https://arcgis.com">https://arcgis.com</option>
                                </datalist>
                                <small id="urlHelp" class="form-text text-muted">
                                    Portal for ArcGIS da Organização
                                </small>
                            </fieldset>
                        </div>
                        <div id="types" class="form-group">
                            <fieldset>
                                <legend class="text-center">Tipo</legend>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input class="custom-control-input" type="radio" name="type" id="groups" value="groups" onclick="setSearchType(this);" required>
                                    <label class="custom-control-label" for="groups">
                                        Grupo
                                    </label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input class="custom-control-input" type="radio" name="type" id="users" value="users" onclick="setSearchType(this);" required>
                                    <label class="custom-control-label" for="users">
                                        Usuário
                                    </label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input class="custom-control-input" type="radio" name="type" id="content" value="content" onclick="setSearchType(this);">
                                    <label class="custom-control-label" for="content">
                                        Conteúdo
                                    </label>
                                </div>
                            </fieldset>
                        </div>
                        <div id="filters" class="form-group" style="display: none;">
                            <fieldset>
                                <legend class="text-center">Filtros</legend>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input class="custom-control-input" type="radio" name="group" id="groupID" value="id" onclick="app.search.filter = this.value;">
                                    <label class="custom-control-label" for="groupID">
                                        ID
                                        <i class="fas fa-globe-americas" title="Público" data-toggle="tooltip"></i>
                                        <i class="fas fa-lock" title="Privado" data-toggle="tooltip"></i>
                                    </label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input class="custom-control-input" type="radio" name="group" id="groupName" value="name" onclick="app.search.filter = this.value;">
                                    <label class="custom-control-label" for="groupName">
                                        Nome
                                        <i class="fas fa-globe-americas" title="Público" data-toggle="tooltip"></i>
                                    </label>
                                </div>
                                <div class="alert alert-info">
                                    Busca por nome funcionará somente em conteúdos públicos
                                </div>
                            </fieldset>
                        </div>
                        <div class="form-group">
                            <input id="query" class="form-control form-control-lg" type="text" placeholder="Pesquisar por..." aria-describedby="queryHelp" required>
                            <small id="queryHelp" class="form-text text-muted">
                                Palavras-chave, tags, categorias, item(ID), etc
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="resetSearch();">Limpar</button>
                        <button type="submit" class="btn btn-primary">Continuar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
    fieldset {
        border: 1px solid #dee2e6;
        padding: 5px;
    }

    fieldset legend {
        width: auto;
    }

    #searchModal .alert {
        display: none;
        margin-top: 10px;
    }
</style>