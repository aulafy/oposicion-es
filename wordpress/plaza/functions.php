<?php
defined('ABSPATH') || exit;

add_action('after_setup_theme', static function () {
    add_theme_support('title-tag');
});
