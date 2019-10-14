<template>
    <div id="loader" class="padding-leader-3 padding-trailer-3">
        <div class="loader-bars"></div>
        <div class="loader-text"></div>
    </div>
</template>

<style scoped>
    #loader {
        display: none;
        position: fixed;
        width: 100%;
        height: 100%;
        padding-top: 40vh;
        z-index: 1051;
    }

    .padding-trailer-3 {
        padding-bottom: 4.5rem;
    }

    .padding-leader-3 {
        padding-top: 4.5rem;
    }

    .loader-bars:before, .loader-bars:after, .loader-bars {
        background: #0079c1;
        -webkit-animation: load .8s infinite ease-in-out;
        animation: load .8s infinite ease-in-out;
        width: .85rem;
        height: 2rem;
    }

    .loader-bars:before,.loader-bars:after {
        position: absolute;
        top: 0;
        content: '';
    }

    .loader-bars {
        text-indent: -9999em;
        margin: auto;
        position: absolute;
        right: calc(50% - .425rem);
        font-size: 11px;
        -webkit-animation-delay: .16s;
        animation-delay: .16s;
    }

    .loader-bars:before {
        left: -1.25rem;
    }

    .loader-bars:after {
        left: 1.25rem;
        -webkit-animation-delay: .32s;
        animation-delay: .32s;
    }

    .loader-text {
        text-align: center;
        padding-top: 4rem;
    }

    .loader-text::after {
        content: 'Carregando...';
    }

    @-webkit-keyframes load {
        0%,80%,100% {
            opacity: .75;
            box-shadow: 0 0 #0079c1;
            height: 2rem;
        }

        40% {
            opacity: 1;
            box-shadow: 0 -.5rem #0079c1;
            height: 2.5rem;
        }
    }

    @keyframes load {
        0%,80%,100% {
            opacity: .75;
            box-shadow: 0 0 #0079c1;
            height: 2rem;
        }

        40% {
            opacity: 1;
            box-shadow: 0 -.5rem #0079c1;
            height: 2.5rem;
        }
    }
</style>