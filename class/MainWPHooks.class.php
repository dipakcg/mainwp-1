<?php

class MainWPHooks
{
    public function __construct()
    {
        add_filter('mainwp_getspecificdir', array('MainWPUtility', 'getMainWPSpecificDir'), 10, 1);
        add_filter('mainwp_is_multi_user', array(&$this, 'isMultiUser'));
        add_filter('mainwp_qq2fileuploader', array(&$this, 'filter_qq2FileUploader'), 10, 2);
        add_action('mainwp_select_sites_box', array(&$this, 'select_sites_box'), 10, 8);
        add_action('mainwp_prepareinstallplugintheme', array('MainWPInstallBulk', 'prepareInstall'));
        add_action('mainwp_performinstallplugintheme', array('MainWPInstallBulk', 'performInstall'));
        add_filter('mainwp_getwpfilesystem', array('MainWPUtility', 'getWPFilesystem'));
        add_filter('mainwp_getspecificurl', array('MainWPUtility', 'getMainWPSpecificUrl'), 10, 1);
        add_action('mainwp_renderToolTip', array('MainWPUtility', 'renderToolTip'), 10, 4);
        add_action('mainwp_renderHeader', array('MainWPUI', 'renderHeader'), 10, 2);
        add_action('mainwp_renderFooter', array('MainWPUI', 'renderFooter'), 10, 0);
        add_action('mainwp_renderImage', array('MainWPUI', 'renderImage'), 10, 4);
        add_action('mainwp_notify_user', array(&$this, 'notifyUser'), 10, 3);

        //Internal hook - deprecated
        add_filter('mainwp_getUserExtension', array(&$this, 'getUserExtension'));
        add_filter('mainwp_getwebsitesbyurl', array(&$this, 'getWebsitesByUrl'));
        add_filter('mainwp_getWebsitesByUrl', array(&$this, 'getWebsitesByUrl')); //legacy
        add_filter('mainwp_getErrorMessage', array(&$this, 'getErrorMessage'), 10, 2);

        //Cache hooks
        add_filter('mainwp_cache_getcontext', array(&$this, 'cache_getcontext'));
        add_action('mainwp_cache_echo_body', array(&$this, 'cache_echo_body'));
        add_action('mainwp_cache_init', array(&$this, 'cache_init'));
        add_action('mainwp_cache_add_context', array(&$this, 'cache_add_context'), 10, 2);
        add_action('mainwp_cache_add_body', array(&$this, 'cache_add_body'), 10, 2);

		add_filter('mainwp_getmetaboxes', array(&$this, 'getMetaBoxes'), 10, 0);
    }

    public function cache_getcontext($page)
    {
        return MainWPCache::getCachedContext($page);
    }

    public function cache_echo_body($page)
    {
        MainWPCache::echoBody($page);
    }

    public function cache_init($page)
    {
        MainWPCache::initCache($page);
    }

    public function cache_add_context($page, $context)
    {
        MainWPCache::addContext($page, $context);
    }

    public function cache_add_body($page, $body)
    {
        MainWPCache::addBody($page, $body);
    }



    public function select_sites_box($title = "", $type = 'checkbox', $show_group = true, $show_select_all = true, $class = '', $style = '', $selected_websites = array(), $selected_groups = array())
    {
        MainWPUI::select_sites_box($title, $type, $show_group, $show_select_all, $class, $style, $selected_websites, $selected_groups);
    }

    public function notifyUser($userId, $subject, $content)
    {
        wp_mail(MainWPDB::Instance()->getUserNotificationEmail($userId), $subject, $content, array('From: "'.get_option('admin_email').'" <'.get_option('admin_email').'>', 'content-type: text/html'));
    }

    public function getErrorMessage($msg, $extra)
    {
        return MainWPErrorHelper::getErrorMessage(new MainWPException($msg, $extra));
    }

    public function getUserExtension()
    {
        return MainWPDB::Instance()->getUserExtension();
    }

    public function getWebsitesByUrl($url)
    {
        return MainWPDB::Instance()->getWebsitesByUrl($url);
    }

    public function isMultiUser()
    {
        return MainWPSystem::Instance()->isMultiUser();
    }

    function filter_qq2FileUploader($allowedExtensions, $sizeLimit)
    {
        return new qq2FileUploader($allowedExtensions, $sizeLimit);
    }
	function getMetaBoxes() {
        return MainWPSystem::Instance()->metaboxes;
    }
}
