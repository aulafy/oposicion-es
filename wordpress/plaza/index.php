<?php
defined('ABSPATH') || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header>
    <a href="<?php echo esc_url(get_template_directory_uri() . '/app/'); ?>">Abrir Plaza</a>
</header>
<main>
<?php while (have_posts()) : the_post(); ?>
    <article>
        <h1><?php the_title(); ?></h1>
        <?php the_content(); ?>
    </article>
<?php endwhile; ?>
</main>
<?php wp_footer(); ?>
</body>
</html>
