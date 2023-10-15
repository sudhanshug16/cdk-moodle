<?php  // Moodle configuration file

unset($CFG);
global $CFG;
$CFG = new stdClass();

@error_reporting(E_ALL | E_STRICT);  
@ini_set('display_errors', '1');
$CFG->debug = (E_ALL | E_STRICT);  
$CFG->debugdisplay = 1;

$CFG->dbtype    = $_ENV['MOODLE_DATABASE_TYPE'];
$CFG->dblibrary = 'native';
$CFG->dbhost    = $_ENV['MOODLE_DATABASE_HOST'];
$CFG->dbname    = $_ENV['MOODLE_DATABASE_NAME'];
$CFG->dbuser    = $_ENV['MOODLE_DATABASE_USER'];
$CFG->dbpass    = $_ENV['MOODLE_DATABASE_PASSWORD'];
$CFG->prefix    = 'mdl_';
$CFG->dboptions = array (
  'dbpersist' => 0,
  'dbport' => $_ENV['MOODLE_DATABASE_PORT_NUMBER'],
  'dbsocket' => '',
  'dbcollation' => 'utf8mb4_0900_ai_ci',
);

if (empty($_SERVER['HTTP_HOST'])) {
  $_SERVER['HTTP_HOST'] = '127.0.0.1:8080';
}
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') {
  $CFG->wwwroot   = 'https://' . $_SERVER['HTTP_HOST'];
} else {
  $CFG->wwwroot   = 'http://' . $_SERVER['HTTP_HOST'];
}
$CFG->sslproxy = true;

$CFG->dataroot  = '/moodle-efs/moodledata';

$CFG->admin     = 'admin';

$CFG->directorypermissions = 02775;

$CFG->session_handler_class = '\core\session\redis';
$CFG->session_redis_host = $_ENV['MOODLE_REDIS_HOST'];
$CFG->session_redis_port = $_ENV['MOODLE_REDIS_PORT'];  // Optional.
$CFG->session_redis_database = 0;  // Optional, default is db 0.
$CFG->session_redis_auth = ''; // Optional, default is don't set one.
$CFG->session_redis_prefix = 'moodle_session_'; // Optional, default is don't set one.
$CFG->session_redis_acquire_lock_timeout = 120;
$CFG->session_redis_acquire_lock_retry = 100; // Optional, default is 100ms (from 3.9)
$CFG->session_redis_lock_expire = 7200;
$CFG->session_redis_serializer_use_igbinary = false; // Optional, default is PHP builtin serializer.

require_once(__DIR__ . '/lib/setup.php');

// There is no php closing tag in this file,
// it is intentional because it prevents trailing whitespace problems!
