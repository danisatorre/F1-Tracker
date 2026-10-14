<?php
    define('PROJECT', '/F1-Tracker/');

    //SITE_ROOT
    define('SITE_ROOT', $_SERVER['DOCUMENT_ROOT'] . PROJECT);
    
    //SITE_PATH
    define('SITE_PATH', 'http://' . $_SERVER['HTTP_HOST'] . PROJECT);
    
    //PRODUCTION
    define('PRODUCTION', true);
    
    //MODEL
    define('MODEL_PATH', SITE_ROOT . 'public/model/');
    
    //MODULES
    define('MODULES_PATH', SITE_ROOT . 'public/module/');
    
    //RESOURCES
    define('RESOURCES', SITE_ROOT . 'public/resources/');
    
    //UTILS
    define('UTILS', SITE_ROOT . 'public/utils/');

    //VIEW
    define('VIEW_PATH_INC', SITE_ROOT . 'public/view/inc/');

    //CSS
    define('CSS_PATH', SITE_ROOT . 'public/view/css/');
    
    //JS
    define('JS_PATH', SITE_ROOT . 'public/view/js/');
    
    //IMG
    define('IMG_PATH', SITE_ROOT . 'public/view/images/');
    
    // MODELS
    
    // define('UTILS_HOME', SITE_ROOT . 'module/home/utils/');

    // Friendly
    define('URL_FRIENDLY', TRUE);