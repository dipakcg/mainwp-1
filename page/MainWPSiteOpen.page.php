<?php
class MainWPSiteOpen
{
    public static function getClassName()
    {
        return __CLASS__;
    }

    public static function render()
    {
        if (!isset($_GET['websiteid'])) exit();

        $id = $_GET['websiteid'];
        $website = MainWPDB::Instance()->getWebsiteById($id);

        if (!MainWPUtility::can_edit_website($website)) exit();

        $location = "";
        if (isset($_GET['location'])) $location = base64_decode($_GET['location']);

        MainWPSiteOpen::openSite($website, $location, (isset($_GET['newWindow']) ? $_GET['newWindow'] : null));
    }

    public static function openSite($website, $location, $pNewWindow = null)
    {
        ?>
    <div class="wrap"><a href="http://mainwp.com" id="mainwplogo" title="MainWP" target="_blank"><img src="<?php echo plugins_url('images/logo.png', dirname(__FILE__)); ?>" height="50" alt="MainWP" /></a>
        <img src="<?php echo plugins_url('images/icons/mainwp-sites.png', dirname(__FILE__)); ?>" style="float: left; margin-right: 8px; margin-top: 7px ;" alt="MainWP Sites" height="32"/>
        <h2><?php echo $website->name; ?></h2><div style="clear: both;"></div><br/>

        <div id="mainwp_background-box">
            <?php
            if ($pNewWindow == 'yes')
            {
            ?>
                <?php _e('Will redirect to your website immediately.','mainwp'); ?>
                <form method="POST" action="<?php echo MainWPUtility::getGetDataAuthed($website, ($location == null || $location == '') ? 'index.php' : $location); ?>" id="redirectForm">
                </form>
            <?php
            }
            else
            {
            ?>
            <div style="padding-top: 10px; padding-bottom: 10px">
                <a href="<?php echo admin_url('admin.php?page=managesites'); ?>" class="mainwp-backlink">← <?php _e('Back to Sites','mainwp'); ?></a>&nbsp;&nbsp;&nbsp;
                <input type="button" class="button cont" id="mainwp_notes_show" value="<?php _e('Notes','mainwp'); ?>"/>
            </div>
            <iframe width="100%" height="1000"
                    src="<?php echo MainWPUtility::getGetDataAuthed($website, ($location == null || $location == '') ? 'index.php' : $location); ?>"></iframe>
            <div id="mainwp_notes_overlay" class="mainwp_overlay"></div>
            <div id="mainwp_notes" class="mainwp_popup">
                <a id="mainwp_notes_closeX" class="mainwp_closeX" style="display: inline; "></a>

                <div id="mainwp_notes_title" class="mainwp_popup_title"><?php echo $website->url; ?></span>
                </div>
                <div id="mainwp_notes_content">
                    <textarea style="width: 580px !important; height: 300px;"
                              id="mainwp_notes_note"><?php echo $website->note; ?></textarea>
                </div>
                <form>
                    <div style="float: right" id="mainwp_notes_status"></div>
                    <input type="button" class="button cont" id="mainwp_notes_save" value="Save Note"/>
                    <input type="button" class="button cont" id="mainwp_notes_cancel" value="Close"/>
                    <input type="hidden" id="mainwp_notes_websiteid"
                           value="<?php echo $website->id; ?>"/>
                </form>
            </div>
            <?php } ?>
        </div>
    </div>
    <?php
    }

    public static function renderRestore()
    {
        if (!isset($_GET['websiteid'])) exit();

        $id = $_GET['websiteid'];
        $website = MainWPDB::Instance()->getWebsiteById($id);

        if (!MainWPUtility::can_edit_website($website)) exit();

        $file = "";
        if (isset($_GET['file'])) $file = base64_decode($_GET['file']);

        MainWPSiteOpen::openSiteRestore($website, $file);
    }

    public static function openSiteRestore($website, $file)
    {
        ?>
    <div class="wrap"><a href="http://mainwp.com" id="mainwplogo" title="MainWP" target="_blank"><img src="<?php echo plugins_url('images/logo.png', dirname(__FILE__)); ?>" height="50" alt="MainWP" /></a>
        <img src="<?php echo plugins_url('images/icons/mainwp-sites.png', dirname(__FILE__)); ?>" style="float: left; margin-right: 8px; margin-top: 7px ;" alt="MainWP Sites" height="32"/>
        <h2><?php echo $website->name; ?></h2><div style="clear: both;"></div><br/>

        <div id="mainwp_background-box">
                <?php
                _e('Will redirect to your website immediately.','mainwp');
                $url = (isset($website->siteurl) && $website->siteurl != '' ? $website->siteurl : $website->url);
                $url .= (substr($url, -1) != '/' ? '/' : '');

                $upload_dir = wp_upload_dir();
                $upload_base_dir = $upload_dir['basedir'];
                $upload_base_url = $upload_dir['baseurl'];

                $size = filesize($upload_base_dir . urldecode($file));
                $file = $upload_base_url . $file;
                $postdata = MainWPUtility::getGetDataAuthed($website, $file, 'file', true);
                $postdata['size'] = $size;
                ?>
                <form method="POST" action="<?php echo $url; ?>" id="redirectForm">
                    <?php
                    foreach ($postdata as $name => $value)
                    {
                        echo '<input type="hidden" name="'.$name.'" value="'.$value.'" />';
                    }
                    ?>
                </form>
        </div>
    </div>
    <?php
    }
}