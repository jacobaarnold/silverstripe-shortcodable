(function($) {
    $.get('/_shortcodable/popup', function(data) {
        const json = $.parseJSON(data);
        const template = $('<div id="Form_ShortcodeForm"><h3 class="dialog-title"></h3><div class="dialog-content"></div></div>');

        $('body').append(template);

        buttons = {};
        buttons[json.phrases['cancel']] = function() {
            $(this).dialog('close');
        };
        buttons[json.phrases['insert']] = function() {
            $(this).dialog('option', 'onInsert').call(this);
        };

        template.dialog({
            autoOpen: false,
            dialogClass: 'no-close',
            minWidth: 400,
            minHeight: 500,
            resizable: false,
            draggable: true,

            close: function() {
                $(this).dialog('close');
                $(this).find('.dialog-content').empty();
            },

            open: function() {
                $(this).find('.dialog-title').text(
                    $(this).data('shortcode') ?
                    json.phrases['edit_shortcode'] :
                    json.phrases['new_shortcode']
                );

                template.find('#shortcode-source').remove();
                template.find('#shortcode-fields').remove();

                var classElement = $('<div class="field" id="shortcode-class"></div>');
                var select = $('<select name="tag" class="select"><option value="" disabled selected>' + json.phrases['select_shortcode'] + '</option></select>');
                for (var key in json.shortcodes) {
                    let shortcode = json.shortcodes[key];
                    select.append('<option value="' + shortcode.tag + '">' + shortcode.title + '</option>');
                }

                select.on('change', function() {
                    let selectedShortcode = {
                        'tag': select.val()
                    }

                    template.data('selectedShortcode', selectedShortcode)
                    template.dialog('option', 'onShortcodeTagSelect').call(this);
                });

                classElement.append('<label>' + json.phrases['shortcode_type'] + '</label>').append(select);
                $(this).find('.dialog-content').append(classElement);

                if ($(this).data('shortcode'))
                    $(this).dialog('option', 'handleEdit').call(this);
            },

            onShortcodeTagSelect: function() {
                template.find('#shortcode-source').remove();
                template.find('#shortcode-fields').remove();

                var select = template.find('select');
                var shortcodeTag = select.val();
                var shortcode = json.shortcodes[shortcodeTag];

                // TODO: Optionally this can be done with an additional get request and then cached
                // to improve performance with large datasets.
                var source = shortcode.source;
                if (source.length == 0) {
                    // Not a DataObject so no ID
                    let selectedShortcode = template.data('selectedShortcode')
                    selectedShortcode['id'] = 0;
                    template.data('selectedShortcode', selectedShortcode)
                    template.dialog('option', 'onShortcodeSourceSelect').call(this);
                } else {
                    // Add dropdown to select source
                    var sourceElement = $('<div class="field" id="shortcode-source"></div>');
                    var select = $('<select name="id" class="select"><option value="" disabled selected>' + json.phrases['select_source'] + '</option></select>');
                    for (var key in source) {
                        select.append('<option value="' + key + '">' + source[key] + '</option>');
                    }

                    select.on('change', function() {
                        let selectedShortcode = template.data('selectedShortcode')
                        selectedShortcode['id'] = select.val();
                        template.data('selectedShortcode', selectedShortcode)
                        template.dialog('option', 'onShortcodeSourceSelect').call(this);
                    });

                    sourceElement.append('<label>' + json.phrases['shortcode_source'] + '</label>').append(select);
                    template.find('.dialog-content').append(sourceElement);
                }
            },

            onShortcodeSourceSelect: function() {
                template.find('#shortcode-fields').remove();

                var selectedShortcode = template.data('selectedShortcode');
                var shortcode = json.shortcodes[selectedShortcode.tag];
                var fields = shortcode.fields;
                var fieldsElement = $('<div id="shortcode-fields"></div>');

                for (var key in fields) {
                    let type = (typeof fields[key] === 'object') ? fields[key].type : 'text';
                    let label = (typeof fields[key] === 'object' && fields[key].label) ? fields[key].label : key;
                    let placeholder = (typeof fields[key] === 'object' && fields[key].placeholder) ? fields[key].placeholder : '';
                    let input = null;
                    let inputWrapper = $('<div class="field"></div>');

                    switch (type) {
                        case 'textarea':
                            input = $('<textarea name="' + key + '" placeholder="' + placeholder + '"></textarea>');
                            break;

                        case 'select':
                            input = $('<select name="' + key + '" class="select"><option value="" disabled selected>' + ((placeholder == '') ? capitalizeLabel(label) : placeholder) + '</option></select>');
                            for (var option in fields[key].options || {})
                                input.append('<option value="' + option + '">' + fields[key].options[option] + '</option>');
                            break;

                        case 'radiogroup':
                            input = $('<div class="radiogroup" name="' + key + '"></div>');
                            for (var option in fields[key].options || {})
                                input.append('<span class="radio"><input type="radio" name="' + key + '" value="' + option + '"><label>' + capitalizeLabel(fields[key].options[option]) + '</label></span>');
                            break;

                        case 'checkbox':
                            input = $('<span class="checkbox"><input type="checkbox" name="' + key + '" value="1"><label>' + ((placeholder == '') ? capitalizeLabel(label) : placeholder) + '</label></span>');
                            break;

                        default:
                            input = $('<input type="' + type + '" name="' + key + '" placeholder="' + placeholder + '">');
                            break;
                    }

                    input.on('change', function(e) {
                        let selectedShortcode = template.data('selectedShortcode')
                        let target = $(e.target);
                        if (target.val() === '' || (target.attr('type') === 'checkbox' && !target.is(':checked')))
                            delete selectedShortcode[target.attr('name')];
                        else
                            selectedShortcode[target.attr('name')] = target.val();
                        template.data('selectedShortcode', selectedShortcode)
                    });
                    fieldsElement.append(inputWrapper.append('<label>' + capitalizeLabel(label) + '</label>').append(input));
                }

                template.find('.dialog-content').append(fieldsElement);
            },

            onInsert: function() {
                const shortcodable = tinymce.activeEditor.plugins.shortcodable;
                const selectedShortcode = template.data('selectedShortcode');

                if (shortcodable) {
                    $.get('/_shortcodable/shortcode', template.data('selectedShortcode'), function(data) {
                        shortcodable.insertShortcodeAtCursor(selectedShortcode.tag, data.shortcode);
                    });
                }
                $(this).dialog('close');
            },

            handleEdit: function() {
                // This is everything within the placeholder, so it could be [tag]text[/tag]
                let shortcode = $(this).data('shortcode');
                const firstEnd = shortcode.indexOf(']');
                shortcode = shortcode.substring(1, firstEnd);
                var properties = shortcode.split(' ');
                var shortcodeTag = properties.shift();
                var shortcodeProperties = {};

                const regex = /([a-zA-Z0-9-_]+)="([^"]+)\"/g;
                while (match = regex.exec(shortcode)) {
                    shortcodeProperties[match[1]] = match[2];
                }

//                 console.log(shortcodeTag, shortcodeProperties);

                var select = template.find('select[name="tag"]');
                select.val(shortcodeTag);
                select.trigger('change');

                for (var key in shortcodeProperties) {
                    var input = template.find('[name="' + key + '"]');
                    // If the input is a radio group, we need to check the correct radio button. The input will contain multiple dom elements.
                    if (input.length) {
                        if (input.length > 1) {
                            input.each(function() {
                                if($(this).val() == shortcodeProperties[key] && $(this).attr('type') === 'radio') {
                                    $(this).prop('checked', true);
                                }
                            });
                        } else if (input.attr('type') === 'checkbox') {
                            input.each(function() {
                                if($(this).val() == shortcodeProperties[key]) {
                                    $(this).prop('checked', true);
                                }
                            });
                        } else {
                            input.val(shortcodeProperties[key]);
                        }
                        input.trigger('change');
                    }
                }
            },


            buttons: buttons
        });
    });

    $.entwine('ss', function($) {
        // open shortcode dialog
        $('textarea.htmleditor').entwine({
            openShortcodeDialog: function(shortcode) {
                var dialog = $('#Form_ShortcodeForm');
                if (dialog.length) {
                    dialog.data('shortcode', shortcode);
                    dialog.dialog('open');
                } else {
                    var interval = setInterval(function() {
                        dialog = $('#Form_ShortcodeForm');
                        if (dialog.length) {
                            dialog.data('shortcode', shortcode);
                            dialog.dialog('open');
                            clearInterval(interval);
                        }
                    }, 100);
                }
            },

            /**
             * Make sure the editor has flushed all its buffers before the form is submitted.
             */
            'from .cms-edit-form': {
                onbeforesubmitform: function(e) {
                    // Save the updated content here, rather than _after_ replacing the placeholders
                    // otherwise you're replacing the shortcode html with the shortcode, then writing
                    // the html back to the textarea value, overriding what the shortcode conversion
                    // process has done
                    this._super(e);

                    var shortcodable = tinymce.activeEditor.plugins.shortcodable;
                    if (shortcodable) {
                        var ed = this.getEditor();
                        var newContent = shortcodable.stripPlaceholders($(this).val(), ed);
                        $(this).val(newContent);
                    }

                    e.preventDefault();
                }
            },
        });
    });

    function capitalizeLabel(val) {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }
})(jQuery);
