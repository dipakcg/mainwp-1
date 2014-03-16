rightnow_upgrade = function (id)
{
    var upgradeElement = jQuery('#wp_upgraded_' + id);
    if (upgradeElement.val() != 0) return false;

    rightnowContinueAfterBackup = function(pId, pUpgradeElement) { return function()
    {
        jQuery('#wp_upgrade_' + pId).html(__('Upgrading..'));
        pUpgradeElement.val(1);
        jQuery('#wp_upgradebuttons_' + pId).hide();
        var data = mainwp_secure_data({
            action:'mainwp_upgradewp',
            id:pId
        });
        jQuery.post(ajaxurl, data, function (response)
        {
            var result;
            if (response.error)
            {
                result = getErrorMessage(response.error);
            }
            else
            {
                result = response.result;
            }
            jQuery('#wp_upgrade_' + pId).html(result);
        }, 'json');
    } }(id, upgradeElement);

    var sitesToUpdate = [id];
    var siteNames = [];
    siteNames[id] = jQuery('.mainwp_wordpress_upgrade[site_id="' + id + '"]').attr('site_name');

    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};

/** Upgrade bulk **/
//<editor-fold desc="Wordpress bulk upgrade">
var websitesToUpgrade = [];
var rightnowContinueAfterBackup = undefined;
jQuery(document).on('click', '#rightnow-backup-ignore', function() {
   if (rightnowContinueAfterBackup != undefined)
   {
       jQuery('#rightnow-backup-box').dialog('destroy');
       rightnowContinueAfterBackup();
       rightnowContinueAfterBackup = undefined;
   }
});
rightnow_wordpress_global_upgrade_all = function ()
{
    if (bulkTaskRunning) return false;

    rightnow_show_if_required('wp_upgrades', false);

    //Step 1: build form
    var sitesToUpdate = [];
    var siteNames = {};
    var foundChildren = jQuery('#wp_upgrades').find('div[updated="0"]');
    if (foundChildren.length == 0) return false;
    var sitesCount = 0;

    var upgradeList = jQuery('#rightnow-upgrade-list');
    upgradeList.empty();

    for (var i = 0; i < foundChildren.length; i++)
    {
        var child = foundChildren[i];
        var siteId = jQuery(child).attr('site_id');
        var siteName = jQuery(child).attr('site_name');
        if (sitesToUpdate.indexOf(siteId) == -1)
        {
            sitesCount++;
            sitesToUpdate.push(siteId);
            siteNames[siteId] = siteName;
        }
    }

    for (var j = 0; j < sitesToUpdate.length; j++)
    {
        upgradeList.append('<tr><td>' + decodeURIComponent(siteNames[sitesToUpdate[j]]) + ' (Wordpress upgrade)</td><td style="width: 80px"><span class="rightnow-upgrade-status-wp" siteid="' + sitesToUpdate[j] + '">'+__('PENDING')+'</span></td></tr>');
    }

    rightnowContinueAfterBackup = function(pSitesCount, pSitesToUpdate) { return function()
    {
        //Step 2: show form
        var upgradeStatusBox = jQuery('#rightnow-upgrade-status-box');
        upgradeStatusBox.attr('title', 'Upgrading all');
        jQuery('#rightnow-upgrade-status-total').html(pSitesCount);
        jQuery('#rightnow-upgrade-status-progress').progressbar({value:0, max:pSitesCount});
        upgradeStatusBox.dialog({
            resizable:false,
            height:320,
            width:500,
            modal:true,
            close:function (event, ui)
            {
                bulkTaskRunning = false;
                jQuery('#rightnow-upgrade-status-box').dialog('destroy');
                location.reload();
            }});

        //Step 3: start upgrades
        rightnow_wordpress_upgrade_all_int(pSitesToUpdate);

        rightnowContinueAfterBackup = undefined;
    } }(sitesCount, sitesToUpdate);

    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};
rightnow_wordpress_upgrade_all_int = function (websiteIds)
{
    websitesToUpgrade = websiteIds;
    currentWebsite = 0;
    websitesDone = 0;
    websitesTotal = websitesLeft = websitesToUpgrade.length;

    bulkTaskRunning = true;
    rightnow_wordpress_upgrade_all_loop_next();
};
rightnow_wordpress_upgrade_all_loop_next = function ()
{
    while (bulkTaskRunning && (currentThreads < maxThreads) && (websitesLeft > 0))
    {
        rightnow_wordpress_upgrade_all_upgrade_next();
    }
};
rightnow_wordpress_upgrade_all_update_site_status = function (siteId, newStatus)
{
    jQuery('.rightnow-upgrade-status-wp[siteid="' + siteId + '"]').html(newStatus);
};
rightnow_wordpress_upgrade_all_upgrade_next = function ()
{
    currentThreads++;
    websitesLeft--;

    var websiteId = websitesToUpgrade[currentWebsite++];
    rightnow_wordpress_upgrade_all_update_site_status(websiteId, __('UPGRADING'));

    rightnow_wordpress_upgrade_int(websiteId, true);
};
rightnow_wordpress_upgrade_all_update_done = function ()
{
    currentThreads--;
    if (!bulkTaskRunning) return;
    websitesDone++;

    jQuery('#rightnow-upgrade-status-progress').progressbar('value', websitesDone);
    jQuery('#rightnow-upgrade-status-current').html(websitesDone);

    if (websitesDone == websitesTotal)
    {
        setTimeout(function ()
        {
            bulkTaskRunning = false;
            jQuery('#rightnow-upgrade-status-box').dialog('destroy');
            location.reload();
        }, 3000);
        return;
    }

    rightnow_wordpress_upgrade_all_loop_next();
};
rightnow_wordpress_upgrade_int = function (websiteId, bulkMode)
{
    var websiteHolder = jQuery('div.mainwp_wordpress_upgrade[site_id="' + websiteId + '"]');

    websiteHolder.find('.wordpressAction').hide();
    websiteHolder.find('.wordpressInfo').html(__('Upgrading..'));

    var data = mainwp_secure_data({
        action:'mainwp_upgradewp',
        id:websiteId
    });
    jQuery.post(ajaxurl, data, function (pWebsiteId, pBulkMode)
    {
        return function (response)
        {
            var result;
            var websiteHolder = jQuery('div.mainwp_wordpress_upgrade[site_id="' + pWebsiteId + '"]');

            if (response.error)
            {
                result = getErrorMessage(response.error);
                if (pBulkMode) rightnow_wordpress_upgrade_all_update_site_status(pWebsiteId, __('FAILED'));
            }
            else
            {
                result = response.result;
                if (pBulkMode) rightnow_wordpress_upgrade_all_update_site_status(pWebsiteId, __('DONE'));
                websiteHolder.attr('updated', 1);
            }
            rightnow_wordpress_upgrade_all_update_done();
            websiteHolder.find('.wordpressInfo').html(result);
        }
    }(websiteId, bulkMode), 'json');

    return false;
};
//</editor-fold desc="">

