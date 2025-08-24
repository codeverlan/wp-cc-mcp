<?php
/**
 * WordPress Configuration for SiteGround Deployment
 * 
 * This configuration file automatically detects the environment:
 * - Local Development: Uses wp-config-local.php if present
 * - SiteGround Production: Uses environment variables
 * 
 * @package WordPress
 */

// Environment detection
$is_local = file_exists(__DIR__ . '/wp-config-local.php');
$is_siteground = isset($_SERVER['SITEGROUND_ENVIRONMENT']) || 
                 (isset($_SERVER['SERVER_ADMIN']) && strpos($_SERVER['SERVER_ADMIN'], 'siteground') !== false) ||
                 file_exists('/home/' . get_current_user() . '/.siteground');

if ($is_local) {
    // Local development environment
    require_once __DIR__ . '/wp-config-local.php';
} else {
    // Production environment (SiteGround or other hosting)
    
    /** The name of the database for WordPress */
    define('DB_NAME', getenv('DB_NAME') ?: 'database_name_here');

    /** MySQL database username */
    define('DB_USER', getenv('DB_USER') ?: 'username_here');

    /** MySQL database password */
    define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'password_here');

    /** MySQL hostname */
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');

    /** Database Charset to use in creating database tables. */
    define('DB_CHARSET', 'utf8mb4');

    /** The Database Collate type. Don't change this if in doubt. */
    define('DB_COLLATE', '');

    /**
     * Authentication Unique Keys and Salts.
     * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
     */
    define('AUTH_KEY',         getenv('AUTH_KEY') ?: 'put your unique phrase here');
    define('SECURE_AUTH_KEY',  getenv('SECURE_AUTH_KEY') ?: 'put your unique phrase here');
    define('LOGGED_IN_KEY',    getenv('LOGGED_IN_KEY') ?: 'put your unique phrase here');
    define('NONCE_KEY',        getenv('NONCE_KEY') ?: 'put your unique phrase here');
    define('AUTH_SALT',        getenv('AUTH_SALT') ?: 'put your unique phrase here');
    define('SECURE_AUTH_SALT', getenv('SECURE_AUTH_SALT') ?: 'put your unique phrase here');
    define('LOGGED_IN_SALT',   getenv('LOGGED_IN_SALT') ?: 'put your unique phrase here');
    define('NONCE_SALT',       getenv('NONCE_SALT') ?: 'put your unique phrase here');

    /**
     * WordPress Database Table prefix.
     */
    $table_prefix = getenv('TABLE_PREFIX') ?: 'wp_';

    /**
     * For developers: WordPress debugging mode.
     */
    define('WP_DEBUG', false);
    define('WP_DEBUG_LOG', false);
    define('WP_DEBUG_DISPLAY', false);
}

/**
 * SiteGround-specific optimizations
 */
if ($is_siteground) {
    // SiteGround Optimizer compatibility
    if (!defined('SG_OPTIMIZER_ENABLED')) {
        define('SG_OPTIMIZER_ENABLED', true);
    }
    
    // Enable SiteGround cache
    if (!defined('WP_CACHE')) {
        define('WP_CACHE', true);
    }
    
    // SiteGround Security settings
    if (!defined('DISALLOW_FILE_EDIT')) {
        define('DISALLOW_FILE_EDIT', true);
    }
    
    // Force SSL for admin
    if (!defined('FORCE_SSL_ADMIN')) {
        define('FORCE_SSL_ADMIN', true);
    }
}

/**
 * WordPress Multisite
 * Uncomment below to enable multisite
 */
// define('WP_ALLOW_MULTISITE', true);

/**
 * Set WordPress memory limits
 */
define('WP_MEMORY_LIMIT', '256M');
define('WP_MAX_MEMORY_LIMIT', '512M');

/**
 * Disable automatic updates for production
 */
if (!$is_local) {
    define('AUTOMATIC_UPDATER_DISABLED', true);
    define('WP_AUTO_UPDATE_CORE', false);
}

/**
 * Custom Content Directory (optional)
 * Useful for keeping content separate from core files
 */
// define('WP_CONTENT_DIR', dirname(__FILE__) . '/content');
// define('WP_CONTENT_URL', 'https://' . $_SERVER['HTTP_HOST'] . '/content');

/**
 * Increase autosave interval (in seconds)
 */
define('AUTOSAVE_INTERVAL', 120);

/**
 * Limit post revisions
 */
define('WP_POST_REVISIONS', 5);

/**
 * Empty trash automatically after 7 days
 */
define('EMPTY_TRASH_DAYS', 7);

/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if (!defined('ABSPATH')) {
    define('ABSPATH', dirname(__FILE__) . '/');
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';