<?php
defined('ABSPATH') || exit;

// Abrir la aplicación en una página propia permite instalarla desde el navegador.
wp_safe_redirect(get_template_directory_uri() . '/app/', 302, 'Plaza');
exit;