//<editor-fold desc="Plugins bulk upgrade">
var currentPluginSlugToUpgrade = undefined;
var websitesPluginSlugsToUpgrade = undefined;
rightnow_plugins_global_upgrade_all = function()
{
    if (bulkTaskRunning) return false;

    rightnow_show_if_required('plugin_upgrades', false);

    //Step 1: build form
    var sitesToUpdate = [];
    var siteNames = {};
    var sitesPluginSlugs = {};
    var foundChildren = jQuery('#wp_plugin_upgrades').find('div[updated="0"]');
    if (foundChildren.length == 0) return false;
    var sitesCount = 0;

    var upgradeList = jQuery('#rightnow-upgrade-list');
    upgradeList.empty();

    for (var i = 0; i < foundChildren.length; i++)
    {
        var child = jQuery(foundChildren[i]);
        var parent = child.parent();

        var siteElement;
        var pluginElement;

        var checkAttr = child.attr('site_id');
        if ((typeof checkAttr !== 'undefined') && (checkAttr !== false))
        {
            siteElement = child;
            pluginElement = parent;
        }
        else
        {
            siteElement = parent;
            pluginElement = child;
        }

        var siteId = siteElement.attr('site_id');
        var siteName = siteElement.attr('site_name');
        var pluginSlug = pluginElement.attr('plugin_slug');
        //var pluginName = pluginElement.attr('plugin_name');

        if (sitesToUpdate.indexOf(siteId) == -1)
        {
            sitesCount++;
            sitesToUpdate.push(siteId);
            siteNames[siteId] = siteName;
        }
        if (sitesPluginSlugs[siteId] == undefined)
        {
            sitesPluginSlugs[siteId] = pluginSlug;
        }
        else
        {
            sitesPluginSlugs[siteId] += ',' + pluginSlug;
        }
    }

    for (var i = 0; i < sitesToUpdate.length; i++)
    {
        var updateCount = sitesPluginSlugs[sitesToUpdate[i]].match(/\,/g);
        if (updateCount == null) updateCount = 1;
        else updateCount = updateCount.length + 1;

        upgradeList.append('<tr><td>' + decodeURIComponent(siteNames[sitesToUpdate[i]]) + ' (' + updateCount + ' plugins)</td><td style="width: 80px"><span class="rightnow-upgrade-status-wp" siteid="' + sitesToUpdate[i] + '">'+__('PENDING')+'</span></td></tr>');
    }

    rightnowContinueAfterBackup = function(pSitesCount, pSitesToUpdate, pSitesPluginSlugs) { return function()
    {
        //Step 2: show form
        jQuery('#rightnow-upgrade-status-box').attr('title', __('Upgrading all'));
        jQuery('#rightnow-upgrade-status-total').html(pSitesCount);
        jQuery('#rightnow-upgrade-status-progress').progressbar({value:0, max:pSitesCount});
        jQuery('#rightnow-upgrade-status-box').dialog({
            resizable:false,
            height:320,
            width:500,
            modal:true,
            close:function (event, ui)
            {
                bulkTaskRunning = false;
                jQuery('#rightnow-upgrade-status-box').dialog('destroy');
                location.reload();
            }});

        //Step 3: start upgrades
        rightnow_plugins_upgrade_all_int(undefined, pSitesToUpdate, pSitesPluginSlugs);

        rightnowContinueAfterBackup = undefined;
    } } (sitesCount, sitesToUpdate, sitesPluginSlugs);


    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};
rightnow_plugins_upgrade_all = function (slug, pluginName)
{
    if (bulkTaskRunning) return false;

    rightnow_plugins_detail_show(slug);

    //Step 1: build form
    var sitesToUpdate = [];
    var siteNames = [];
    var foundChildren = jQuery('div[plugin_slug="' + slug + '"]').children('div[updated="0"]');
    if (foundChildren.length == 0) return false;
    var sitesCount = foundChildren.length;

    var upgradeList = jQuery('#rightnow-upgrade-list');
    upgradeList.empty();

    for (var i = 0; i < foundChildren.length; i++)
    {
        var child = foundChildren[i];
        var siteId = jQuery(child).attr('site_id');
        var siteName = jQuery(child).attr('site_name');
        siteNames[siteId] = siteName;
        sitesToUpdate.push(siteId);
        upgradeList.append('<tr><td>' + decodeURIComponent(siteName) + '</td><td style="width: 80px"><span class="rightnow-upgrade-status-wp" siteid="' + siteId + '">'+__('PENDING')+'</span></td></tr>');
    }

    rightnowContinueAfterBackup = function(pSitesCount, pSlug, pSitesToUpdate) { return function()
    {
        //Step 2: show form
        jQuery('#rightnow-upgrade-status-box').attr('title', __('Upgrading %1', decodeURIComponent(pluginName)));
        jQuery('#rightnow-upgrade-status-total').html(pSitesCount);
        jQuery('#rightnow-upgrade-status-progress').progressbar({value:0, max:pSitesCount});
        jQuery('#rightnow-upgrade-status-box').dialog({
            resizable:false,
            height:320,
            width:500,
            modal:true,
            close:function (event, ui)
            {
                bulkTaskRunning = false;
                jQuery('#rightnow-upgrade-status-box').dialog('destroy');
                location.reload();
            }});

        //Step 3: start upgrades
        rightnow_plugins_upgrade_all_int(pSlug, pSitesToUpdate);

        rightnowContinueAfterBackup = undefined;
    } }(sitesCount, slug, sitesToUpdate);

    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};
