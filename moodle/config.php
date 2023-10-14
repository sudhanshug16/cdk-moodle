<?php  // Moodle configuration file

unset($CFG);
global $CFG;
$CFG = new stdClass();

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
$CFG->dataroot  = '/mnt/moodledata';
$CFG->admin     = 'admin';

$CFG->directorypermissions = 02775;

require_once(__DIR__ . '/lib/setup.php');

// There is no php closing tag in this file,
// it is intentional because it prevents trailing whitespace problems!
