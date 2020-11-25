<template>
    <nav id="navigation" class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
        <a id="group" class="navbar-brand" href="#"></a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#menu" aria-controls="menu" aria-expanded="false" aria-label="Menu">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div id="menu" class="collapse navbar-collapse">
            <ul class="navbar-nav mr-auto" style="display: none !important;">
                <li class="nav-item dropdown active">
                    <a class="nav-link dropdown-toggle" href="#" id="dropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <i class="fas fa-user-circle"></i>
                        <span id="user"></span>
                    </a>
                    <div class="dropdown-menu" aria-labelledby="dropdown">
                        <a class="dropdown-item" href="">
                            <i class="fas fa-power-off"></i> Sair
                        </a>
                    </div>
                </li>
                <li class="nav-item">
                    <!--<a class="nav-link" onclick="downloadCSV();" title="Lista de itens em CSV" style="cursor: pointer;">
                        <i class="fas fa-file-download"></i> Download
                    </a>-->
                </li>
            </ul>
            <!--<a id="version" class="navbar-text"></a>-->
        </div>
    </nav>
</template>

<style scoped>
    #navigation {
        background-repeat: no-repeat;
        background-position-x: 3px;
        background-position-y: 5px;
        background-size: 46px;
    }
</style>