rightnow_plugins_upgrade_all_int = function (slug, websiteIds, sitesPluginSlugs)
{
    currentPluginSlugToUpgrade = slug;
    websitesPluginSlugsToUpgrade = sitesPluginSlugs;
    websitesToUpdatePlugins = websiteIds;
    currentWebsite = 0;
    websitesDone = 0;
    websitesTotal = websitesLeft = websitesToUpdatePlugins.length;

    bulkTaskRunning = true;
    rightnow_plugins_upgrade_all_loop_next();
};
rightnow_plugins_upgrade_all_loop_next = function ()
{
    while (bulkTaskRunning && (currentThreads < maxThreads) && (websitesLeft > 0))
    {
        rightnow_plugins_upgrade_all_upgrade_next();
    }
};
rightnow_plugins_upgrade_all_update_site_status = function (siteId, newStatus)
{
    jQuery('.rightnow-upgrade-status-wp[siteid="' + siteId + '"]').html(newStatus);
};
rightnow_plugins_upgrade_all_upgrade_next = function ()
{
    currentThreads++;
    websitesLeft--;

    var websiteId = websitesToUpdatePlugins[currentWebsite++];
    rightnow_plugins_upgrade_all_update_site_status(websiteId, __('UPGRADING'));

    var slugToUpgrade = currentPluginSlugToUpgrade;
    if (slugToUpgrade == undefined) slugToUpgrade = websitesPluginSlugsToUpgrade[websiteId];
    rightnow_plugins_upgrade_int(slugToUpgrade, websiteId, true, true);
};
rightnow_plugins_upgrade_all_update_done = function ()
{
    currentThreads--;
    if (!bulkTaskRunning) return;
    websitesDone++;

    jQuery('#rightnow-upgrade-status-progress').progressbar('value', websitesDone);
    jQuery('#rightnow-upgrade-status-current').html(websitesDone);

    if (websitesDone == websitesTotal)
    {
        setTimeout(function ()
        {
            bulkTaskRunning = false;
            jQuery('#rightnow-upgrade-status-box').dialog('destroy');
            location.reload();
        }, 3000);
        return;
    }

    rightnow_plugins_upgrade_all_loop_next();
};
rightnow_plugins_upgrade_int = function (slug, websiteId, bulkMode, noCheck)
{
    rightnowContinueAfterBackup = function(pSlug, pWebsiteId, pBulkMode) { return function()
    {
        var slugParts = pSlug.split(',');
        for (var i = 0; i < slugParts.length; i++)
        {
            var websiteHolder = jQuery('div[plugin_slug="' + slugParts[i] + '"] div[site_id="' + pWebsiteId + '"]');
            if (!websiteHolder.exists())
            {
                websiteHolder = jQuery('div[site_id="' + pWebsiteId + '"] div[plugin_slug="' + slugParts[i] + '"]');
            }

            websiteHolder.find('.pluginsAction').hide();
            websiteHolder.find('.pluginsInfo').html('Upgrading..');
        }

        var data = mainwp_secure_data({
            action:'mainwp_upgradeplugintheme',
            websiteId:pWebsiteId,
            type:'plugin',
            slug:pSlug
        });
        jQuery.post(ajaxurl, data, function (pSlug, pWebsiteId, pBulkMode)
        {
            return function (response)
            {
                var slugParts = pSlug.split(',');
                var done = false;
                for (var i = 0; i < slugParts.length; i++)
                {
                    var result;
                    //Siteview
                    var websiteHolder = jQuery('div[plugin_slug="' + slugParts[i] + '"] div[site_id="' + pWebsiteId + '"]');
                    if (!websiteHolder.exists())
                    {
                        websiteHolder = jQuery('div[site_id="' + pWebsiteId + '"] div[plugin_slug="' + slugParts[i] + '"]');
                    }

                    if (response.error)
                    {
                        result = getErrorMessage(response.error);
                        if (!done && pBulkMode) rightnow_plugins_upgrade_all_update_site_status(pWebsiteId, __('FAILED'));
                    }
                    else
                    {
                        var res = response.result;

                        if (res[slugParts[i]])
                        {
                            if (!done && pBulkMode) rightnow_plugins_upgrade_all_update_site_status(pWebsiteId, __('DONE'));
                            result = __('Upgrade successful');
                            websiteHolder.attr('updated', 1);
                        }
                        else
                        {
                            if (!done && pBulkMode) rightnow_plugins_upgrade_all_update_site_status(pWebsiteId, __('FAILED'));
                            result = __('Upgrade failed');
                        }
                    }
                    if (!done && pBulkMode)
                    {
                        rightnow_plugins_upgrade_all_update_done();
                        done = true;
                    }
                    websiteHolder.find('.pluginsInfo').html(result);
                }
            }
        }(pSlug, pWebsiteId, pBulkMode), 'json');

        rightnowContinueAfterBackup = undefined;
    } }(slug, websiteId, bulkMode);

    if (noCheck)
    {
        rightnowContinueAfterBackup();
        return false;
    }

    var sitesToUpdate = [websiteId];
    var siteNames = [];
    siteNames[websiteId] = jQuery('div[site_id="' + websiteId + '"]').attr('site_name');

    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};
//</editor-fold>

//<editor-fold desc="Themes bulk upgrade">
var currentThemeSlugToUpgrade = undefined;
var websitesThemeSlugsToUpgrade = undefined;
rightnow_themes_global_upgrade_all = function ()
{
    if (bulkTaskRunning) return false;

    rightnow_show_if_required('theme_upgrades', false);

    //Step 1: build form
    var sitesToUpdate = [];
    var siteNames = {};
    var sitesPluginSlugs = {};
    var foundChildren = jQuery('#wp_theme_upgrades').find('div[updated="0"]');
    if (foundChildren.length == 0) return false;
    var sitesCount = 0;

    var upgradeList = jQuery('#rightnow-upgrade-list');
    upgradeList.empty();

    for (var i = 0; i < foundChildren.length; i++)
    {
        var child = jQuery(foundChildren[i]);
        var parent = child.parent();

        var siteElement;
        var themeElement;

        var checkAttr = child.attr('site_id');
        if ((typeof checkAttr !== 'undefined') && (checkAttr !== false))
        {
            siteElement = child;
            themeElement = parent;
        }
        else
        {
            siteElement = parent;
            themeElement = child;
        }

        var siteId = siteElement.attr('site_id');
        var siteName = siteElement.attr('site_name');
        var themeSlug = themeElement.attr('theme_slug');
        //var themeName = themeElement.attr('theme_name');
        if (sitesToUpdate.indexOf(siteId) == -1)
        {
            sitesCount++;
            sitesToUpdate.push(siteId);
            siteNames[siteId] = siteName;
        }
        if (sitesPluginSlugs[siteId] == undefined)
        {
            sitesPluginSlugs[siteId] = themeSlug;
        }
        else
        {
            sitesPluginSlugs[siteId] += ',' + themeSlug;
        }
    }

    for (var i = 0; i < sitesToUpdate.length; i++)
    {
        var updateCount = sitesPluginSlugs[sitesToUpdate[i]].match(/\,/g);
        if (updateCount == null) updateCount = 1;
        else updateCount = updateCount.length + 1;

        upgradeList.append('<tr><td>' + decodeURIComponent(siteNames[sitesToUpdate[i]]) + ' (' + updateCount + ' themes)</td><td style="width: 80px"><span class="rightnow-upgrade-status-wp" siteid="' + sitesToUpdate[i] + '">'+__('PENDING')+'</span></td></tr>');
    }

    rightnowContinueAfterBackup = function(pSitesCount, pSitesToUpdate, pSitesPluginSlugs) { return function()
    {
        //Step 2: show form
        jQuery('#rightnow-upgrade-status-box').attr('title', __('Upgrading all'));
        jQuery('#rightnow-upgrade-status-total').html(pSitesCount);
        jQuery('#rightnow-upgrade-status-progress').progressbar({value:0, max:pSitesCount});
        jQuery('#rightnow-upgrade-status-box').dialog({
            resizable:false,
            height:320,
            width:500,
            modal:true,
            close:function (event, ui)
            {
                bulkTaskRunning = false;
                jQuery('#rightnow-upgrade-status-box').dialog('destroy');
                location.reload();
            }});

        //Step 3: start upgrades
        rightnow_themes_upgrade_all_int(undefined, pSitesToUpdate, pSitesPluginSlugs);

        rightnowContinueAfterBackup = undefined;
    } }(sitesCount, sitesToUpdate, sitesPluginSlugs);

    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};
