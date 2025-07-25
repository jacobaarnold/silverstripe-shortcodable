(function () {
    if (typeof tinymce !== 'undefined') {

        tinymce.PluginManager.add('shortcodable', function (editor) {
            const shortcodePlaceholderTemplate = '<sc-marker>%shortcode%</sc-marker>';

            function insertShortcodeAtCursor(tag, shortcode) {
                let shortcodePlaceholder = shortcodePlaceholderTemplate
                    .replace('%shortcode%', shortcode + editor.selection.getContent() + '[/' + tag + ']');

                let node = editor.selection.getNode();
                if (node.nodeName === 'SC-MARKER') {
                    // Editing existing <sc-marker shortcode="[tag param=&quot;&quot;]">
                    // Find text between shortcode tags
                    const firstEnd = node.textContent.indexOf(']');
                    const lastBegin = node.textContent.lastIndexOf('[');
                    const taggedText = node.textContent.substring(firstEnd + 1, lastBegin);
                    editor.dom.replace(editor.dom.create('sc-marker', {
                        'shortcode': shortcode
                    }, shortcode + taggedText + '[/' + tag + ']'), node);
                } else {
                    // Adding new marker
                    editor.insertContent(shortcodePlaceholder);
                }
            }

            function insertPlaceholders(content) {
                return content.replace(/(\[[A-z0-9_]+( [A-z0-9_]+="[^"]+")*\](.*?)\[\/[A-z0-9_]+\])/g, function (match, shortcode) {
                    return shortcodePlaceholderTemplate
                        .replace('%shortcode%', shortcode);
                });
            }

            function stripPlaceholders(content) {
                return content.replace(/<sc-marker>([^<]+)<\/sc-marker>/g, function (match, shortcode) {
                    if (shortcode.match(/\[[A-z0-9_]+( [A-z0-9_]+="[^"]+")*\](.*?)\[\/[A-z0-9_]+\]/))
                        return shortcode;
                    else
                        return '';
                });
            }

            editor.ui.registry.addButton('shortcodable', {
                icon: 'code-sample',
                tooltip: 'Insert Shortcode',
                onAction: function () {
                    jQuery('#' + editor.id).entwine('ss').openShortcodeDialog(null);
                }
            });

            editor.on('LoadContent', function () {
                // Get the HTML content from the editor
                var content = editor.getContent();
                editor.setContent(insertPlaceholders(content));
            });

            editor.on('Click', function (e) {
                var node = e.target;
                if (node.nodeName === 'SC-MARKER') {
                    jQuery('#' + editor.id).entwine('ss').openShortcodeDialog(jQuery(node).text())
                    editor.selection.select(node);
                }
            });

            // When the editor has changed (backspace or delete), check if the shortcode is being removed
            editor.on('keyup', function (e) {
                if (e.keyCode === 8 || e.keyCode === 46) {
                    var node = editor.selection.getNode();
                    if (node.nodeName === 'SC-MARKER') {
                        if (node.textContent.match(/\[[A-z0-9_]+( [A-z0-9_]+="[^"]+")*\](.*?)\[\/[A-z0-9_]+\]/)) {
                            // All parts still here, so create updated marker
                            const firstEnd = node.textContent.indexOf(']');
                            shortcode = node.textContent.substring(0, firstEnd + 1);
                            editor.dom.replace(editor.dom.create('sc-marker', {
                                'shortcode': shortcode
                            }, node.textContent), node);
                        } else {
                            // Remove marker but retain text inside tags
                            const firstEnd = node.textContent.indexOf(']');
                            const lastBegin = node.textContent.lastIndexOf('[');
                            const taggedText = node.textContent.substring(firstEnd + 1, lastBegin);
                            editor.dom.replace(editor.dom.doc.createTextNode(taggedText), node);
//                             editor.dom.remove(node);
                        }
                    }
                }
            });

            return {
                getMetadata: function () {
                    return {
                        longname: 'Shortcodable - Shortcode UI plugin for SilverStripe',
                        author: 'Roël Couwenberg',
                        authorurl: 'https://violet88.nl',
                        infourl: 'https://github.com/Violet88github/silverstripe-shortcodable/',
                        version: "1.0"
                    };
                },

                insertShortcodeAtCursor: insertShortcodeAtCursor,
                stripPlaceholders: stripPlaceholders,
                insertPlaceholders: insertPlaceholders,
            }
        });
    }
})();
