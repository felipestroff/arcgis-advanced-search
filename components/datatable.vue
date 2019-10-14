<template>
    <table id="table" class="table table-bordered table-striped table-hover" style="width: 100%;"></table>
</template>

<style scoped>
    .table-hidden tbody tr {
        background-color: #FFFFFF !important;
    }

    td.details-control {
        background: url('../images/open.png') no-repeat center center;
        cursor: pointer;
    }

    tr.shown td.details-control {
        background: url('../images/close.png') no-repeat center center;
    }

    .width-5 {
        width: 5%;
    }

    .width-15 {
        width: 15%;
    }

    .width-75 {
        width: 75%;
    }

    .vertical-align-middle {
        vertical-align: middle !important;
    }

    .img-item {
        max-width: 100px; 
        height: auto;
    }

    .context-menu-active {
        color: #004085 !important;
        background-color: #b8daff !important;
    }
</style>