rightnow_themes_upgrade_all = function (slug, themeName)
{
    if (bulkTaskRunning) return false;

    rightnow_themes_detail_show(slug);

    //Step 1: build form
    var sitesToUpdate = [];
    var siteNames = [];
    var foundChildren = jQuery('div[theme_slug="' + slug + '"]').children('div[updated="0"]');
    if (foundChildren.length == 0) return false;
    var sitesCount = foundChildren.length;

    var upgradeList = jQuery('#rightnow-upgrade-list');

    for (var i = 0; i < foundChildren.length; i++)
    {
        var child = foundChildren[i];
        var siteId = jQuery(child).attr('site_id');
        var siteName = jQuery(child).attr('site_name');
        siteNames[siteId] = siteName;
        sitesToUpdate.push(siteId);
        upgradeList.append('<tr><td>' + decodeURIComponent(siteName) + '</td><td style="width: 80px"><span class="rightnow-upgrade-status-wp" siteid="' + siteId + '">'+__('PENDING')+'</span></td></tr>');
    }
    rightnowContinueAfterBackup = function(pSitesCount, pSlug, pSitesToUpdate) { return function()
    {
        //Step 2: show form
        jQuery('#rightnow-upgrade-status-box').attr('title', __('Upgrading %1', decodeURIComponent(themeName)));
        jQuery('#rightnow-upgrade-status-total').html(pSitesCount);
        jQuery('#rightnow-upgrade-status-progress').progressbar({value:0, max:pSitesCount});
        jQuery('#rightnow-upgrade-status-box').dialog({
            resizable:false,
            height:320,
            width:500,
            modal:true,
            close:function (event, ui)
            {
                bulkTaskRunning = false;
                jQuery('#rightnow-upgrade-status-box').dialog('destroy');
                location.reload();
            }});

        //Step 3: start upgrades
        rightnow_themes_upgrade_all_int(pSlug, pSitesToUpdate);

        rightnowContinueAfterBackup = undefined;
    } }(sitesCount, slug, sitesToUpdate);

    return mainwp_rightnow_checkBackups(sitesToUpdate, siteNames);
};
rightnow_themes_upgrade_all_int = function (slug, websiteIds, sitesThemeSlugs)
{
    currentThemeSlugToUpgrade = slug;
    websitesThemeSlugsToUpgrade = sitesThemeSlugs;
    websitesToUpdate = websiteIds;
    currentWebsite = 0;
    websitesDone = 0;
    websitesTotal = websitesLeft = websitesToUpdate.length;

    bulkTaskRunning = true;
    rightnow_themes_upgrade_all_loop_next();
};
rightnow_themes_upgrade_all_loop_next = function ()
{
    while (bulkTaskRunning && (currentThreads < maxThreads) && (websitesLeft > 0))
    {
        rightnow_themes_upgrade_all_upgrade_next();
    }
};
rightnow_themes_upgrade_all_update_site_status = function (siteId, newStatus)
{
    jQuery('.rightnow-upgrade-status-wp[siteid="' + siteId + '"]').html(newStatus);
};
rightnow_themes_upgrade_all_upgrade_next = function ()
{
    currentThreads++;
    websitesLeft--;

    var websiteId = websitesToUpdate[currentWebsite++];
    rightnow_themes_upgrade_all_update_site_status(websiteId, __('UPGRADING'));

    var slugToUpgrade = currentThemeSlugToUpgrade;
    if (slugToUpgrade == undefined) slugToUpgrade = websitesThemeSlugsToUpgrade[websiteId];
    rightnow_themes_upgrade_int(slugToUpgrade, websiteId, true);
};
rightnow_themes_upgrade_all_update_done = function ()
{
    currentThreads--;
    if (!bulkTaskRunning) return;
    websitesDone++;

    jQuery('#rightnow-upgrade-status-progress').progressbar('value', websitesDone);
    jQuery('#rightnow-upgrade-status-current').html(websitesDone);

    if (websitesDone == websitesTotal)
    {
        setTimeout(function ()
        {
            bulkTaskRunning = false;
            jQuery('#rightnow-upgrade-status-box').dialog('destroy');
            location.reload();
        }, 3000);
        return;
    }

    rightnow_themes_upgrade_all_loop_next();
};
rightnow_themes_upgrade_int = function (slug, websiteId, bulkMode)
{
    var slugParts = slug.split(',');
    for (var i = 0; i < slugParts.length; i++)
    {
        var websiteHolder = jQuery('div[theme_slug="' + slugParts[i] + '"] div[site_id="' + websiteId + '"]');
        if (!websiteHolder.exists())
        {
            websiteHolder = jQuery('div[site_id="' + websiteId + '"] div[theme_slug="' + slugParts[i] + '"]');
        }

        websiteHolder.find('.pluginsAction').hide();
        websiteHolder.find('.pluginsInfo').html(__('Upgrading..'));
    }

    var data = mainwp_secure_data({
        action:'mainwp_upgradeplugintheme',
        websiteId:websiteId,
        type:'theme',
        slug:slug
    });
    jQuery.post(ajaxurl, data, function (pSlug, pWebsiteId, pBulkMode)
    {
        return function (response)
        {
            var slugParts = pSlug.split(',');
            var done = false;
            for (var i = 0; i < slugParts.length; i++)
            {
                var result;
                var websiteHolder = jQuery('div[theme_slug="' + pSlug + '"] div[site_id="' + pWebsiteId + '"]');
                if (!websiteHolder.exists())
                {
                    websiteHolder = jQuery('div[site_id="' + pWebsiteId + '"] div[theme_slug="' + pSlug + '"]');
                }
                if (response.error)
                {
                    result = getErrorMessage(response.error);
                    if (!done && pBulkMode) rightnow_themes_upgrade_all_update_site_status(pWebsiteId, __('FAILED'));
                }
                else
                {
                    var res = response.result;

                    if (res[pSlug])
                    {
                        if (!done && pBulkMode) rightnow_themes_upgrade_all_update_site_status(pWebsiteId, __('DONE'));
                        result = __('Upgrade successful');
                        websiteHolder.attr('updated', 1);
                    }
                    else
                    {
                        if (!done && pBulkMode) rightnow_themes_upgrade_all_update_site_status(pWebsiteId, __('FAILED'));
                        result = __('Upgrade failed');
                    }

                }
                if (!done && pBulkMode)
                {
                    rightnow_themes_upgrade_all_update_done();
                    done = true;
                }
                websiteHolder.find('.pluginsInfo').html(result);
            }
        }
    }(slug, websiteId, bulkMode), 'json');

    return false;
};
//</editor-fold>

