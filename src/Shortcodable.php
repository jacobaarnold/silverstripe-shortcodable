<?php

namespace Violet88\Shortcodable;

use ReflectionMethod;
use SilverStripe\Core\ClassInfo;
use SilverStripe\View\ViewableData;
use SilverStripe\View\Parsers\ShortcodeParser;
use SilverStripe\Core\Config\Config;

/**
 * The Shortcodable class is responsible for registering shortcodable classes, parsing shortcodes and managing configuration.
 *
 * @package shortcodable
 * @property array $shortcodable_classes
 * @method array get_shortcodable_classes()
 * @method void register_classes(array $classes)
 * @method void register_class(string $class)
 * @author PixNyb <contact@roelc.me>
 **/
class Shortcodable extends ViewableData
{
    private static $shortcodable_classes = [];

    public static function register_classes($classes)
    {
        if (is_array($classes) && count($classes))
            foreach ($classes as $class)
                self::register_class($class);
    }

    public static function register_class($class)
    {
        if (class_exists($class)) {
            if (!singleton($class)->hasMethod('parse_shortcode'))
                user_error("Failed to register \"$class\" with shortcodable. $class must have the method parse_shortcode(). See /shortcodable/README.md", E_USER_ERROR);

            if (!(new ReflectionMethod($class, 'parse_shortcode'))->isStatic())
                user_error("Failed to register \"$class\" with shortcodable. parse_shortcode() must be a static method. See /shortcodable/README.md", E_USER_ERROR);

            ShortcodeParser::get('default')->register($class, array($class, 'parse_shortcode'));
        }
    }

    public static function get_shortcodable_classes()
    {
        return Config::inst()->get(Shortcodable::class, 'shortcodable_classes');
    }

    public static function get_shortcodable_classnames()
    {
        return array_map(function ($class) {
            return ClassInfo::shortName($class);
        }, self::get_shortcodable_classes());
    }

    public static function get_shortcodable_tags()
    {
        return array_map(function ($class) {
            return $class::config()->get('shortcode');
        }, self::get_shortcodable_classes());
    }

    public static function get_class_by_classname($classname)
    {
        $classes = self::get_shortcodable_classes();
        if (!is_array($classes) || !count($classes))
            return null;

        if (!is_string($classname))
            return null;

        foreach ($classes as $class) {
            if (ClassInfo::shortName($class) == $classname || $class == $classname) {
                return $class;
            }
        }
        return null;
    }
}
