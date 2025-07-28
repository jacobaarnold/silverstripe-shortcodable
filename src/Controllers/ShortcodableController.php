<?php

namespace Violet88\Shortcodable\Controllers;

use BadMethodCallException;
use InvalidArgumentException;
use Psr\Container\NotFoundExceptionInterface;
use ReflectionException;
use SilverStripe\Admin\LeftAndMain;
use SilverStripe\Control\HTTPRequest;
use SilverStripe\Core\ClassInfo;
use SilverStripe\ORM\DataObject;
use Violet88\Shortcodable\Shortcodable;

/**
 * The ShortcodableController class is responsible for handling the shortcodable popup and shortcode generation.
 *
 * @package shortcodable
 * @subpackage controllers
 * @property array $allowed_actions
 * @property string $url_segment
 * @property string $required_permission_codes
 * @method string popup()
 * @method string shortcode()
 * @method string build_shortcode(string $class, int $id, array $attributes)
 * @author PixNyb <contact@roelc.me>
 **/
class ShortcodableController extends LeftAndMain
{
    private static $url_segment = '_shortcodable';

    private static $required_permission_codes = 'CMS_ACCESS_LeftAndMain';

    private static $allowed_actions = array(
        'popup' => 'CMS_ACCESS_LeftAndMain',
        'shortcode' => 'CMS_ACCESS_LeftAndMain',
    );

    /**
     * Get the json data for the shortcodable popup
     *
     * @return string|false JSON data
     * @throws BadMethodCallException If the method is called on a non-DataObject class
     * @throws InvalidArgumentException If the class does not exist
     * @throws NotFoundExceptionInterface If the class does not exist
     * @throws ReflectionException If the class does not exist
     */
    public function popup()
    {
        $classes = Shortcodable::get_shortcodable_classes();

        $fields = array(
            'phrases' => [
                'edit_shortcode' => _t('Shortcodable.EDIT_SHORTCODE', 'Edit Shortcode'),
                'new_shortcode' => _t('Shortcodable.NEW_SHORTCODE', 'New Shortcode'),
                'shortcode_type' => _t('Shortcodable.SHORTCODE_TYPE', 'Shortcode Type'),
                'shortcode_source' => _t('Shortcodable.SHORTCODE_SOURCE', 'Shortcode Source'),
                'select_shortcode' => _t('Shortcodable.SELECT_SHORTCODE', 'Select a shortcode type'),
                'select_source' => _t('Shortcodable.SELECT_SOURCE', 'Select an entity'),
                'select' => _t('Shortcodable.SELECT', 'Select'),
                'cancel' => _t('Shortcodable.CANCEL', 'Cancel'),
                'insert' => _t('Shortcodable.INSERT', 'Insert'),
                'update' => _t('Shortcodable.UPDATE', 'Update'),
            ],
            'shortcodes' => []
        );

        foreach ($classes as $class) {
            $classname = ClassInfo::shortName($class);
            $properties = [];
            $properties = $class::config()->get('shortcode_fields') ?: [];

            foreach ($properties as $property => $options) {
                // If the property is numeric and the options is a string, convert it to an array with default options. Which in this case is a text field.
                if (is_numeric($property) && !is_array($options)) {
                    $properties[$options] = [
                        'title' => $options,
                        'type' => 'text',
                    ];
                    unset($properties[$property]);
                }

                // If the options is a string, call the method on the class to get the options.
                if (isset($options['options']) && !is_array($options['options'])) {
                    $method = $options['options'];
                    $object = $class::singleton();
                    $properties[$property]['options'] = $object->$method();
                }
            }

            $source = [];
            if (is_subclass_of(singleton($class), DataObject::class)) {
                $source = singleton($class)->hasMethod('getShortcodableRecords') ?
                    singleton($class)->getShortcodableRecords() :
                    $class::get()->map()->toArray();
            }

            $tag = $class::config()->get('shortcode');

            $fields['shortcodes'][$tag] = array(
//                 'class' => $classname,
                'tag' => $tag,
                'title' => singleton($class)->singular_name(),
                'source' => $source,
                'fields' => $properties,
            );
        }

        $this->extend('updateShortcodeForm', $form);

        return json_encode($fields);
    }

    /**
     * Generate a shortcode based on the request params
     *
     * @param HTTPRequest $request The request on which the shortcode is based
     * @return string The JSON response
     */
    public function shortcode()
    {
        $tag = $this->request->getVar('tag');
        $validTags = Shortcodable::get_shortcodable_tags();

//         $classname = $this->request->getVar('class');
//         $class = Shortcodable::get_class_by_classname($classname);
//         $validClasses = Shortcodable::get_shortcodable_classes();
        $id = $this->request->getVar('id');

        // Optional improvement: instead of fetching the entire object, just check if the class exists and has the ID
//         if (
//             $id &&
//             is_subclass_of($class, DataObject::class) &&
//             in_array($class, $validClasses) &&
//             $object = $class::get()->byID($id)
//         ) {
        if (in_array($tag, $validTags)) {
            $this->response->addHeader('Content-Type', 'application/json');

            $vars = $this->request->getVars();
            $filteredVars = array_diff_key($vars, array_flip(['tag', 'id']));

            return json_encode([
                'shortcode' => self::build_shortcode($tag, $id, $filteredVars)
            ]);
        } else {
            $this->httpError(404);
        }
    }

    /**
     * Build a shortcode from a tag, id and attributes
     *
     * @param string $tag The tag name
     * @param int $id The object id
     * @param array $attributes The shortcode attributes
     * @return string The shortcode
     */
    private static function build_shortcode($tag, $id, $attributes)
    {
        $shortcode = '[' . $tag;
        if ($id)
            $shortcode .= ',id="' . $id . '"';

        if ($attributes)
            foreach ($attributes as $key => $value) {
                $shortcode .= ',' . $key . '="' . $value . '"';
            }

        $shortcode .= ']';

        return $shortcode;
    }
}