//<editor-fold desc="All bulk upgrade">
rightnow_global_upgrade_all = function ()
{
    if (bulkTaskRunning) return false;

    rightnow_show_if_required('wp_upgrades', false);

    //Step 1: build form
    var sitesToUpdate = [];
    var sitesToUpgrade = [];
    var sitesPluginSlugs = {};
    var sitesThemeSlugs = {};
    var siteNames = {};

    var upgradeList = jQuery('#rightnow-upgrade-list');
    upgradeList.empty();

    var sitesCount = 0;
    var foundChildren = undefined;

    //Find wordpress to upgrade
    foundChildren = jQuery('#wp_upgrades').find('div[updated="0"]');
    if (foundChildren.length != 0)
    {
        for (var i = 0; i < foundChildren.length; i++)
        {
            var child = jQuery(foundChildren[i]);
            var siteId = child.attr('site_id');
            var siteName = child.attr('site_name');
            if (sitesToUpdate.indexOf(siteId) == -1)
            {
                sitesCount++;
                sitesToUpdate.push(siteId);
                siteNames[siteId] = siteName;
            }
            if (sitesToUpgrade.indexOf(siteId) == -1) sitesToUpgrade.push(siteId);
        }
    }

    //Find plugins to upgrade
    foundChildren = jQuery('#wp_plugin_upgrades').find('div[updated="0"]');
    if (foundChildren.length != 0)
    {
        for (var i = 0; i < foundChildren.length; i++)
        {
            var child = jQuery(foundChildren[i]);
            var parent = child.parent();

            var siteElement;
            var pluginElement;

            var checkAttr = child.attr('site_id');
            if ((typeof checkAttr !== 'undefined') && (checkAttr !== false))
            {
                siteElement = child;
                pluginElement = parent;
            }
            else
            {
                siteElement = parent;
                pluginElement = child;
            }

            var siteId = siteElement.attr('site_id');
            var siteName = siteElement.attr('site_name');
            var pluginSlug = pluginElement.attr('plugin_slug');
            //var pluginName = pluginElement.attr('plugin_name');

            if (sitesToUpdate.indexOf(siteId) == -1)
            {
                sitesCount++;
                sitesToUpdate.push(siteId);
                siteNames[siteId] = siteName;
            }

            if (sitesPluginSlugs[siteId] == undefined)
            {
                sitesPluginSlugs[siteId] = pluginSlug;
            }
            else
            {
                sitesPluginSlugs[siteId] += ',' + pluginSlug;
            }
        }
    }

    //Find themes to upgrade
    foundChildren = jQuery('#wp_theme_upgrades').find('div[updated="0"]');
    if (foundChildren.length != 0)
    {
        for (var i = 0; i < foundChildren.length; i++)
        {
            var child = jQuery(foundChildren[i]);
            var parent = child.parent();

            var siteElement;
            var themeElement;

            var checkAttr = child.attr('site_id');
            if ((typeof checkAttr !== 'undefined') && (checkAttr !== false))
            {
                siteElement = child;
                themeElement = parent;
            }
            else
            {
                siteElement = parent;
                themeElement = child;
            }

            var siteId = siteElement.attr('site_id');
            var siteName = siteElement.attr('site_name');
            var themeSlug = themeElement.attr('theme_slug');
            //var themeName = themeElement.attr('theme_name');
            if (sitesToUpdate.indexOf(siteId) == -1)
            {
                sitesCount++;
                sitesToUpdate.push(siteId);
                siteNames[siteId] = siteName;
            }

            if (sitesThemeSlugs[siteId] == undefined)
            {
                sitesThemeSlugs[siteId] = themeSlug;
            }
            else
            {
                sitesThemeSlugs[siteId] += ',' + themeSlug;
            }
        }
    }

    //Build form
    for (var j = 0; j < sitesToUpdate.length; j++)
    {
        var siteId = sitesToUpdate[j];

        var whatToUpgrade = '';

        if (sitesToUpgrade.indexOf(siteId) != -1) whatToUpgrade = '<span class="wordpress">wp</span>';

        if (sitesPluginSlugs[siteId] != undefined)
        {
            var updateCount = sitesPluginSlugs[siteId].match(/\,/g);
            if (updateCount == null) updateCount = 1;
            else updateCount = updateCount.length + 1;

            if (whatToUpgrade != '') whatToUpgrade += ', ';

            whatToUpgrade += '<span class="plugin">' + updateCount + ' plugin' + (updateCount > 1 ? 's' : '') + '</span>';
        }

        if (sitesThemeSlugs[siteId] != undefined)
        {
            var updateCount = sitesThemeSlugs[siteId].match(/\,/g);
            if (updateCount == null) updateCount = 1;
            else updateCount = updateCount.length + 1;

            if (whatToUpgrade != '') whatToUpgrade += ', ';

            whatToUpgrade += '<span class="theme">' + updateCount + ' theme' + (updateCount > 1 ? 's' : '') + '</span>';
        }

        upgradeList.append('<tr><td>' + decodeURIComponent(siteNames[siteId]) + ' (' + whatToUpgrade + ')</td><td style="width: 80px"><span class="rightnow-upgrade-status-wp" siteid="' + siteId + '">'+__('PENDING')+'</span></td></tr>');
    }

    //Step 2: show form
    var upgradeStatusBox = jQuery('#rightnow-upgrade-status-box');
    upgradeStatusBox.attr('title', 'Upgrading all');
    jQuery('#rightnow-upgrade-status-total').html(sitesCount);
    jQuery('#rightnow-upgrade-status-progress').progressbar({value:0, max:sitesCount});
    upgradeStatusBox.dialog({
        resizable:false,
        height:320,
        width:500,
        modal:true,
        close:function (event, ui)
        {
            bulkTaskRunning = false;
            jQuery('#rightnow-upgrade-status-box').dialog('destroy');
            location.reload();
        }});

    //Step 3: start upgrades
    rightnow_upgrade_all_int(sitesToUpdate, sitesToUpgrade, sitesPluginSlugs, sitesThemeSlugs);

    return false;
}

rightnow_upgrade_all_int = function (pSitesToUpdate, pSitesToUpgrade, pSitesPluginSlugs, pSitesThemeSlugs)
{
    websitesToUpdate = pSitesToUpdate;

    websitesToUpgrade = pSitesToUpgrade;

    websitesPluginSlugsToUpgrade = pSitesPluginSlugs;
    currentPluginSlugToUpgrade = undefined;

    websitesThemeSlugsToUpgrade = pSitesThemeSlugs;
    currentThemeSlugToUpgrade = undefined;

    currentWebsite = 0;
    websitesDone = 0;
    websitesTotal = websitesLeft = websitesToUpdate.length;

    bulkTaskRunning = true;
    rightnow_upgrade_all_loop_next();
};

rightnow_upgrade_all_loop_next = function ()
{
    while (bulkTaskRunning && (currentThreads < maxThreads) && (websitesLeft > 0))
    {
        rightnow_upgrade_all_upgrade_next();
    }
};
rightnow_upgrade_all_update_site_status = function (siteId, newStatus)
{
    jQuery('.rightnow-upgrade-status-wp[siteid="' + siteId + '"]').html(newStatus);
};
rightnow_upgrade_all_update_site_bold = function (siteId, sub)
{
    jQuery('.rightnow-upgrade-status-wp[siteid="' + siteId + '"]').parent().parent().find('.'+sub).css('font-weight', 'bold');
};
rightnow_upgrade_all_upgrade_next = function ()
{
    currentThreads++;
    websitesLeft--;

    var websiteId = websitesToUpdate[currentWebsite++];
    rightnow_upgrade_all_update_site_status(websiteId, 'UPGRADING');

    var themeSlugToUpgrade = websitesThemeSlugsToUpgrade[websiteId];
    var pluginSlugToUpgrade = websitesPluginSlugsToUpgrade[websiteId];
    var wordpressUpgrade = (websitesToUpgrade.indexOf(websiteId) != -1);

    rightnow_upgrade_int(websiteId, themeSlugToUpgrade, pluginSlugToUpgrade, wordpressUpgrade);
};

rightnow_upgrade_int = function (websiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade)
{
    if (pThemeSlugToUpgrade != undefined)
    {
        var themeSlugParts = pThemeSlugToUpgrade.split(',');
        for (var i = 0; i < themeSlugParts.length; i++)
        {
            var websiteHolder = jQuery('div[theme_slug="' + themeSlugParts[i] + '"] div[site_id="' + websiteId + '"]');
            if (!websiteHolder.exists())
            {
                websiteHolder = jQuery('div[site_id="' + websiteId + '"] div[theme_slug="' + themeSlugParts[i] + '"]');
            }

            websiteHolder.find('.pluginsAction').hide();
            websiteHolder.find('.pluginsInfo').html(__('Upgrading..'));
        }
    }

    if (pPluginSlugToUpgrade != undefined)
    {
        var pluginSlugParts = pPluginSlugToUpgrade.split(',');
        for (var i = 0; i < pluginSlugParts.length; i++)
        {
            var websiteHolder = jQuery('div[plugin_slug="' + pluginSlugParts[i] + '"] div[site_id="' + websiteId + '"]');
            if (!websiteHolder.exists())
            {
                websiteHolder = jQuery('div[site_id="' + websiteId + '"] div[plugin_slug="' + pluginSlugParts[i] + '"]');
            }

            websiteHolder.find('.pluginsAction').hide();
            websiteHolder.find('.pluginsInfo').html(__('Upgrading..'));
        }
    }

    rightnow_upgrade_int_flow(websiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, (pThemeSlugToUpgrade == undefined), (pPluginSlugToUpgrade == undefined), !pWordpressUpgrade, undefined);

    return false;
};
rightnow_upgrade_all_update_done = function ()
{
    currentThreads--;
    if (!bulkTaskRunning) return;
    websitesDone++;

    jQuery('#rightnow-upgrade-status-progress').progressbar('value', websitesDone);
    jQuery('#rightnow-upgrade-status-current').html(websitesDone);

    if (websitesDone == websitesTotal)
    {
        setTimeout(function ()
        {
            bulkTaskRunning = false;
            jQuery('#rightnow-upgrade-status-box').dialog('destroy');
            location.reload();
        }, 3000);
        return;
    }

    rightnow_upgrade_all_loop_next();
};

rightnow_upgrade_int_flow = function (pWebsiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, pThemeDone, pPluginDone, pUpgradeDone, pErrorMessage)
{
    if (!pThemeDone)
    {
        var data = mainwp_secure_data({
            action:'mainwp_upgradeplugintheme',
            websiteId:pWebsiteId,
            type:'theme',
            slug:pThemeSlugToUpgrade
        });

        jQuery.post(ajaxurl, data, function (pWebsiteId, pSlug, pPluginSlugToUpgrade, pWordpressUpgrade, pPluginDone, pUpgradeDone, pErrorMessage)
        {
            return function (response)
            {
                var slugParts = pSlug.split(',');
                for (var i = 0; i < slugParts.length; i++)
                {
                    var result;
                    var websiteHolder = jQuery('div[theme_slug="' + pSlug + '"] div[site_id="' + pWebsiteId + '"]');
                    if (!websiteHolder.exists())
                    {
                        websiteHolder = jQuery('div[site_id="' + pWebsiteId + '"] div[theme_slug="' + pSlug + '"]');
                    }
                    if (response.error)
                    {
                        result = getErrorMessage(response.error);
                        pErrorMessage = result;
                    }
                    else
                    {
                        var res = response.result;

                        if (res[pSlug])
                        {
                            result = __('Upgrade successful');
                            websiteHolder.attr('updated', 1);
                        }
                        else
                        {
                            result = __('Upgrade failed');
                            pErrorMessage = result;
                        }

                    }

                    websiteHolder.find('.pluginsInfo').html(result);
                }
                rightnow_upgrade_all_update_site_bold(pWebsiteId, 'theme');
                rightnow_upgrade_int_flow(pWebsiteId, pSlug, pPluginSlugToUpgrade, pWordpressUpgrade, true, pPluginDone, pUpgradeDone, pErrorMessage);
            }
        }(pWebsiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, pPluginDone, pUpgradeDone, pErrorMessage), 'json');
    }
    else if (!pPluginDone)
    {
        var data = mainwp_secure_data({
            action:'mainwp_upgradeplugintheme',
            websiteId:pWebsiteId,
            type:'plugin',
            slug:pPluginSlugToUpgrade
        });

        jQuery.post(ajaxurl, data, function (pWebsiteId, pThemeSlugToUpgrade, pSlug, pWordpressUpgrade, pThemeDone, pUpgradeDone, pErrorMessage)
        {
            return function (response)
            {
                var slugParts = pSlug.split(',');
                for (var i = 0; i < slugParts.length; i++)
                {
                    var result;
                    var websiteHolder = jQuery('div[theme_slug="' + pSlug + '"] div[site_id="' + pWebsiteId + '"]');
                    if (!websiteHolder.exists())
                    {
                        websiteHolder = jQuery('div[site_id="' + pWebsiteId + '"] div[theme_slug="' + pSlug + '"]');
                    }
                    if (response.error)
                    {
                        result = getErrorMessage(response.error);
                        pErrorMessage = result;
                    }
                    else
                    {
                        var res = response.result;

                        if (res[pSlug])
                        {
                            result = __('Upgrade successful');
                            websiteHolder.attr('updated', 1);
                        }
                        else
                        {
                            result = __('Upgrade failed');
                            pErrorMessage = result;
                        }

                    }

                    websiteHolder.find('.pluginsInfo').html(result);
                }
                rightnow_upgrade_all_update_site_bold(pWebsiteId, 'plugin');
                rightnow_upgrade_int_flow(pWebsiteId, pThemeSlugToUpgrade, pSlug, pWordpressUpgrade, pThemeDone, true, pUpgradeDone, pErrorMessage);
            }
        }(pWebsiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, pThemeDone, pUpgradeDone, pErrorMessage), 'json');
    }
    else if (!pUpgradeDone)
    {
        var websiteHolder = jQuery('div.mainwp_wordpress_upgrade[site_id="' + pWebsiteId + '"]');

        websiteHolder.find('.wordpressAction').hide();
        websiteHolder.find('.wordpressInfo').html('Upgrading..');

        var data = mainwp_secure_data({
            action:'mainwp_upgradewp',
            id:pWebsiteId
        });
        jQuery.post(ajaxurl, data, function (WebsiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, pThemeDone, pPluginDone, pErrorMessage)
        {
            return function (response)
            {
                var result;
                var websiteHolder = jQuery('div.mainwp_wordpress_upgrade[site_id="' + pWebsiteId + '"]');

                if (response.error)
                {
                    result = getErrorMessage(response.error);
                    pErrorMessage = result;
                }
                else
                {
                    result = response.result;
                    websiteHolder.attr('updated', 1);
                }

                websiteHolder.find('.wordpressInfo').html(result);
                rightnow_upgrade_all_update_site_bold(pWebsiteId, 'wordpress');
                rightnow_upgrade_int_flow(pWebsiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, pThemeDone, pPluginDone, true, pErrorMessage);
            }
        }(pWebsiteId, pThemeSlugToUpgrade, pPluginSlugToUpgrade, pWordpressUpgrade, pThemeDone, pPluginDone, pErrorMessage), 'json');
    }
    else
    {
        rightnow_upgrade_all_update_site_status(pWebsiteId, __('DONE'));
        rightnow_upgrade_all_update_done();
        return false;
    }
};
//</editor-fold>
var rightnowShowBusyFunction;
var rightnowShowBusyTimeout;
var rightnowShowBusy;
mainwp_rightnow_checkBackups = function(sitesToUpdate, siteNames)
{
    if (mainwpParams['backup_before_upgrade'] != true)
    {
        if (rightnowContinueAfterBackup != undefined) rightnowContinueAfterBackup();
        return false;
    }

    rightnowShowBusy = true;
    rightnowShowBusyFunction = function()
    {
        var backupContent = jQuery('#rightnow-backup-content');
        var output = __('Checking if a backup is required for the selected upgrades...');
        backupContent.html(output);

        jQuery('#rightnow-backup-all').hide();
        jQuery('#rightnow-backup-ignore').hide();

        var backupBox = jQuery('#rightnow-backup-box');
        backupBox.attr('title', __('Checking backup settings'));
        jQuery('div[aria-describedby="rightnow-backup-box"]').find('.ui-dialog-title').html(__('Checking backup settings'));
        if (rightnowShowBusy)
        {
            backupBox.dialog({
                resizable:false,
                height:320,
                width:500,
                modal:true,
                close:function (event, ui)
                {
                    jQuery('#rightnow-backup-box').dialog('destroy');
                }});
        }
    };

    rightnowShowBusyTimeout = setTimeout(rightnowShowBusyFunction, 300);

    //Step 2: Check if backups are ok.
    var data = mainwp_secure_data({
        action:'mainwp_checkbackups',
        sites:sitesToUpdate
    });

    jQuery.ajax({
      type: "POST",
      url: ajaxurl,
      data: data,
      success: function(pSiteNames) { return function (response)
      {
          rightnowShowBusy = false;
          clearTimeout(rightnowShowBusyTimeout);
          var backupBox = jQuery('#rightnow-backup-box');
          try
          {
              backupBox.dialog('destroy');
          }
          catch (e) {}

          jQuery('#rightnow-backup-all').show();
          jQuery('#rightnow-backup-ignore').show();

          backupBox.attr('title', __('Full backup required'));
          jQuery('div[aria-describedby="rightnow-backup-box"]').find('.ui-dialog-title').html(__('Full backup required'));


          var siteFeedback = undefined;

          if (response.error != undefined)
          {
          }
          else if (response['result'] == true)
          {
              //Continue..
          }
          else if (response['result']['sites'] != undefined)
          {
              siteFeedback = [];
              for (var currSiteId in response['result']['sites'])
              {
                  if (response['result']['sites'][currSiteId] == false)
                  {
                      siteFeedback.push(currSiteId);
                  }
              }
              if (siteFeedback.length == 0) siteFeedback = undefined;
          }

          if (siteFeedback != undefined)
          {
              var backupContent = jQuery('#rightnow-backup-content');
              var output = '<font color="red">'+__('A full backup has not been taken in the last 7 days for the following sites:')+'</font><br /><br />';
              for (var j = 0; j < siteFeedback.length; j++)
              {
                  output += '<span class="rightnow-backup-site" siteid="' + siteFeedback[j] + '">' + decodeURIComponent(pSiteNames[siteFeedback[j]]) + '</span><br />';
              }
              backupContent.html(output);

              //backupBox = jQuery('#rightnow-backup-box');
              backupBox.dialog({
                  resizable:false,
                  height:320,
                  width:500,
                  modal:true,
                  close:function (event, ui)
                  {
                      jQuery('#rightnow-backup-box').dialog('destroy');
                      rightnowContinueAfterBackup = undefined;
                  }});

              return false;
          }

          if (rightnowContinueAfterBackup != undefined) rightnowContinueAfterBackup();
      } }(siteNames),
      error: function()
      {
          backupBox = jQuery('#rightnow-backup-box');
          backupBox.dialog('destroy');

          //if (rightnowContinueAfterBackup != undefined) rightnowContinueAfterBackup();
      },
      dataType: 'json'
    });

    return false;
};
jQuery(document).on('click', '#rightnow-backupnow-close', function() {
    if (jQuery(this).prop('cancel') == '1')
    {
        jQuery('#rightnow-backupnow-box').dialog('destroy');
        rightnowBackupSites = [];
        rightnowBackupError = false;
        rightnowBackupDownloadRunning = false;
        location.reload();
    }
    else
    {
        jQuery('#rightnow-backupnow-box').dialog('destroy');
        if (rightnowContinueAfterBackup != undefined) rightnowContinueAfterBackup();
    }
});
jQuery(document).on('click', '#rightnow-backup-all', function() {
    jQuery('#rightnow-backup-box').dialog('destroy');

    var backupNowBox = jQuery('#rightnow-backupnow-box');
    backupNowBox.dialog({
        resizable:false,
        height:320,
        width:500,
        modal:true,
        close:function (event, ui)
        {
            jQuery('#rightnow-backupnow-box').dialog('destroy');
            rightnowContinueAfterBackup = undefined;
        }});

    var sitesToBackup = jQuery('.rightnow-backup-site');
    rightnowBackupSites = [];
    for (var i = 0; i < sitesToBackup.length; i++)
    {
        var currentSite = [];
        currentSite['id'] = jQuery(sitesToBackup[i]).attr('siteid');
        currentSite['name'] = jQuery(sitesToBackup[i]).text();
        rightnowBackupSites.push(currentSite);
    }
    rightnow_backup_run();
});

var rightnowBackupSites;
var rightnowBackupError;
var rightnowBackupDownloadRunning;

rightnow_backup_run = function()
{
    jQuery('#rightnow-backupnow-content').html(dateToHMS(new Date()) + ' ' + __('Starting required backup(s).'));
    jQuery('#rightnow-backupnow-close').prop('value', __('Cancel'));
    jQuery('#rightnow-backupnow-close').prop('cancel', '1');
    rightnow_backup_run_next();
};

rightnow_backup_run_next = function()
{
    if (rightnowBackupSites.length == 0)
    {
        appendToDiv('#rightnow-backupnow-content', __('Required backup(s) complete') + (rightnowBackupError ? ' <font color="red">'+__('with errors')+'</font>' : '') + '.');

        jQuery('#rightnow-backupnow-close').prop('cancel', '0');
        if (rightnowBackupError)
        {
            //Error...
            jQuery('#rightnow-backupnow-close').prop('value', __('Continue upgrade anyway'));
        }
        else
        {
            jQuery('#rightnow-backupnow-close').prop('value', __('Continue upgrade'));
        }
//        setTimeout(function() {
//                    jQuery('#managebackups-task-status-box').dialog('destroy');
//                    location.reload();
//                }, 3000);
        return;
    }

    var siteName = rightnowBackupSites[0]['name'];
    appendToDiv('#rightnow-backupnow-content', '[' + siteName + '] '+__('Creating backupfile.'));

    var siteId = rightnowBackupSites[0]['id'];
    rightnowBackupSites.shift();
    var data = mainwp_secure_data({
        action: 'mainwp_backup_run_site',
        site_id: siteId
    });

    jQuery.post(ajaxurl, data, function(pSiteId, pSiteName) { return function (response) {
        if (response.error)
        {
            appendToDiv('#rightnow-backupnow-content', '[' + pSiteName + '] <font color="red">Error: ' + getErrorMessage(response.error) + '</font>');
            rightnowBackupError = true;
            rightnow_backup_run_next();
        }
        else
        {
            appendToDiv('#rightnow-backupnow-content', '[' + pSiteName + '] '+__('Backupfile created successfully.'));

            rightnow_backupnow_download_file(pSiteId, pSiteName, response.result.type, response.result.url, response.result.local, response.result.regexfile, response.result.size, response.result.subfolder);
        }

    } }(siteId, siteName), 'json');
};

rightnow_backupnow_download_file = function(pSiteId, pSiteName, type, url, file, regexfile, size, subfolder)
{
    appendToDiv('#rightnow-backupnow-content', '[' + pSiteName + '] Downloading the file. <div id="rightnow-backupnow-status-progress" siteId="'+pSiteId+'" style="height: 10px !important;"></div>');
    jQuery('#rightnow-backupnow-status-progress[siteId="'+pSiteId+'"]').progressbar({value: 0, max: size});
    var interVal = setInterval(function() {
        var data = mainwp_secure_data({
            action:'mainwp_backup_getfilesize',
            local: file
        });
        jQuery.post(ajaxurl, data, function(pSiteId) { return function (response) {
            if (response.error) return;

            if (rightnowBackupDownloadRunning)
            {
                var progressBar = jQuery('#rightnow-backupnow-status-progress[siteId="'+pSiteId+'"]');
                if (progressBar.progressbar('option', 'value') < progressBar.progressbar('option', 'max'))
                {
                    progressBar.progressbar('value', response.result);
                }
            }
        } }(pSiteId), 'json');
    }, 500);

    var data = mainwp_secure_data({
        action:'mainwp_backup_download_file',
        site_id: pSiteId,
        type: type,
        url: url,
        local: file
    });
    rightnowBackupDownloadRunning = true;
    jQuery.post(ajaxurl, data, function(pFile, pRegexFile, pSubfolder, pSize, pType, pInterVal, pSiteName, pSiteId) { return function (response) {
        rightnowBackupDownloadRunning = false;
        clearInterval(pInterVal);
        jQuery('#rightnow-backupnow-status-progress[siteId="'+pSiteId+'"]').progressbar();
        jQuery('#rightnow-backupnow-status-progress[siteId="'+pSiteId+'"]').progressbar('value', pSize);
        appendToDiv('#rightnow-backupnow-content', '[' + pSiteName + '] '+__('Download from site child completed.'));
        appendToDiv('#rightnow-backupnow-content', '[' + pSiteName + '] '+__('Backup complete.'));
        rightnow_backup_run_next();
    } }(file, regexfile, subfolder, size, type, interVal, pSiteName, pSiteId), 'json');
};

jQuery(document).on('click', '#mainwp-right-now-message-dismiss', function()
{
    jQuery('#mainwp-right-now-message').hide();

    var data = mainwp_secure_data({
        action:'mainwp_syncerrors_dismiss'
    });
    jQuery.post(ajaxurl, data, function(resp) {});

    return false;
});